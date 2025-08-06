uniform sampler2D tDiffuse;
uniform float thresholds[10]; // assume strictly increasing, unused values set >1.0
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
  float level = 0.0;

  for (int i = 0; i < 10; i++) {
    if (i >= thresholdCount) break;
    if (luminance < thresholds[i]) {
      level = float(i) / float(thresholdCount);
      gl_FragColor = vec4(vec3(level), 1.0);
      return;
    }
  }

  gl_FragColor = vec4(vec3(1.0), 1.0); // above all thresholds
}
