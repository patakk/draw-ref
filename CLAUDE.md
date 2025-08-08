# Project Notes for Claude

## Testing Instructions
- DO NOT run `npm run dev` - the user runs it themselves
- The user will handle starting/stopping the development server

## Project Overview
This is a Vue.js 3D skull viewer application for drawing reference, built with Three.js. It displays anatomical skull models with sophisticated lighting and rendering controls.

## Architecture

### Core Components
1. **App.vue**: Main application with UI controls panel
2. **ModelViewer.vue**: Three.js 3D rendering engine and scene management

### Key Features

#### 3D Rendering (ModelViewer.vue)
- **Three.js Scene**: Camera, renderer, lights, and 3D models
- **Models**: Multiple skull models (asaro_low.glb, asaro_high.glb, skull.glb, head.glb)
- **Post-processing**: FXAA, SMAA, bloom, dithering, threshold effects
- **OrbitControls**: Mouse/touch camera interaction
- **Shadow mapping**: VSM shadows for realistic lighting

#### Lighting System
- **Directional Light 1 (Key)**: Primary light with manual θ/φ angle control
- **Directional Light 2 (Fill)**: Secondary light, automatically positioned opposite to key light
- **Ambient Light**: Scene-wide illumination
- **Manual Controls**: Brightness, color, and spherical angle control (θ=horizontal, φ=elevation)
- **Randomization**: Button to randomize light angles while updating UI sliders

#### Camera System  
- **OrbitControls Integration**: Manual camera manipulation
- **Manual Angle Controls**: θ/φ sliders for precise positioning
- **Reactive UI**: Sliders automatically update when camera is moved manually
- **FOV Control**: Field of view adjustment
- **Randomization**: Random camera positioning with slider sync

#### UI Controls (App.vue)
- **Collapsible Panel**: Toggle visibility with fixed position button
- **Lighting Section**: Key/Fill/Ambient controls with brightness, color, and angle sliders
- **Camera Section**: Angle and FOV controls
- **Model Selection**: Dropdown to switch between skull models
- **Effects**: Threshold effect with configurable points, bounding box/grid visualization
- **Responsive Design**: Mobile/tablet optimizations

### Technical Implementation Details

#### Coordinate Systems
- **Spherical Coordinates**: Used for both light and camera positioning
- **Conversion**: Degrees ↔ Radians conversion for UI/Three.js compatibility
- **θ (Theta)**: Horizontal angle (0-360°, azimuth)
- **φ (Phi)**: Vertical angle (0-180°, elevation from +Y axis)

#### Event System
- **camera-angle-changed**: Emitted when camera moves to update UI sliders
- **model-loaded**: Triggered when new model loads to reapply settings
- **Real-time Updates**: All controls update the 3D scene immediately

#### Shader System
- **Custom Shaders**: Threshold and dither effects loaded from external files
- **Fallback**: Inline shaders if external files fail to load
- **Post-processing Pipeline**: EffectComposer with multiple passes

#### State Management
- **Reactive Data**: Vue reactivity for all UI controls
- **Synchronization**: UI sliders sync with actual 3D scene state
- **Persistence**: Settings maintained during model switches

### File Structure
```
src/
├── App.vue                 # Main app with UI panel
├── components/
│   └── ModelViewer.vue    # 3D engine and rendering
└── shaders/               # Custom shader files
    ├── threshold.vert
    ├── threshold.frag
    ├── dither.vert
    └── dither.frag
```

### Development Notes
- **Vue 3**: Composition API not used, Options API throughout
- **Three.js**: Latest version with ES6 imports
- **Performance**: Optimized for real-time interaction
- **Mobile Support**: Responsive design with touch controls

### Release Management
- **Semantic Release**: Automated versioning and releases based on commit messages
- **Commit Format**: Uses conventional commits (feat:, fix:, chore:, etc.)
- **Auto-release**: Triggered on push to master branch via GitHub Actions
- **Manual Release**: Run `npm run semantic-release` locally (requires GITHUB_TOKEN)

## Recent Changes
- Added manual light angle controls (θ and φ) with real-time updates
- Added manual camera angle controls (θ and φ) with reactive sliders  
- Implemented bidirectional sync: sliders ↔ actual 3D positions
- Enhanced randomization to update UI sliders with generated values
- Light2 automatically positions opposite to Light1 for optimal fill lighting