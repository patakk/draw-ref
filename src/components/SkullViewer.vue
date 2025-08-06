<template>
  <canvas ref="canvas"></canvas>
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
    directionalMaster: { type: Number, default: 3.0 }
  },
  data() {
    return {
      isInitialized: false,
      currentBaseCameraDistance: this.baseCameraDistance
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
    this.animationId = null
    this.composer = null
    this.thresholdPass = null
    this.renderPass = null
    this.fxaaPass = null
    this.smaaPass = null
    this.bloomPass = null
    this.ditherPass = null
    this.postProcessingEnabled = true
    // Shaders will be loaded dynamically
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
        const [threshVertResponse, threshFragResponse, ditherVertResponse, ditherFragResponse] = await Promise.all([
          fetch('/src/shaders/threshold.vert'),
          fetch('/src/shaders/threshold.frag'),
          fetch('/src/shaders/dither.vert'),
          fetch('/src/shaders/dither.frag')
        ])
        
        this.thresholdShader.vertexShader = await threshVertResponse.text()
        this.thresholdShader.fragmentShader = await threshFragResponse.text()
        this.ditherShader.vertexShader = await ditherVertResponse.text()
        this.ditherShader.fragmentShader = await ditherFragResponse.text()
      } catch (error) {
        console.error('Failed to load shaders:', error)
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
      })

      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
      this.scene.add(this.ambientLight)

      this.directionalLight = new THREE.DirectionalLight(0xffffff, this.directionalMaster)
      this.directionalLight.position.set(5, 5, 5)
      this.directionalLight.castShadow = true
      this.directionalLight.shadow.mapSize.width = 4096
      this.directionalLight.shadow.mapSize.height = 4096
      this.directionalLight.shadow.camera.near = 0.5
      this.directionalLight.shadow.camera.far = 20
      this.directionalLight.shadow.radius = 15
      this.directionalLight.shadow.blurSamples = 30
      this.scene.add(this.directionalLight)

      this.directionalLight2 = new THREE.DirectionalLight(0xff8844, this.directionalMaster * 0.6)
      this.directionalLight2.position.set(-3, 2, -4)
      this.directionalLight2.castShadow = false
      this.scene.add(this.directionalLight2)

      this.setupPostProcessing()

      this.randomizeCamera();
    },

    loadSkull() {
      this.loadModel('skull.glb')
    },

    loadModel(modelPath) {
      // Remove existing skull and bounding box
      if (this.skull) {
        this.scene.remove(this.skull)
        this.skull = null
      }
      if (this.boundingBoxHelper) {
        this.scene.remove(this.boundingBoxHelper)
        this.boundingBoxHelper = null
      }

      const loader = new GLTFLoader()
      loader.load(`/${modelPath}`, (gltf) => {
        this.skull = gltf.scene
        this.skull.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            
            // Replace with physical bone material
            const boneMaterial = new THREE.MeshStandardMaterial({
              color: 0xf5f5dc,      // Bone color (beige)
              roughness: 0.8,       // Matte finish
              metalness: 0.0,       // Not metallic
              flatShading: false,   // Smooth shading
              side: THREE.FrontSide
            })
            
            child.material = boneMaterial
          }
        })
        
        // Create bounding box helper
        const box = new THREE.Box3().setFromObject(this.skull)
        this.boundingBoxHelper = new THREE.Box3Helper(box, 0xffffff)
        this.boundingBoxHelper.visible = false
        this.scene.add(this.boundingBoxHelper)
        
        this.scene.add(this.skull)
      })
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
      
      // Use SMAA for better antialiasing (higher quality than FXAA)
      this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight)
      this.composer.addPass(this.smaaPass)
      
      // Add bloom effect
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        .12,  // strength
        0.8,  // radius
        0.05  // threshold
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

    setPostProcessing(enabled) {
      this.postProcessingEnabled = enabled
      if (this.bloomPass) {
        this.bloomPass.enabled = enabled
      }
      if (this.ditherPass) {
        this.ditherPass.enabled = enabled
      }
    },

    updateBaseCameraDistance() {
      // Update base distance based on current zoom level
      if (this.camera) {
        const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
        const fovRadians = (this.camera.fov * Math.PI) / 180
        this.currentBaseCameraDistance = currentDistance * Math.tan(fovRadians / 2) / Math.tan((45 * Math.PI / 180) / 2)
      }
    }
  }
}
</script>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>