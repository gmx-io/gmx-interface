type WebGLLoseContextExtension = {
  loseContext: () => void;
};

function releaseWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const loseContext = gl.getExtension(
    'WEBGL_lose_context'
  ) as WebGLLoseContextExtension | null;
  loseContext?.loseContext();
}

export function canUseWebGL(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');

    if (!gl) {
      return false;
    }

    releaseWebGLContext(gl as WebGLRenderingContext);
    return true;
  } catch {
    return false;
  }
}
