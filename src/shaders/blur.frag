uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 texelSize = 1.0 / resolution;
  
  // Sample from original resolution
  vec3 original = texture2D(tDiffuse, vUv).rgb;
  
  // Simple 3x3 blur kernel for efficiency
  vec3 blurred = vec3(0.0);
  blurred += texture2D(tDiffuse, vUv + vec2(-texelSize.x, -texelSize.y) * 3.0).rgb * 0.0625;
  blurred += texture2D(tDiffuse, vUv + vec2(0.0, -texelSize.y) * 3.0).rgb * 0.125;
  blurred += texture2D(tDiffuse, vUv + vec2(texelSize.x, -texelSize.y) * 3.0).rgb * 0.0625;
  blurred += texture2D(tDiffuse, vUv + vec2(-texelSize.x, 0.0) * 3.0).rgb * 0.125;
  blurred += texture2D(tDiffuse, vUv).rgb * 0.25;
  blurred += texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0) * 3.0).rgb * 0.125;
  blurred += texture2D(tDiffuse, vUv + vec2(-texelSize.x, texelSize.y) * 3.0).rgb * 0.0625;
  blurred += texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y) * 3.0).rgb * 0.125;
  blurred += texture2D(tDiffuse, vUv + vec2(texelSize.x, texelSize.y) * 3.0).rgb * 0.0625;
  
  vec3 final = 1. - (1.-original)*(1.-blurred*.5);
  
  gl_FragColor = vec4(final, 1.0);
}