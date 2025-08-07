uniform sampler2D tDiffuse;
uniform float time;
varying vec2 vUv;

// Pseudo-random function
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + time * 0.1) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  
  // Add slight dithering noise
  float noise = rand(vUv) * 0.1 - 0.1/2.;
  
  gl_FragColor = vec4(color.rgb + vec3(noise), color.a);
}