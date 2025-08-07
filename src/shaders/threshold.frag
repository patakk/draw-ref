uniform sampler2D tDiffuse;
uniform float thresholds[10];
uniform int thresholdCount;
uniform bool enabled;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  
  if (!enabled) {
    gl_FragColor = color;
    return;
  }
  
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  
  // Initialize with black
  vec3 outputColor = vec3(0.0);
  
  // Find which band the luminance falls into
  for (int i = 0; i < 10; i++) {
    if (i >= thresholdCount) break;
    
    if (luminance <= thresholds[i]) {
      float intensity = float(i) / float(thresholdCount + 1);
      outputColor = vec3(intensity);
      break;
    }
  }
  
  // If luminance is above all thresholds, use white
  if (luminance > thresholds[thresholdCount-1]) {
    outputColor = vec3(1.0);
  }
  
  gl_FragColor = vec4(outputColor, color.a);
}
