<template>
  <div id="app">
    <!-- New approach: completely fixed positioned button -->
    <button class="always-visible-toggle" @click="panelCollapsed = !panelCollapsed">
      <font-awesome-icon :icon="panelCollapsed ? 'arrow-right' : 'arrow-down'" />
    </button>
    
    <div class="effects-panel" v-show="!panelCollapsed">
      <div class="panel-content">
        <div class="panel-section">

      <div class="panel-section">
        <label>Model</label>
        <select v-model="selectedModel" @change="updateModel" class="model-select">
          <option v-for="model in availableModels" :key="model" :value="model">
            {{ model.replace('.glb', '').replace('_', ' ') }}
          </option>
        </select>
      </div>
        <div class="section-header">
          <label>Lighting</label>
        </div>
        <div class="slider-container">
          <label class="slider-label">Light 1</label>
          <input type="range" min="0.1" max="2" step="0.1" v-model="lightBrightness" @input="updateLightBrightness" class="slider">
          <span>{{ parseFloat(lightBrightness).toFixed(1) }}</span>
          <input type="color" v-model="lightColor" @input="updateLightColor" class="color-picker">
        </div>
        <div class="slider-container">
          <label class="slider-label">Light 2</label>
          <input type="range" min="0" max="2" step="0.1" v-model="light2Brightness" @input="updateLight2Brightness" class="slider">
          <span>{{ parseFloat(light2Brightness).toFixed(1) }}</span>
          <input type="color" v-model="light2Color" @input="updateLight2Color" class="color-picker">
        </div>
        <div class="slider-container">
          <label class="slider-label">Ambient</label>
          <input type="range" min="0" max="1" step="0.01" v-model="ambientBrightness" @input="updateAmbientBrightness" class="slider">
          <span>{{ parseFloat(ambientBrightness).toFixed(2) }}</span>
          <input type="color" v-model="ambientColor" @input="updateAmbientColor" class="color-picker">
        </div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <label>Camera</label>
        </div>
        <div class="slider-container">
          <label class="slider-label">FOV</label>
          <input type="range" min="10" max="90" step="5" v-model="cameraFOV" @input="updateCameraFOV" class="slider">
          <span>{{ parseFloat(cameraFOV).toFixed(0) }}°</span>
        </div>
      </div>
      <div class="panel-section">

        <button @click="randomizeLighting" class="btn-small">
          <font-awesome-icon icon="lightbulb" /> Randomize Light
        </button>
        <button @click="randomizeCamera" class="btn-small">
          <font-awesome-icon icon="camera" /> Randomize Camera
        </button>
        <button @click="randomizeBoth" class="btn btn-primary full-width">
          <font-awesome-icon icon="shuffle" /> Randomize Both
        </button>
      </div>

      <div class="panel-section">
        <div class="checkbox-container">
          <input type="checkbox" id="bbox-checkbox" v-model="boundingBoxVisible" @change="updateBoundingBox" class="checkbox">
          <label for="bbox-checkbox">Bounding Box</label>
        </div>
      </div>
      <div class="panel-section">
        <div class="checkbox-container">
          <input type="checkbox" id="postprocessing-checkbox" v-model="postProcessingEnabled" @change="updatePostProcessing" class="checkbox">
          <label for="postprocessing-checkbox">Post Processing</label>
        </div>
      </div>
      <div class="panel-section">
        <div class="checkbox-container">
          <input type="checkbox" id="threshold-checkbox" v-model="thresholdEnabled" @change="updateThreshold" class="checkbox">
          <label for="threshold-checkbox">Threshold Effect</label>
        </div>
        <div v-if="thresholdEnabled" class="threshold-controls">
          <div class="threshold-header">
            <label>Threshold Points: {{ thresholdPoints.length }}</label>
            <button @click="addThresholdPoint" class="btn-small">+</button>
            <button @click="removeThresholdPoint" class="btn-small">-</button>
            <button @click="distributeUniformly" class="btn-small">Distribute</button>
          </div>
          <div v-for="(point, index) in thresholdPoints" :key="index" class="threshold-point">
            <label>Point {{ index + 1 }}</label>
            <input type="range" min="0" max="1" step="0.01" v-model="point.value" @input="adjustThresholds(index)" class="slider">
            <span>{{ parseFloat(point.value).toFixed(2) }}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
    <div class="kofi-link">
      <a href='https://ko-fi.com/U7U01BB9OI' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/brandasset/v2/kofi_symbol.png' border='0' alt='contribute' /></a>
    </div>
    <SkullViewer 
      ref="skullViewer" 
      :base-camera-distance="baseCameraDistance"
      :ambient-master="ambientMaster" 
      :directional-master="directionalMaster"
    />
  </div>
</template>

<script>
import SkullViewer from './components/SkullViewer.vue'

