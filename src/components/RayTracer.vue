<template>
  <div class="raytracer-container" v-if="visible">
    <div class="raytracer-header">
      <h3>Ray Tracer</h3>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    <div class="raytracer-controls">
      <div class="control-group">
        <label>Samples: {{ numSamples }}</label>
        <input type="range" min="1" max="1000" v-model="numSamples" class="control-slider" @input="updateParams">
      </div>
      <div class="control-group">
        <label>Bounces: {{ numBounces }}</label>
        <input type="range" min="1" max="50" v-model="numBounces" class="control-slider" @input="updateParams">
      </div>
      <div class="control-group">
        <label>Camera FOV: {{ cameraFov }}°</label>
        <input type="range" min="10" max="160" v-model="cameraFov" class="control-slider" @input="updateParams">
      </div>
      <div class="control-group">
        <label>Shading Method:</label>
        <select v-model="shadingMethod" @change="updateParams" class="control-select">
          <option value="0">Lambertian</option>
          <option value="1">Blinn-Phong</option>
          <option value="2">Metal</option>
          <option value="3">Dielectric</option>
        </select>
      </div>
      <div class="status-info" v-if="renderingStarted">
        <span>Pass: {{ renderingPass }}/{{ numSamples }}</span>
        <span>Elapsed: {{ elapsedTime }}</span>
        <span>ETA: {{ etaTime }}</span>
        <span>Avg: {{ avgTime }}</span>
      </div>
    </div>
    <div class="canvas-container">
      <canvas 
        ref="canvas" 
        width="800" 
        height="600" 
        @contextmenu.prevent
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
      >
        WebGL 2 not supported
      </canvas>
      <div v-if="loadingSpinner" class="spinner-overlay">
        <div class="spinner"></div>
        <span>{{ loadingMessage }}</span>
      </div>
      <div v-if="error" class="error-overlay">
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import Vector1x4 from '../raytracing/math/Vector1x4'
import CanvasShader from '../raytracing/scene/CanvasShader'
import ColorTextures from '../raytracing/scene/ColorTextures'
import RandomTexture from '../raytracing/scene/RandomTexture'
import SampleShader from '../raytracing/scene/SampleShader'
import ThreeJSScene from '../raytracing/scene/ThreeJSScene'
import { CanvasVars, defaultCanvasVars } from '../raytracing/types/CanvasVars'
import { extractGeometryFromThreeJS } from '../raytracing/utils/GeometryExtractor'

// Props
const props = defineProps<{
  visible: boolean
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// Inject Three.js scene from parent (ModelViewer)
const getThreeJSScene = inject<() => any>('getThreeJSScene', () => null)

// Reactive state
const canvas = ref<HTMLCanvasElement>()
const numSamples = ref(100)
const numBounces = ref(5)
const cameraFov = ref(50)
const shadingMethod = ref(0)
const renderingPass = ref(0)
const elapsedTime = ref('00:00:00')
const etaTime = ref('??:??:??')
const avgTime = ref('????')
const loadingSpinner = ref(false)
const loadingMessage = ref('Initializing...')
const error = ref('')
const renderingStarted = ref(false)

// Canvas variables
let cv: CanvasVars
let animationId: number

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180.0
}

function checkGPURequirements(GL: WebGL2RenderingContext): boolean {
  if (!GL.getExtension('EXT_color_buffer_float')) {
    console.log('EXT_color_buffer_float not supported')
    return false
  }

  const MAX_ARRAY_TEXTURE_LAYERS = GL.getParameter(GL.MAX_ARRAY_TEXTURE_LAYERS)
  const MAX_TEXTURE_IMAGE_UNITS = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
  const MAX_RENDERBUFFER_SIZE = GL.getParameter(GL.MAX_RENDERBUFFER_SIZE)
  const MAX_TEXTURE_SIZE = GL.getParameter(GL.MAX_TEXTURE_SIZE)

  console.log(`MAX_ARRAY_TEXTURE_LAYERS = ${MAX_ARRAY_TEXTURE_LAYERS}`)
  console.log(`MAX_TEXTURE_IMAGE_UNITS = ${MAX_TEXTURE_IMAGE_UNITS}`)
  console.log(`MAX_RENDERBUFFER_SIZE = ${MAX_RENDERBUFFER_SIZE}`)
  console.log(`MAX_TEXTURE_SIZE = ${MAX_TEXTURE_SIZE}`)

  return (
    MAX_ARRAY_TEXTURE_LAYERS >= 2048 &&
    MAX_TEXTURE_IMAGE_UNITS >= 16 &&
    MAX_RENDERBUFFER_SIZE >= 16384 &&
    MAX_TEXTURE_SIZE >= 16384
  )
}

