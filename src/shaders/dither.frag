uniform sampler2D tDiffuse;
uniform float time;
varying vec2 vUv;

// Simple dithering function
float dither(vec2 position) {
  return fract(sin(dot(position.xy, vec2(12.9898,78.233))) * 43758.5453) - 0.5;
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  
  // Add animated dithering
  float noisex = dither(gl_FragCoord.xy*.01 + time) * 11.;
  float noisey = dither(mod(gl_FragCoord.xy*.01+0.314 + time, 1.0)) * 11.;
  vec2 uvnoise = gl_FragCoord.xy + vec2(noisex, noisey);
  float noise = dither(uvnoise + time);
  color += noise*.1;
  
  gl_FragColor = vec4(color, 1.0);
}