export default {
  name: 'App',
  components: {
    SkullViewer
  },
  data() {
    return {
      lightBrightness: 1.,
      light2Brightness: 0.6,
      lightColor: '#ffffff',
      light2Color: '#ff8844',
      ambientBrightness: 0.15,
      ambientColor: '#ffffff',
      cameraFOV: 45,
      baseCameraDistance: 0.8,
      ambientMaster: .27,
      directionalMaster: 3.0,
      thresholdEnabled: false,
      boundingBoxVisible: false,
      postProcessingEnabled: true,
      panelCollapsed: false,
      selectedModel: 'asaro_low.glb',
      availableModels: ['asaro_low.glb', 'asaro_high.glb', 'skull.glb', 'head.glb'],
      thresholdPoints: [
        { value: 0.33 },
        { value: 0.66 }
      ]
    }
  },
  methods: {
    randomizeCamera() {
      this.$refs.skullViewer.randomizeCamera()
    },
    randomizeLighting() {
      this.$refs.skullViewer.randomizeLighting()
    },
    randomizeBoth() {
      this.$refs.skullViewer.randomizeCamera()
      this.$refs.skullViewer.randomizeLighting()
    },
    updateLightBrightness() {
      this.$refs.skullViewer.setLightBrightness(this.lightBrightness)
    },
    updateLight2Brightness() {
      this.$refs.skullViewer.setLight2Brightness(this.light2Brightness)
    },
    updateLightColor() {
      this.$refs.skullViewer.setLightColor(this.lightColor)
    },
    updateLight2Color() {
      this.$refs.skullViewer.setLight2Color(this.light2Color)
    },
    updateAmbientBrightness() {
      this.$refs.skullViewer.setAmbientBrightness(this.ambientBrightness)
    },
    updateAmbientColor() {
      this.$refs.skullViewer.setAmbientColor(this.ambientColor)
    },
    updateCameraFOV() {
      this.$refs.skullViewer.setCameraFOV(this.cameraFOV)
    },
    updateThreshold() {
      // Auto-disable post processing when threshold is enabled
      if (this.thresholdEnabled) {
        //this.postProcessingEnabled = false
        //this.$refs.skullViewer.setPostProcessing(false)
      }
      this.$refs.skullViewer.setThreshold(this.thresholdEnabled, this.thresholdPoints)
    },
    addThresholdPoint() {
      if (this.thresholdPoints.length < 10) {
        this.thresholdPoints.push({ value: 0.5 })
        this.updateThreshold()
      }
    },
    removeThresholdPoint() {
      if (this.thresholdPoints.length > 1) {
        this.thresholdPoints.pop()
        this.updateThreshold()
      }
    },
    distributeUniformly() {
      const count = this.thresholdPoints.length
      for (let i = 0; i < count; i++) {
        this.thresholdPoints[i].value = (i + 1) / (count + 1)
      }
      this.updateThreshold()
    },
    updateBoundingBox() {
      this.$refs.skullViewer.setBoundingBoxVisible(this.boundingBoxVisible)
    },
    updateModel() {
      this.$refs.skullViewer.loadModel(this.selectedModel)
    },
    updatePostProcessing() {
      this.$refs.skullViewer.setPostProcessing(this.postProcessingEnabled)
    },
    adjustThresholds(changedIndex) {
      const value = parseFloat(this.thresholdPoints[changedIndex].value)
      
      // Adjust all thresholds to the right (higher indices) to maintain monotonic order
      for (let i = changedIndex + 1; i < this.thresholdPoints.length; i++) {
        if (parseFloat(this.thresholdPoints[i].value) < value) {
          this.thresholdPoints[i].value = value.toString()
        }
      }
      
      // Adjust all thresholds to the left (lower indices) to maintain monotonic order
      for (let i = changedIndex - 1; i >= 0; i--) {
        if (parseFloat(this.thresholdPoints[i].value) > value) {
          this.thresholdPoints[i].value = value.toString()
        }
      }
      
      this.updateThreshold()
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateLightBrightness()
      this.updateLight2Brightness()
      this.updateLightColor()
      this.updateLight2Color()
      this.updateAmbientBrightness()
      this.updateAmbientColor()
      this.updateCameraFOV()
      this.updateThreshold()
      this.updatePostProcessing()
    })
  }
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: relative;
  background: #000;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* New fixed button style */
.always-visible-toggle {
  position: fixed; /* Fixed to viewport */
  top: 33px;
  right: 33px;
  z-index: 9999; /* Extremely high z-index */
  background: rgba(30, 30, 30, 0.9);
  cursor: pointer;
  outline: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  padding: 0;
  margin: 0;
  border: none; /* Remove default border */
  border-radius: 4px; /* Optional: add slight rounding */
  box-shadow: none; /* Remove any shadow */
  -webkit-appearance: none; /* Remove default styling on some browsers */
}

.always-visible-toggle:hover {
  background: rgba(40, 40, 40, 0.95);
}

/* Remove the toggle-button style as we're replacing it */
.toggle-button {
  display: none;
}

.effects-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  background: rgba(15, 15, 15, 0.95);
  padding: 20px;
  padding-top: 40px; /* Make room for the toggle button */
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  min-width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.panel-section {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-section label {
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.threshold-controls {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
  margin-top: 15px;
}

.threshold-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.threshold-point {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.02);
  padding: 8px;
  border-radius: 6px;
}

.btn {
  padding: 10px 20px;
  background: #333;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background: #555;
}

.btn-primary {
  background: #333;
  border-radius: 2px;
}

.btn-primary:hover {
  background: #555;
}

.btn-small {
  padding: 4px 8px;
  background: #333;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.btn-small:hover {
  background: #555;
}

.btn-small .svg-inline--fa,
.btn .svg-inline--fa {
  margin-right: 6px;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007acc;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007acc;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider::-webkit-slider-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
}

.slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: #007acc;
  cursor: pointer;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slider-label {
  font-size: 11px;
  color: #999;
  min-width: 70px;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
}

.full-width {
  width: 100%;
}

.panel-section span {
  font-size: 11px;
  color: #007acc;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.model-select {
  width: 100%;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.model-select:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.model-select option {
  background: #1a1a1a;
  color: #e0e0e0;
}

.color-picker {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.kofi-link {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>