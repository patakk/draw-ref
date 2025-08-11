export class Shader {
  constructor() {
    this.program = null;
    this.va = null;
  }

  async init(GL, vertexShaderUrl, fragmentShaderUrl) {
    try {
      const [vertexSource, fragmentSource] = await Promise.all([
        fetch(vertexShaderUrl).then(r => r.text()),
        fetch(fragmentShaderUrl).then(r => r.text())
      ]);

      const vertexShader = this.compileShader(GL, GL.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.compileShader(GL, GL.FRAGMENT_SHADER, fragmentSource);

      this.program = GL.createProgram();
      GL.attachShader(this.program, vertexShader);
      GL.attachShader(this.program, fragmentShader);
      GL.linkProgram(this.program);

      if (!GL.getProgramParameter(this.program, GL.LINK_STATUS)) {
        throw new Error('Shader program link error: ' + GL.getProgramInfoLog(this.program));
      }

      // Create vertex array for full-screen quad
      this.va = GL.createVertexArray();
      GL.bindVertexArray(this.va);

      const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ]);

      const vb = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, vb);
      GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW);
      GL.enableVertexAttribArray(0);
      GL.vertexAttribPointer(0, 2, GL.FLOAT, false, 0, 0);

      GL.bindVertexArray(null);

      return true;
    } catch (error) {
      console.error('Shader initialization failed:', error);
      throw error;
    }
  }

  compileShader(GL, type, source) {
    const shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);

    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      const info = GL.getShaderInfoLog(shader);
      GL.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }

    return shader;
  }
}
