import * as THREE from 'three';

export interface ExtractedGeometry {
  vertices: number[];
  normals: number[];
  indices: number[];
  materials?: {
    name: string;
    color: [number, number, number];
    metallic?: number;
    roughness?: number;
    emissive?: [number, number, number];
  }[];
}

export function extractGeometryFromThreeJS(object: THREE.Object3D): ExtractedGeometry {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const materials: any[] = [];
  
  let vertexOffset = 0;
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      const position = geometry.attributes.position;
      const normal = geometry.attributes.normal;
      const index = geometry.index;
      
      // Get material info
      let materialInfo = {
        name: 'default',
        color: [0.7, 0.7, 0.7] as [number, number, number],
        metallic: 0,
        roughness: 0.8,
      };
      
      if (child.material instanceof THREE.MeshStandardMaterial) {
        const mat = child.material;
        materialInfo.color = [mat.color.r, mat.color.g, mat.color.b];
        materialInfo.metallic = mat.metalness;
        materialInfo.roughness = mat.roughness;
      } else if (child.material instanceof THREE.MeshBasicMaterial) {
        const mat = child.material;
        materialInfo.color = [mat.color.r, mat.color.g, mat.color.b];
      }
      
      materials.push(materialInfo);
      
      // Apply world matrix to transform vertices
      child.updateMatrixWorld();
      const matrix = child.matrixWorld;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
      
      // Extract vertices
      for (let i = 0; i < position.count; i++) {
        const vertex = new THREE.Vector3(
          position.getX(i),
          position.getY(i),
          position.getZ(i)
        );
        
        // Transform to world space
        vertex.applyMatrix4(matrix);
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // Extract normals
        if (normal) {
          const normalVec = new THREE.Vector3(
            normal.getX(i),
            normal.getY(i),
            normal.getZ(i)
          );
          
          // Transform normal to world space
          normalVec.applyMatrix3(normalMatrix).normalize();
          normals.push(normalVec.x, normalVec.y, normalVec.z);
        } else {
          // Default normal
          normals.push(0, 0, 1);
        }
      }
      
      // Extract indices
      if (index) {
        for (let i = 0; i < index.count; i++) {
          indices.push(index.getX(i) + vertexOffset);
        }
      } else {
        // Generate indices for non-indexed geometry
        for (let i = 0; i < position.count; i++) {
          indices.push(i + vertexOffset);
        }
      }
      
      vertexOffset += position.count;
    }
  });
  
  return {
    vertices,
    normals,
    indices,
    materials
  };
}
