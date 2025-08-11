export class Vector1x4 {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  add(v) {
    return new Vector1x4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }

  sub(v) {
    return new Vector1x4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }

  mul(m) {
    if (typeof m === 'number') {
      return new Vector1x4(this.x * m, this.y * m, this.z * m, this.w * m);
    }
    
    if (m.length === 16) { // Matrix4x4
      return new Vector1x4(
        this.x * m[0] + this.y * m[4] + this.z * m[8] + this.w * m[12],
        this.x * m[1] + this.y * m[5] + this.z * m[9] + this.w * m[13],
        this.x * m[2] + this.y * m[6] + this.z * m[10] + this.w * m[14],
        this.x * m[3] + this.y * m[7] + this.z * m[11] + this.w * m[15]
      );
    }
    
    return new Vector1x4(this.x * m.x, this.y * m.y, this.z * m.z, this.w * m.w);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v) {
    return new Vector1x4(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
      1
    );
  }

  normalize() {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (length === 0) return new Vector1x4(0, 0, 0, this.w);
    return new Vector1x4(this.x / length, this.y / length, this.z / length, this.w);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  clone() {
    return new Vector1x4(this.x, this.y, this.z, this.w);
  }
}