function render() {
  if (cv.renderingPass < cv.numSamples) {
    if (cv.renderingPass === 0 || (!cv.lButtonDown && !cv.rButtonDown)) {
      ++cv.renderingPass

      if (cv.sampleShader && cv.canvasShader) {
        cv.sampleShader.draw(cv)
        cv.canvasShader.draw(cv)
      }

      const elapsed = Date.now() - cv.restartRenderTimestamp
      const average = elapsed / cv.renderingPass
      const eta = (cv.numSamples - cv.renderingPass) * average

      renderingPass.value = cv.renderingPass
      elapsedTime.value = new Date(elapsed).toISOString().slice(11, 19)
      etaTime.value = new Date(eta).toISOString().slice(11, 19)
      avgTime.value = `${average.toFixed(0)}ms`
    }
  }
  animationId = requestAnimationFrame(render)
}

function resetRendering() {
  if (!cv) return
  
  cv.renderingPass = 0
  cv.restartRenderTimestamp = Date.now()

  renderingPass.value = 0
  elapsedTime.value = '00:00:00'
  etaTime.value = '??:??:??'
  avgTime.value = '????'
}

function updateParams() {
  if (!cv) return
  
  cv.cameraFov = cameraFov.value
  cv.numSamples = numSamples.value
  cv.numBounces = numBounces.value
  cv.shadingMethod = shadingMethod.value
  
  resetRendering()
}

function onMouseMove(event: MouseEvent) {
  if (!cv.scene?.cameraNode || !cv.scene?.parentNode) return

  const x = event.clientX
  const y = event.clientY

  if ((cv.lButtonDownOnCanvas && cv.rButtonDownOnCanvas) || (cv.lButtonDownOnCanvas && event.shiftKey)) {
    // Dolly
    if (y !== cv.y && cv.scene.cameraNode) {
      cv.scene.cameraNode.translate(new Vector1x4(0, (cv.y - y) * cv.TXYZ_SCALAR, 0))
      resetRendering()
    }
  } else if ((cv.lButtonDownOnCanvas && event.ctrlKey) || cv.rButtonDownOnCanvas) {
    // Move
    if (x !== cv.x || y !== cv.y) {
      const dx = (cv.x - x) * cv.TXYZ_SCALAR
      const dz = (y - cv.y) * cv.TXYZ_SCALAR
      const dv = cv.scene.cameraNode.mapPos(new Vector1x4(dx, 0, dz, 0), cv.scene.parentNode)
      cv.scene.parentNode.translate(dv)
      resetRendering()
    }
  } else if (cv.lButtonDownOnCanvas) {
    // Rotate
    if (x !== cv.x || y !== cv.y) {
      cv.scene.parentNode.rotateZ(degreesToRadians(cv.x - x) * cv.RXYZ_SCALAR)
      cv.scene.cameraNode.rotateX(degreesToRadians(cv.y - y) * cv.RXYZ_SCALAR, cv.scene.parentNode)
      resetRendering()
    }
  }
  cv.x = x
  cv.y = y
}

