<template>
  <div class="viewer-container">
    <canvas ref="canvas"></canvas>
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export default {
  name: 'SkullViewer',
  props: {
    baseCameraDistance: { type: Number, default: 0.8 },
    ambientMaster: { type: Number, default: 1.6 },
    directionalMaster: { type: Number, default: 3.0 },
    lightColor: { type: String, default: '#ffffff' },
    light2Color: { type: String, default: '#ff8844' },
    ambientColor: { type: String, default: '#ffffff' },
    ambientBrightness: { type: Number, default: 0.15 }
  },
  data() {
    return {
      isInitialized: false,
      currentBaseCameraDistance: this.baseCameraDistance,
      isLoading: false,
      currentModelPath: null
    }
  },
  created() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.directionalLight = null
    this.directionalLight2 = null
    this.ambientLight = null
    this.skull = null
    this.boundingBoxHelper = null
    this.boundingGrid = null
    this.animationId = null
    this.composer = null
    this.thresholdPass = null
    this.renderPass = null
    this.fxaaPass = null
    this.smaaPass = null
    this.bloomPass = null
    this.ditherPass = null
    this.postProcessingEnabled = true
    
    // Preloaded models cache
    this.preloadedModels = new Map()
    this.preloadingPromises = new Map()
    // Shaders will be loaded dynamically from external files
    this.thresholdShader = {
      uniforms: {
        'tDiffuse': { value: null },
        'thresholds': { value: new Array(10).fill(2.0) },
        'thresholdCount': { value: 0 },
        'enabled': { value: false }
      },
      vertexShader: '',
      fragmentShader: ''
    }
    this.ditherShader = {
      uniforms: {
        'tDiffuse': { value: null },
        'time': { value: 0.0 }
      },
      vertexShader: '',
      fragmentShader: ''
    }
  },
  async mounted() {
    await this.loadShaders()
    this.init()
    this.loadSkull()
    this.startAnimation()
    window.addEventListener('resize', this.onWindowResize)
    
    // Start preloading the heavy skull model immediately
    this.preloadModel('skull.glb')
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  },
  methods: {
    async loadShaders() {
      try {
        // Import shaders as text using Vite's ?raw suffix
        const thresholdVert = (await import('../shaders/threshold.vert?raw')).default
        const thresholdFrag = (await import('../shaders/threshold.frag?raw')).default
        const ditherVert = (await import('../shaders/dither.vert?raw')).default  
        const ditherFrag = (await import('../shaders/dither.frag?raw')).default
        
        this.thresholdShader.vertexShader = thresholdVert
        this.thresholdShader.fragmentShader = thresholdFrag
        this.ditherShader.vertexShader = ditherVert
        this.ditherShader.fragmentShader = ditherFrag
        
      } catch (error) {
        console.error('Error loading shaders:', error)
        // No fallback - shaders are required to be in src/shaders/
        throw error
      }
    },


    init() {
      this.scene = new THREE.Scene()
      // Set initial background to match ambient light
      const initialAmbient = 0.15
      const initialBgValue = initialAmbient * this.ambientMaster
      this.scene.background = new THREE.Color(initialBgValue, initialBgValue, initialBgValue)

      this.camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.01,
        10000
      )
      this.camera.position.set(1*.6, 0.5*.6, 1*.6)

      

      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.$refs.canvas,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: "high-performance"
      })
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.VSMShadowMap
      this.renderer.toneMapping = THREE.NoToneMapping
      this.renderer.toneMappingExposure = 1.0
      this.renderer.outputColorSpace = THREE.SRGBColorSpace

      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = false
      this.controls.enablePan = false
      
      // Update base camera distance when user zooms manually
      this.controls.addEventListener('change', () => {
        this.updateBaseCameraDistance()
        // Animate dither when camera moves
        if (this.ditherPass) {
          this.ditherPass.uniforms.time.value += 0.1
        }
        // Emit current camera angles to update UI sliders
        this.emitCurrentCameraAngles()
      })

      this.ambientLight = new THREE.AmbientLight(parseInt(this.ambientColor.replace('#', ''), 16), this.ambientBrightness)
      this.scene.add(this.ambientLight)
      this.updateBackgroundColor()

      this.directionalLight = new THREE.DirectionalLight(parseInt(this.lightColor.replace('#', ''), 16), this.directionalMaster)
      this.directionalLight.position.set(5, 5, 5)
      this.directionalLight.castShadow = true
      this.directionalLight.shadow.mapSize.width = 4096
      this.directionalLight.shadow.mapSize.height = 4096
      this.directionalLight.shadow.camera.near = 0.5
      this.directionalLight.shadow.camera.far = 20
      this.directionalLight.shadow.radius = 15
      this.directionalLight.shadow.blurSamples = 30
      this.scene.add(this.directionalLight)

      this.directionalLight2 = new THREE.DirectionalLight(parseInt(this.light2Color.replace('#', ''), 16), this.directionalMaster * 0.6)
      this.directionalLight2.position.set(-3, 2, -4)
      this.directionalLight2.castShadow = false
      this.scene.add(this.directionalLight2)

      this.setupPostProcessing()

      this.randomizeCamera();
    },

    loadSkull() {
      this.loadModel('asaro_low.glb')
    },

    preloadModel(modelPath) {
      // Return existing promise if already preloading
      if (this.preloadingPromises.has(modelPath)) {
        return this.preloadingPromises.get(modelPath)
      }

      // Return resolved promise if already preloaded
      if (this.preloadedModels.has(modelPath)) {
        return Promise.resolve(this.preloadedModels.get(modelPath))
      }

      const loader = new GLTFLoader()
      const baseUrl = import.meta.env.BASE_URL || './'
      const modelUrl = `${baseUrl}${modelPath}`
      
      const preloadPromise = new Promise((resolve, reject) => {
        loader.load(
          modelUrl,
          (gltf) => {
            this.preloadedModels.set(modelPath, gltf)
            this.preloadingPromises.delete(modelPath)
            console.log(`Preloaded model: ${modelPath}`)
            resolve(gltf)
          },
          undefined,
          (error) => {
            this.preloadingPromises.delete(modelPath)
            console.error(`Error preloading model ${modelPath}:`, error)
            reject(error)
          }
        )
      })
      
      this.preloadingPromises.set(modelPath, preloadPromise)
      return preloadPromise
    },

    loadModel(modelPath) {
      // Track the currently requested model
      this.currentModelPath = modelPath
      
      // Show loading animation
      this.isLoading = true
      
      // Remove existing skull and bounding box
      if (this.skull) {
        this.scene.remove(this.skull)
        this.skull = null
      }
      if (this.boundingBoxHelper) {
        this.scene.remove(this.boundingBoxHelper)
        this.boundingBoxHelper = null
      }
      if (this.boundingGrid) {
        this.scene.remove(this.boundingGrid)
        this.boundingGrid = null
      }

      // Check if model is already preloaded
      if (this.preloadedModels.has(modelPath)) {
        const gltf = this.preloadedModels.get(modelPath)
        this.processLoadedModel(gltf.scene.clone(), modelPath)
        return
      }

      // Check if model is currently preloading
      if (this.preloadingPromises.has(modelPath)) {
        this.preloadingPromises.get(modelPath)
          .then((gltf) => {
            this.processLoadedModel(gltf.scene.clone(), modelPath)
          })
          .catch((error) => {
            console.error('Error loading preloaded model:', error)
            this.isLoading = false
          })
        return
      }

      // Load model normally (not preloaded)
      const loader = new GLTFLoader()
      const baseUrl = import.meta.env.BASE_URL || './'
      const modelUrl = `${baseUrl}${modelPath}`
      
      loader.load(modelUrl, (gltf) => {
        this.processLoadedModel(gltf.scene, modelPath)
      }, undefined, (error) => {
        console.error('Error loading model:', error)
        this.isLoading = false
      })
    },

    processLoadedModel(scene, modelPath) {
      // Only process if this is still the currently requested model
      if (this.currentModelPath !== modelPath) {
        // Model was changed while this one was loading, ignore it
        console.log(`Ignoring loaded model ${modelPath}, current model is ${this.currentModelPath}`)
        return
      }
      
      this.skull = scene
      this.skull.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          
          // Replace with physical bone material
          const boneMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,      // Bone color (beige)
            roughness: 0.8,       // Matte finish
            metalness: 0.0,       // Not metallic
            flatShading: false,   // Smooth shading
            side: THREE.FrontSide
          })
          
          child.material = boneMaterial
        }
      })
      
      // Create bounding box helper and spatial grid
      const box = new THREE.Box3().setFromObject(this.skull)
      this.boundingBoxHelper = new THREE.Box3Helper(box, 0xffffff)
      this.boundingBoxHelper.visible = false
      this.scene.add(this.boundingBoxHelper)
      
      // Create spatial grid subdivisions
      this.boundingGrid = this.createBoundingGrid(box)
      this.boundingGrid.visible = false
      this.scene.add(this.boundingGrid)
      
      // Restore visibility state from parent component
      this.$nextTick(() => {
        // Trigger parent component to reapply the current checkbox states
        this.$emit('model-loaded')
        // Hide loading animation
        this.isLoading = false
      })
      
      this.scene.add(this.skull)
    },

    randomizeCamera() {
      if (!this.camera) return
      
      const theta = Math.random() * 2 * Math.PI
      const phi = Math.random() * Math.PI
      
      // Use current camera distance from origin
      const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
      
      this.camera.position.setFromSphericalCoords(currentDistance, phi, theta)
      this.camera.lookAt(0, 0, 0)
      this.controls.update()
      
      // Emit camera angle change to update UI sliders
      const thetaDegrees = ((theta * 180) / Math.PI + 360) % 360
      const phiDegrees = (phi * 180) / Math.PI
      this.$emit('camera-angle-changed', {
        theta: thetaDegrees,
        phi: phiDegrees
      })
    },

    setCameraAngle(thetaDegrees, phiDegrees) {
      if (!this.camera) return
      
      // Convert degrees to radians
      const theta = (thetaDegrees * Math.PI) / 180
      const phi = (phiDegrees * Math.PI) / 180
      
      // Use current camera distance from origin
      const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
      
      this.camera.position.setFromSphericalCoords(currentDistance, phi, theta)
      this.camera.lookAt(0, 0, 0)
      this.controls.update()
    },

    randomizeLighting() {
      if (this.directionalLight) {
        const theta = Math.random() * 2 * Math.PI
        const phi = Math.random() * Math.PI
        const radius = 8
        this.directionalLight.position.setFromSphericalCoords(radius, phi, theta)
        
        // Position light2 on opposite side
        if (this.directionalLight2) {
          const theta2 = theta + Math.PI  // Opposite angle
          const phi2 = Math.PI - phi      // Opposite elevation
          const radius2 = 8
          this.directionalLight2.position.setFromSphericalCoords(radius2, phi2, theta2)
        }
      }
    },

    setLightAngle(thetaDegrees, phiDegrees) {
      if (this.directionalLight) {
        // Convert degrees to radians
        const theta = (thetaDegrees * Math.PI) / 180
        const phi = (phiDegrees * Math.PI) / 180
        const radius = 8
        this.directionalLight.position.setFromSphericalCoords(radius, phi, theta)
        
        // Position light2 on opposite side
        if (this.directionalLight2) {
          const theta2 = theta + Math.PI  // Opposite angle
          const phi2 = Math.PI - phi      // Opposite elevation
          const radius2 = 8
          this.directionalLight2.position.setFromSphericalCoords(radius2, phi2, theta2)
        }
      }
    },

    startAnimation() {
      this.animate()
    },

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate())
      
      if (this.controls) {
        this.controls.update()
      }
      
      if (this.scene && this.camera) {
        if (this.composer) {
          this.composer.render()
        } else {
          this.renderer.render(this.scene, this.camera)
        }
      }
    },

    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight)
      }
      if (this.fxaaPass) {
        this.fxaaPass.uniforms['resolution'].value.set(1/window.innerWidth, 1/window.innerHeight)
      }
      if (this.smaaPass) {
        this.smaaPass.setSize(window.innerWidth, window.innerHeight)
      }
      if (this.bloomPass) {
        this.bloomPass.setSize(window.innerWidth, window.innerHeight)
      }
    },

    setupPostProcessing() {
      if (!this.renderer || !this.scene || !this.camera) return
      
      this.composer = new EffectComposer(this.renderer)
      this.composer.renderToScreen = true
      
      // Enable mipmaps on render targets
      const renderTarget = this.composer.renderTarget1
      if (renderTarget) {
        renderTarget.texture.generateMipmaps = true
        renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter
        renderTarget.texture.magFilter = THREE.LinearFilter
      }
      
      this.renderPass = new RenderPass(this.scene, this.camera)
      this.composer.addPass(this.renderPass)
      
      // Add FXAA pass for antialiasing
      this.fxaaPass = new ShaderPass(FXAAShader)
      this.fxaaPass.uniforms['resolution'].value.set(1/window.innerWidth, 1/window.innerHeight)
      this.fxaaPass.enabled = this.postProcessingEnabled
      this.composer.addPass(this.fxaaPass)
      
      // Use SMAA for better antialiasing (higher quality than FXAA)
      this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight)
      this.smaaPass.enabled = this.postProcessingEnabled
      this.composer.addPass(this.smaaPass)
      
      // Add bloom effect
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        .3,  // strength
        0.8,  // radius
        0.005  // threshold
      )
      this.bloomPass.enabled = this.postProcessingEnabled
      this.composer.addPass(this.bloomPass)
      
      // Add dithering (controlled by post processing)
      if (this.ditherShader.vertexShader && this.ditherShader.fragmentShader) {
        this.ditherPass = new ShaderPass(this.ditherShader)
        this.ditherPass.enabled = this.postProcessingEnabled
        this.composer.addPass(this.ditherPass)
      }
      
      // Only add threshold pass if shaders are loaded
      if (this.thresholdShader.vertexShader && this.thresholdShader.fragmentShader) {
        this.thresholdPass = new ShaderPass(this.thresholdShader)
        this.composer.addPass(this.thresholdPass)
      }
    },


    setLightBrightness(brightness) {
      if (this.directionalLight) {
        this.directionalLight.intensity = parseFloat(brightness) * this.directionalMaster
      }
    },

    setLight2Brightness(brightness) {
      if (this.directionalLight2) {
        this.directionalLight2.intensity = parseFloat(brightness) * this.directionalMaster
      }
    },

    setLightColor(color) {
      if (this.directionalLight) {
        this.directionalLight.color.setHex(parseInt(color.replace('#', ''), 16))
      }
    },

    setLight2Color(color) {
      if (this.directionalLight2) {
        this.directionalLight2.color.setHex(parseInt(color.replace('#', ''), 16))
      }
      this.updateGridColor(color)
    },

    updateGridColor(lightColor) {
      if (this.boundingGrid) {
        const oppositeColor = this.getOppositeHueColor(lightColor)
        this.boundingGrid.children.forEach(line => {
          line.material.color.setHex(oppositeColor)
        })
      }
    },

    setAmbientBrightness(brightness) {
      if (this.ambientLight) {
        this.ambientLight.intensity = parseFloat(brightness)
        this.updateBackgroundColor()
      }
    },

    setAmbientColor(color) {
      if (this.ambientLight) {
        this.ambientLight.color.setHex(parseInt(color.replace('#', ''), 16))
        this.updateBackgroundColor()
      }
    },

    updateBackgroundColor() {
      if (this.ambientLight && this.scene) {
        // Use ambient light color and intensity for background
        const color = this.ambientLight.color.clone()
        color.multiplyScalar(this.ambientLight.intensity * this.ambientMaster)
        this.scene.background = color
      }
    },

    setCameraFOV(fov) {
      if (this.camera) {
        const fovValue = parseFloat(fov)
        const fovRadians = (fovValue * Math.PI) / 180
        const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
        const compensatedDistance = this.currentBaseCameraDistance / Math.tan(fovRadians / 2) * Math.tan((45 * Math.PI / 180) / 2)
        
        this.camera.fov = fovValue
        this.camera.updateProjectionMatrix()
        
        // Maintain current camera direction but adjust distance based on FOV
        const direction = new THREE.Vector3()
        this.camera.getWorldDirection(direction)
        direction.multiplyScalar(-compensatedDistance)
        this.camera.position.copy(direction)
        
        this.controls.update()
      }
    },

    setThreshold(enabled, points) {
      if (this.thresholdPass) {
        this.thresholdPass.uniforms.enabled.value = enabled
        const thresholds = points.map(p => parseFloat(p.value))
        // Fill unused threshold slots with values > 1.0 as per shader comment
        while (thresholds.length < 10) {
          thresholds.push(2.0)
        }
        this.thresholdPass.uniforms.thresholds.value = thresholds
        this.thresholdPass.uniforms.thresholdCount.value = points.length
      }
    },

    setBoundingBoxVisible(visible) {
      if (this.boundingBoxHelper) {
        this.boundingBoxHelper.visible = visible
      }
    },

    setBoundingGridVisible(visible) {
      if (this.boundingGrid) {
        this.boundingGrid.visible = visible
      }
    },

    setPostProcessing(enabled) {
      this.postProcessingEnabled = enabled
      if (this.fxaaPass) {
        this.fxaaPass.enabled = true
      }
      if (this.smaaPass) {
        this.smaaPass.enabled = true
      }
      if (this.bloomPass) {
        this.bloomPass.enabled = enabled
      }
      if (this.ditherPass) {
        this.ditherPass.enabled = enabled
      }
    },

    getOppositeHueColor(hexColor) {
      // Convert hex to RGB
      const r = parseInt(hexColor.substring(1, 3), 16) / 255
      const g = parseInt(hexColor.substring(3, 5), 16) / 255
      const b = parseInt(hexColor.substring(5, 7), 16) / 255
      
      // Convert RGB to HSL
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const diff = max - min
      
      let h = 0
      if (diff !== 0) {
        if (max === r) h = ((g - b) / diff) % 6
        else if (max === g) h = (b - r) / diff + 2
        else h = (r - g) / diff + 4
      }
      h = h * 60
      if (h < 0) h += 360
      
      // Get opposite hue (add 180 degrees)
      const oppositeH = (h + 180) % 360
      
      // Keep same saturation and lightness, just change hue
      let s = max === 0 ? 0 : diff / max
      let l = (max + min) / 2

      s = s * .85;
      
      l = Math.pow(l, .5) // Adjust lightness for better contrast
      // Convert HSL back to RGB
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs((oppositeH / 60) % 2 - 1))
      const m = l - c / 2
      
      let rNew, gNew, bNew
      if (oppositeH < 60) { rNew = c; gNew = x; bNew = 0 }
      else if (oppositeH < 120) { rNew = x; gNew = c; bNew = 0 }
      else if (oppositeH < 180) { rNew = 0; gNew = c; bNew = x }
      else if (oppositeH < 240) { rNew = 0; gNew = x; bNew = c }
      else if (oppositeH < 300) { rNew = x; gNew = 0; bNew = c }
      else { rNew = c; gNew = 0; bNew = x }
      
      rNew = Math.round((rNew + m) * 255)
      gNew = Math.round((gNew + m) * 255)
      bNew = Math.round((bNew + m) * 255)
      
      return (rNew << 16) | (gNew << 8) | bNew
    },

    createBoundingGrid(box) {
      const group = new THREE.Group()
      const oppositeColor = this.getOppositeHueColor(this.light2Color)
      
      // Material for internal lines (higher opacity)
      const internalMaterial = new THREE.LineBasicMaterial({ 
        color: oppositeColor, 
        transparent: true,
        opacity: 0.99,
      })
      
      // Material for edge lines (lower opacity)
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: oppositeColor, 
        transparent: true,
        opacity: 0.4,
      })
      
      const min = box.min
      const max = box.max
      const size = box.getSize(new THREE.Vector3())
      
      const divisions = 3 // Creates 4 sections (3 dividing lines plus edges)
      
      // X-direction lines (left to right) at different Y and Z positions
      for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
          const y = min.y + (size.y * i / divisions)
          const z = min.z + (size.z * j / divisions)
          
          const geometry = new THREE.BufferGeometry()
          const vertices = new Float32Array([
            min.x, y, z,
            max.x, y, z
          ])
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
          
          // Use edge material for edge lines, internal material for internal lines
          const material = (i === 0 || i === divisions || j === 0 || j === divisions) ? edgeMaterial : internalMaterial
          const line = new THREE.Line(geometry, material)
          group.add(line)
        }
      }
      
      // Y-direction lines (bottom to top) at different X and Z positions  
      for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
          const x = min.x + (size.x * i / divisions)
          const z = min.z + (size.z * j / divisions)
          
          const geometry = new THREE.BufferGeometry()
          const vertices = new Float32Array([
            x, min.y, z,
            x, max.y, z
          ])
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
          
          // Use edge material for edge lines, internal material for internal lines
          const material = (i === 0 || i === divisions || j === 0 || j === divisions) ? edgeMaterial : internalMaterial
          const line = new THREE.Line(geometry, material)
          group.add(line)
        }
      }
      
      // Z-direction lines (front to back) at different X and Y positions
      for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
          const x = min.x + (size.x * i / divisions)
          const y = min.y + (size.y * j / divisions)
          
          const geometry = new THREE.BufferGeometry()
          const vertices = new Float32Array([
            x, y, min.z,
            x, y, max.z
          ])
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
          
          // Use edge material for edge lines, internal material for internal lines
          const material = (i === 0 || i === divisions || j === 0 || j === divisions) ? edgeMaterial : internalMaterial
          const line = new THREE.Line(geometry, material)
          group.add(line)
        }
      }
      
      return group
    },

    updateBaseCameraDistance() {
      // Update base distance based on current zoom level
      if (this.camera) {
        const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
        const fovRadians = (this.camera.fov * Math.PI) / 180
        this.currentBaseCameraDistance = currentDistance * Math.tan(fovRadians / 2) / Math.tan((45 * Math.PI / 180) / 2)
      }
    },

    emitCurrentCameraAngles() {
      if (!this.camera) return
      
      const position = this.camera.position
      const distance = position.distanceTo(new THREE.Vector3(0, 0, 0))
      
      // Convert Cartesian to spherical coordinates
      const theta = Math.atan2(position.x, position.z)
      const phi = Math.acos(position.y / distance)
      
      // Convert to degrees and normalize
      const thetaDegrees = ((theta * 180) / Math.PI + 360) % 360
      const phiDegrees = (phi * 180) / Math.PI
      
      this.$emit('camera-angle-changed', {
        theta: thetaDegrees,
        phi: phiDegrees
      })
    }
  }
}
</script>

<style scoped>
.viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* Prevent double-tap zoom and enable precise touch control */
  touch-action: manipulation;
  /* Disable text selection */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>