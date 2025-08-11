import RefFrame from '../math/RefFrame';

export interface RayTracingScene {
  rootNode: RefFrame | null;
  parentNode: RefFrame | null;
  cameraNode: RefFrame | null;
  facesTexture: WebGLTexture | null;
  AABBsTexture: WebGLTexture | null;
  mtlsTexture: WebGLTexture | null;
  objCount: number;
  init(): Promise<void>;
  bindToSampleShader(GL: WebGL2RenderingContext, program: WebGLProgram): void;
}
