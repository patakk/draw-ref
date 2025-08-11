export class Matrix4x4 {
  constructor() {
    this.data = new Float32Array(16);
    this.identity();
  }

  identity() {
    this.data.fill(0);
    this.data[0] = 1;
    this.data[5] = 1;
    this.data[10] = 1;
    this.data[15] = 1;
    return this;
  }

  translate(v) {
    const result = new Matrix4x4();
    result.data.set(this.data);
    result.data[12] += v.x;
    result.data[13] += v.y;
    result.data[14] += v.z;
    return result;
  }

  rotateX(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotation = new Matrix4x4();
    rotation.data[5] = cos;
    rotation.data[6] = sin;
    rotation.data[9] = -sin;
    rotation.data[10] = cos;
    return this.multiply(rotation);
  }

  rotateY(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotation = new Matrix4x4();
    rotation.data[0] = cos;
    rotation.data[2] = -sin;
    rotation.data[8] = sin;
    rotation.data[10] = cos;
    return this.multiply(rotation);
  }

  rotateZ(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotation = new Matrix4x4();
    rotation.data[0] = cos;
    rotation.data[1] = sin;
    rotation.data[4] = -sin;
    rotation.data[5] = cos;
    return this.multiply(rotation);
  }

  multiply(m) {
    const result = new Matrix4x4();
    const a = this.data;
    const b = m.data;
    const c = result.data;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        c[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    return result;
  }

  static perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    
    const result = new Matrix4x4();
    result.data[0] = f / aspect;
    result.data[5] = f;
    result.data[10] = (far + near) * nf;
    result.data[11] = -1;
    result.data[14] = 2 * far * near * nf;
    result.data[15] = 0;
    return result;
  }

  static lookAt(eye, center, up) {
    const zAxis = eye.sub(center).normalize();
    const xAxis = up.cross(zAxis).normalize();
    const yAxis = zAxis.cross(xAxis);

    const result = new Matrix4x4();
    result.data[0] = xAxis.x;
    result.data[1] = yAxis.x;
    result.data[2] = zAxis.x;
    result.data[3] = 0;
    result.data[4] = xAxis.y;
    result.data[5] = yAxis.y;
    result.data[6] = zAxis.y;
    result.data[7] = 0;
    result.data[8] = xAxis.z;
    result.data[9] = yAxis.z;
    result.data[10] = zAxis.z;
    result.data[11] = 0;
    result.data[12] = -xAxis.dot(eye);
    result.data[13] = -yAxis.dot(eye);
    result.data[14] = -zAxis.dot(eye);
    result.data[15] = 1;
    return result;
  }
}
