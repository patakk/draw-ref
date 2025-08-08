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
          <label class="slider-label">Key</label>
          <input type="range" min="0.1" max="2" step="0.1" v-model="lightBrightness" @input="updateLightBrightness" class="slider">
          <span class="slider-value">{{ parseFloat(lightBrightness).toFixed(1) }}</span>
          <input type="color" v-model="lightColor" @input="updateLightColor" class="color-picker">
          <button @click="locks.lightColor = !locks.lightColor" class="lock-button" :class="{ locked: locks.lightColor }">
            <font-awesome-icon :icon="locks.lightColor ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">Fill</label>
          <input type="range" min="0" max="2" step="0.1" v-model="light2Brightness" @input="updateLight2Brightness" class="slider">
          <span class="slider-value">{{ parseFloat(light2Brightness).toFixed(1) }}</span>
          <input type="color" v-model="light2Color" @input="updateLight2Color" class="color-picker">
          <button @click="locks.light2Color = !locks.light2Color" class="lock-button" :class="{ locked: locks.light2Color }">
            <font-awesome-icon :icon="locks.light2Color ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">Ambient</label>
          <input type="range" min="0" max="1" step="0.01" v-model="ambientBrightness" @input="updateAmbientBrightness" class="slider">
          <span class="slider-value">{{ parseFloat(ambientBrightness).toFixed(2) }}</span>
          <input type="color" v-model="ambientColor" @input="updateAmbientColor" class="color-picker">
          <button @click="locks.ambientColor = !locks.ambientColor" class="lock-button" :class="{ locked: locks.ambientColor }">
            <font-awesome-icon :icon="locks.ambientColor ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">Angle θ</label>
          <input type="range" min="0" max="360" step="5" v-model="lightTheta" @input="updateLightAngle" class="slider">
          <span class="slider-value">{{ parseFloat(lightTheta).toFixed(0) }}°</span>
          <button @click="locks.lightTheta = !locks.lightTheta" class="lock-button" :class="{ locked: locks.lightTheta }">
            <font-awesome-icon :icon="locks.lightTheta ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">Angle φ</label>
          <input type="range" min="0" max="180" step="5" v-model="lightPhi" @input="updateLightAngle" class="slider">
          <span class="slider-value">{{ parseFloat(lightPhi).toFixed(0) }}°</span>
          <button @click="locks.lightPhi = !locks.lightPhi" class="lock-button" :class="{ locked: locks.lightPhi }">
            <font-awesome-icon :icon="locks.lightPhi ? 'lock' : 'lock-open'" />
          </button>
        </div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <label>Camera</label>
        </div>

        <div class="slider-container">
          <label class="slider-label">Angle θ</label>
          <input type="range" min="0" max="360" step="5" v-model="cameraTheta" @input="updateCameraAngle" class="slider">
          <span class="slider-value">{{ parseFloat(cameraTheta).toFixed(0) }}°</span>
          <button @click="locks.cameraTheta = !locks.cameraTheta" class="lock-button" :class="{ locked: locks.cameraTheta }">
            <font-awesome-icon :icon="locks.cameraTheta ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">Angle φ</label>
          <input type="range" min="0" max="180" step="5" v-model="cameraPhi" @input="updateCameraAngle" class="slider">
          <span class="slider-value">{{ parseFloat(cameraPhi).toFixed(0) }}°</span>
          <button @click="locks.cameraPhi = !locks.cameraPhi" class="lock-button" :class="{ locked: locks.cameraPhi }">
            <font-awesome-icon :icon="locks.cameraPhi ? 'lock' : 'lock-open'" />
          </button>
        </div>
        <div class="slider-container">
          <label class="slider-label">FOV</label>
          <input type="range" min="10" max="90" step="5" v-model="cameraFOV" @input="updateCameraFOV" class="slider">
          <span class="slider-value">{{ parseFloat(cameraFOV).toFixed(0) }}°</span>
          <button @click="locks.cameraFOV = !locks.cameraFOV" class="lock-button" :class="{ locked: locks.cameraFOV }">
            <font-awesome-icon :icon="locks.cameraFOV ? 'lock' : 'lock-open'" />
          </button>
        </div>
      </div>

      <div class="panel-section">
        <button @click="randomizeAll" class="btn-small master-randomize">
          Randomize <font-awesome-icon icon="dice" />
        </button>
      </div>

      <div class="panel-section panel-divider">
        <div class="checkbox-container">
          <input type="checkbox" id="bbox-checkbox" v-model="boundingBoxVisible" @change="updateBoundingBox" class="checkbox">
          <label for="bbox-checkbox">Bounding Box</label>
        </div>
        <div v-if="boundingBoxVisible" class="checkbox-container">
          <input type="checkbox" id="grid-checkbox" v-model="boundingGridVisible" @change="updateBoundingGrid" class="checkbox">
          <label for="grid-checkbox">Grid Lines</label>
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
            <span class="slider-value">{{ parseFloat(point.value).toFixed(2) }}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
    <div class="kofi-link">
      <a href='https://ko-fi.com/U7U01BB9OI' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/brandasset/v2/kofi_symbol.png' border='0' alt='contribute' /></a>
    </div>
    <ModelViewer 
      ref="skullViewer" 
      :base-camera-distance="baseCameraDistance"
      :ambient-master="ambientMaster" 
      :directional-master="directionalMaster"
      :light-color="lightColor"
      :light2-color="light2Color"
      :ambient-color="ambientColor"
      :ambient-brightness="parseFloat(ambientBrightness)"
      @model-loaded="onModelLoaded"
      @camera-angle-changed="onCameraAngleChanged"
    />
  </div>
