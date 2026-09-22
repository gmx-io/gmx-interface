const VERTEX = `#version 300 es
layout(location = 0) in vec2 position;
out vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// Ported from the supplied Figma "Spoiler blur" shader. Cache its static blur pass.
const BLUR = `#version 300 es
precision highp float;
uniform sampler2D source;
uniform vec2 dimensions;
uniform vec2 inputDimensions;
uniform float blurRadius;
in vec2 uv;
out vec4 color;
void main() {
  vec2 blockSize = vec2(4.0) / dimensions;
  vec2 inputUv = vec2(uv.x, 1.0 - uv.y);
  vec2 center = floor(inputUv / blockSize) * blockSize + blockSize * 0.5;
  center.y = 1.0 - center.y;
  vec4 sum = vec4(0.0);
  float weight = 0.0;
  for (int x = 0; x < 15; x++) {
    for (int y = 0; y < 15; y++) {
      vec2 offset = (vec2(float(x), float(y)) - 7.0) / 7.0;
      float w = exp(-dot(offset, offset) * 2.0);
      sum += texture(source, clamp(center + offset * blurRadius / inputDimensions, 0.0, 1.0)) * w;
      weight += w;
    }
  }
  color = sum / weight;
  color.rgb *= 0.6;
}`;

const DOTS = `#version 300 es
precision highp float;
uniform sampler2D obscured;
uniform sampler2D source;
uniform vec2 dimensions;
uniform float time;
uniform float reveal;
in vec2 uv;
out vec4 color;
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 pixel = vec2(uv.x, 1.0 - uv.y) * dimensions;
  vec2 cell = floor(pixel / 4.5);
  vec2 center = (cell + vec2(hash21(cell), hash21(cell + vec2(127.1, 311.7)))) * 4.5;
  float radius = hash21(cell + vec2(53.7, 91.2)) * 0.75 + 0.375;
  float phase = hash21(cell + vec2(17.3, 43.9));
  float rate = 0.4 + hash21(cell + vec2(61.1, 29.3)) * 0.6;
  float alpha = 0.3 + 0.7 * (0.5 + 0.5 * sin(time * rate * 6.2832 + phase * 6.2832));
  float show = step(0.5, hash21(cell + vec2(7.7, 13.3)));
  float dotAlpha = (1.0 - smoothstep(radius * 0.3, radius, distance(pixel, center))) * show * 0.7 * alpha;
  color = mix(texture(obscured, uv), texture(source, uv), reveal);
  color += vec4(dotAlpha * (1.0 - reveal));
}`;

export function createSpoilerRenderer(canvas: HTMLCanvasElement, blurRadius = 30) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const buffer = gl.createBuffer();
  const framebuffer = gl.createFramebuffer();
  let width = 1;
  let height = 1;

  function destroy() {
    programs.forEach((program) => gl!.deleteProgram(program));
    textures.forEach((texture) => gl!.deleteTexture(texture));
    gl!.deleteBuffer(buffer);
    gl!.deleteFramebuffer(framebuffer);
  }

  function compile(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) throw new Error("Unable to create spoiler shader");
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      throw new Error("Unable to compile spoiler shader");
    }
    return shader;
  }

  function program(fragment: string) {
    const result = gl!.createProgram();
    if (!result) throw new Error("Unable to create spoiler program");
    programs.push(result);
    const vertex = compile(gl!.VERTEX_SHADER, VERTEX);
    gl!.attachShader(result, vertex);
    gl!.deleteShader(vertex);
    const pixel = compile(gl!.FRAGMENT_SHADER, fragment);
    gl!.attachShader(result, pixel);
    gl!.deleteShader(pixel);
    gl!.linkProgram(result);
    if (!gl!.getProgramParameter(result, gl!.LINK_STATUS)) throw new Error("Unable to link spoiler shader");
    return result;
  }

  function texture() {
    const result = gl!.createTexture();
    if (!result) throw new Error("Unable to create spoiler texture");
    textures.push(result);
    gl!.bindTexture(gl!.TEXTURE_2D, result);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return result;
  }

  try {
    if (!buffer || !framebuffer) throw new Error("Unable to allocate spoiler buffers");
    const blurProgram = program(BLUR);
    const dotProgram = program(DOTS);
    const input = texture();
    const blurred = texture();
    const blurDimensions = gl.getUniformLocation(blurProgram, "dimensions");
    const inputDimensions = gl.getUniformLocation(blurProgram, "inputDimensions");
    const dotDimensions = gl.getUniformLocation(dotProgram, "dimensions");
    const dotTime = gl.getUniformLocation(dotProgram, "time");
    const dotReveal = gl.getUniformLocation(dotProgram, "reveal");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(blurProgram);
    gl.uniform1i(gl.getUniformLocation(blurProgram, "source"), 0);
    gl.uniform1f(gl.getUniformLocation(blurProgram, "blurRadius"), blurRadius);
    gl.useProgram(dotProgram);
    gl.uniform1i(gl.getUniformLocation(dotProgram, "obscured"), 0);
    gl.uniform1i(gl.getUniformLocation(dotProgram, "source"), 1);

    return {
      update(image: HTMLImageElement, cssWidth: number, cssHeight: number) {
        width = cssWidth;
        height = cssHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, input);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.bindTexture(gl.TEXTURE_2D, blurred);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurred, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          throw new Error("Unable to render spoiler texture");
        }
        gl.useProgram(blurProgram);
        gl.uniform2f(blurDimensions, width, height);
        gl.uniform2f(inputDimensions, image.naturalWidth, image.naturalHeight);
        gl.bindTexture(gl.TEXTURE_2D, input);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      },
      draw(seconds: number, reveal = 0) {
        gl.useProgram(dotProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, blurred);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, input);
        gl.uniform2f(dotDimensions, width, height);
        gl.uniform1f(dotTime, seconds);
        gl.uniform1f(dotReveal, Math.max(0, Math.min(1, reveal)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
      destroy,
    };
  } catch (_error) {
    destroy();
    return null;
  }
}