function onMouseDown(event: MouseEvent) {
  if (!canvas.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  cv.x = event.clientX
  cv.y = event.clientY

  switch (event.button) {
    case 0:
      cv.lButtonDown = true
      cv.lButtonDownOnCanvas = cv.x > rect.left && cv.x < rect.right && cv.y > rect.top && cv.y < rect.bottom
      break
    case 2:
      cv.rButtonDown = true
      cv.rButtonDownOnCanvas = cv.x > rect.left && cv.x < rect.right && cv.y > rect.top && cv.y < rect.bottom
      break
  }
}

function onMouseUp(event: MouseEvent) {
  switch (event.button) {
    case 0:
      cv.lButtonDown = false
      cv.lButtonDownOnCanvas = false
      break
    case 2:
      cv.rButtonDown = false
      cv.rButtonDownOnCanvas = false
      break
  }
}

async function initRaytracer() {
  if (!canvas.value) return

  try {
    loadingSpinner.value = true
    loadingMessage.value = 'Initializing WebGL...'
    error.value = ''

    // Initialize canvas variables
    cv = { 
      ...defaultCanvasVars,
      canvasWd: 800,
      canvasHt: 600,
      cameraFov: cameraFov.value,
      numSamples: numSamples.value,
      numBounces: numBounces.value,
      shadingMethod: shadingMethod.value
    }

    // Get WebGL2 context
    cv.GL = canvas.value.getContext('webgl2', {
      depth: false,
      alpha: false,
    })

    if (!cv.GL) {
      throw new Error('WebGL 2 not supported')
    }

    if (!checkGPURequirements(cv.GL)) {
      throw new Error('GPU does not meet minimum requirements')
    }

    loadingMessage.value = 'Loading shaders...'
    
    // Initialize WebGL resources
    cv.colorTextures = new ColorTextures(cv.GL, cv.canvasWd, cv.canvasHt)
    cv.randomTexture = new RandomTexture(cv.GL, cv.canvasWd, cv.canvasHt)
    cv.sampleShader = new SampleShader(cv.GL)
    cv.canvasShader = new CanvasShader()

    // Load shaders
    await Promise.all([
      cv.sampleShader.init(cv.GL, '/sample-vs.glsl', '/sample-fs.glsl'),
      cv.canvasShader.init(cv.GL, '/canvas-vs.glsl', '/canvas-fs.glsl'),
    ])

    loadingMessage.value = 'Extracting geometry from Three.js scene...'
    
    // Get Three.js scene and extract geometry
    const threeScene = getThreeJSScene()
    if (!threeScene) {
      throw new Error('No Three.js scene available. Make sure a model is loaded.')
    }

    const geometryData = extractGeometryFromThreeJS(threeScene)
    
    if (geometryData.vertices.length === 0) {
      throw new Error('No geometry found in Three.js scene')
    }

    console.log(`Extracted ${geometryData.vertices.length / 3} vertices, ${geometryData.indices.length / 3} triangles`)

    loadingMessage.value = 'Creating raytracing scene...'
    
    // Create and initialize raytracing scene
    cv.scene = new ThreeJSScene(cv.GL)
    cv.scene.setGeometry(geometryData)
    await cv.scene.init()

    loadingSpinner.value = false
    renderingStarted.value = true
    resetRendering()
    
    // Start rendering
    animationId = requestAnimationFrame(render)

  } catch (err) {
    loadingSpinner.value = false
    error.value = err instanceof Error ? err.message : 'Failed to initialize raytracer'
    console.error('Raytracer initialization error:', err)
  }
}

// Watch for visibility changes
watch(() => props.visible, async (newVal) => {
  if (newVal && !cv) {
    await nextTick()
    initRaytracer()
  }
})

onMounted(async () => {
  if (props.visible) {
    await nextTick()
    initRaytracer()
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.raytracer-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
  z-index: 1000;
  min-width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
}

.raytracer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
}

.raytracer-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.raytracer-controls {
  padding: 15px 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #444;
}

.control-group {
  margin-bottom: 15px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  display: block;
  color: #fff;
  font-size: 14px;
  margin-bottom: 5px;
}

.control-slider {
  width: 100%;
  height: 20px;
  background: #333;
  outline: none;
  border-radius: 10px;
  -webkit-appearance: none;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #4CAF50;
  cursor: pointer;
  border-radius: 50%;
}

.control-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #4CAF50;
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

.status-info {
  display: flex;
  gap: 20px;
  color: #ccc;
  font-size: 12px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #444;
}

.canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  background: #000;
  padding: 20px;
}

canvas {
  border: 1px solid #444;
  background: #000;
}

.spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  gap: 15px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