</template>

<script>
import ModelViewer from './components/ModelViewer.vue'

export default {
  name: 'App',
  components: {
    ModelViewer
  },
  data() {
    const colors = this.generateRandomColors()
    return {
      lightBrightness: 1.,
      light2Brightness: 0.6,
      lightColor: '#ffffff',
      light2Color: colors.light2Color,
      lightTheta: 45,
      lightPhi: 45,
      cameraTheta: 45,
      cameraPhi: 45,
      ambientBrightness: 0.15,
      ambientColor: colors.ambientColor,
      cameraFOV: 45,
      baseCameraDistance: 0.8,
      ambientMaster: .27,
      directionalMaster: 1.7,
      thresholdEnabled: false,
      boundingBoxVisible: false,
      boundingGridVisible: false,
      panelCollapsed: false,
      selectedModel: 'asaro_low.glb',
      availableModels: ['asaro_low.glb', 'asaro_high.glb', 'skull.glb'],
      thresholdPoints: [
        { value: 0.33 },
        { value: 0.66 }
      ],
      // Lock states for parameters (true = locked, false = unlocked)
      locks: {
        lightColor: false,
        light2Color: false,
        lightTheta: false,
        lightPhi: false,
        cameraTheta: false,
        cameraPhi: false,
        cameraFOV: false,
        ambientColor: false
      }
    }
  },
  methods: {
    generateRandomColors() {
      // Generate random hue (0-360), 80% saturation, 80% brightness
      const baseHue = Math.random() * 360
      const saturation = 80
      const lightness = 80
      
      // Helper function to convert HSL to hex
      const hslToHex = (h, s, l) => {
        const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100
        const x = c * (1 - Math.abs((h / 60) % 2 - 1))
        const m = l / 100 - c / 2
        
        let r, g, b
        if (h >= 0 && h < 60) {
          r = c; g = x; b = 0
        } else if (h >= 60 && h < 120) {
          r = x; g = c; b = 0
        } else if (h >= 120 && h < 180) {
          r = 0; g = c; b = x
        } else if (h >= 180 && h < 240) {
          r = 0; g = x; b = c
        } else if (h >= 240 && h < 300) {
          r = x; g = 0; b = c
        } else {
          r = c; g = 0; b = x
        }
        
        r = Math.round((r + m) * 255)
        g = Math.round((g + m) * 255)
        b = Math.round((b + m) * 255)
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }
      
      // Generate light2 color with base hue
      const light2Color = hslToHex(baseHue, saturation, lightness)
      
      // Generate ambient color with hue shifted by 10% (36 degrees)
      const ambientHue = (baseHue + 36) % 360
      const ambientColor = hslToHex(ambientHue, saturation, lightness)
      
      return { light2Color, ambientColor }
    },
    randomizeCamera() {
      // Generate random angles
      this.cameraTheta = Math.random() * 360
      this.cameraPhi = Math.random() * 180
      this.$refs.skullViewer.setCameraAngle(this.cameraTheta, this.cameraPhi)
    },
    updateCameraAngle() {
      this.$refs.skullViewer.setCameraAngle(this.cameraTheta, this.cameraPhi)
    },
    randomizeLighting() {
      // Generate random angles
      this.lightTheta = Math.random() * 360
      this.lightPhi = Math.random() * 180
      this.$refs.skullViewer.setLightAngle(this.lightTheta, this.lightPhi)
    },
    updateLightAngle() {
      this.$refs.skullViewer.setLightAngle(this.lightTheta, this.lightPhi)
    },
    randomizeAll() {
      // Generate random colors for lights
      const colors = this.generateRandomColors()
      
      // Only randomize light colors, not intensities
      if (!this.locks.lightColor) {
        this.lightColor = '#ffffff'
        this.updateLightColor()
      }
      
      if (!this.locks.light2Color) {
        this.light2Color = colors.light2Color
        this.updateLight2Color()
      }
      
      // Randomize light angles only if unlocked
      if (!this.locks.lightTheta) {
        this.lightTheta = Math.random() * 360
      }
      
      if (!this.locks.lightPhi) {
        this.lightPhi = Math.random() * 180
      }
      
      // Update light angle if either was unlocked
      if (!this.locks.lightTheta || !this.locks.lightPhi) {
        this.updateLightAngle()
      }
      
      // Randomize camera angles only if unlocked
      if (!this.locks.cameraTheta) {
        this.cameraTheta = Math.random() * 360
      }
      
      if (!this.locks.cameraPhi) {
        this.cameraPhi = Math.random() * 180
      }
      
      // Update camera angle if either was unlocked
      if (!this.locks.cameraTheta || !this.locks.cameraPhi) {
        this.updateCameraAngle()
      }
      
      // Randomize camera FOV only if unlocked
      if (!this.locks.cameraFOV) {
        this.cameraFOV = Math.floor(Math.random() * 80 + 10) // 10-90
        this.updateCameraFOV()
      }
      
      // Randomize ambient color only if unlocked
      if (!this.locks.ambientColor) {
        this.ambientColor = colors.ambientColor
        this.updateAmbientColor()
      }
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
        this.$refs.skullViewer.setPostProcessing(false)
      } else {
        this.$refs.skullViewer.setPostProcessing(true)
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
      // Reset grid visibility when bounding box is turned off
      if (!this.boundingBoxVisible) {
        this.boundingGridVisible = false
        this.$refs.skullViewer.setBoundingGridVisible(false)
      }
    },
    updateBoundingGrid() {
      this.$refs.skullViewer.setBoundingGridVisible(this.boundingGridVisible)
    },
    updateModel() {
      this.$refs.skullViewer.loadModel(this.selectedModel)
    },
    onModelLoaded() {
      // Reapply current checkbox states after model loads
      this.$refs.skullViewer.setBoundingBoxVisible(this.boundingBoxVisible)
      this.$refs.skullViewer.setBoundingGridVisible(this.boundingGridVisible)
    },
    onCameraAngleChanged(angles) {
      // Update sliders to reflect actual camera position
      this.cameraTheta = Math.round(angles.theta)
      this.cameraPhi = Math.round(angles.phi)
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
      this.updateLightAngle()
      this.updateCameraAngle()
      this.updateAmbientBrightness()
      this.updateAmbientColor()
      this.updateCameraFOV()
      this.updateThreshold()
      this.$refs.skullViewer.setPostProcessing(true)
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
  /* Prevent double-tap zoom on the entire app */
  touch-action: manipulation;
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
  border-radius: 2px; /* Optional: add slight rounding */
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
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  min-width: 280px;
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.effects-panel::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Webkit */
}

.panel-section {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-divider {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
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
  margin: 1em 1em;
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

.lock-button {
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #999;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  margin-left: 4px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.lock-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ccc;
}

.lock-button.locked {
  background: rgba(255, 100, 100, 0.3);
  color: #ff6666;
}

.lock-button.locked:hover {
  background: rgba(255, 100, 100, 0.4);
  color: #ff8888;
}

.master-randomize {
  background: #444 !important;
  font-weight: 400;
  padding: 8px 16px !important;
  margin: 0 auto !important;
  display: block !important;
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
  background: #000000;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #000000;
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
  accent-color: #000000;
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
  opacity: .4;
  min-width: 70px;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
}

.full-width {
  width: 100%;
}

.slider-value {
  font-size: 11px;
  color: #ffffffab;
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
  bottom: 1em;
  left: 1em;
  z-index: 100;
  opacity: .4;
}

.kofi-link:hover {
  opacity: 1;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* Disable double-tap zoom and text selection */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* Disable touch callouts on iOS */
  -webkit-touch-callout: none;
  /* Disable highlight on tap */
  -webkit-tap-highlight-color: transparent;
}

/* Mobile and tablet styles */
@media (max-width: 1024px) {
  .effects-panel {
    background: rgba(15, 15, 15, 0.1) !important;
    backdrop-filter: blur(3px) !important;
    left: 20px !important;
    right: 20px !important;
    top: 20px !important;
    min-width: auto !important;
    width: calc(100vw - 40px) !important;
    box-sizing: border-box !important;
  }

  .always-visible-toggle {
    right: 2em;
    top: 2em;
  }


.kofi-link {
  bottom: 2em;
}
}
</style>