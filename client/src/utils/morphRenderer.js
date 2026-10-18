// WebGL "noise morph" image transition — no dependencies.
//
// Two images are blended through a drifting fractal-noise field: the incoming image grows out
// of the noise like a stain, both images are warped along the noise as they trade places, and a
// thin brass-coloured light runs along the dissolving edge. Between transitions the current
// image drifts with a slow Ken Burns zoom and a faint pointer parallax. Everything is graded
// toward the site's wine-black palette so any poster or backdrop sits in the same world.
//
// This module only knows about WebGL. Which images to show, autoplay, controls and fallbacks
// live in components/MorphGallery.jsx.
//
//   const r = createMorphRenderer(canvas, { sources, onFirstFrame, onFail });
//   if (!r) → WebGL unavailable (or shader failed): use a DOM fallback.
//   r.goTo(i) · r.setActive(bool) · r.resize() · r.setPointer(x, y) · r.scrub(a, b, p) · r.destroy()
//
// `sources` are CORS-clean image sources: [{ source: ImageBitmap | HTMLImageElement, width, height }].
// A source from a non-CORS image would make texImage2D throw a SecurityError — see imageLoader.js.

import { coverCrop } from './tmdbImage';

const DWELL_MS = 9000; // how long the Ken Burns zoom takes to run its course
const ZOOM_BASE = 1.04; // > 1 so the parallax and warp never reveal an image edge
const ZOOM_RANGE = 0.06;
const IDLE_FRAME_MS = 32; // ~30 fps while nothing is transitioning

// Resolution governor: transitions are the heaviest frames. If they average slower than
// SLOW_FRAME_MS over SLOW_SAMPLE frames, drop the canvas resolution one step (floor MIN_SCALE).
const SLOW_FRAME_MS = 55;
const SLOW_SAMPLE = 20;
const SCALE_STEP = 0.75;
const MIN_SCALE = 0.5;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uA;
uniform sampler2D uB;
uniform vec4 uCropA;   // cover-crop: scale.xy, offset.xy (see coverCrop in tmdbImage.js)
uniform vec4 uCropB;
uniform float uProgress;
uniform float uTime;
uniform float uZoomA;
uniform float uZoomB;
uniform vec2 uRes;
uniform vec2 uPointer;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v / 0.9375;
}

// frame uv -> texture uv: zoom about the centre, cover-crop, flip (ImageBitmaps are top-down),
// then mirror-repeat so warping near an edge never smears a single pixel row.
vec3 tex(sampler2D t, vec2 uv, vec4 crop, float zoom) {
  uv = (uv - 0.5) / zoom + 0.5;
  uv = uv * crop.xy + crop.zw;
  uv.y = 1.0 - uv.y;
  uv = 1.0 - abs(mod(uv, 2.0) - 1.0);
  return texture2D(t, uv).rgb;
}

void main() {
  vec2 uv = vUv + (uPointer - 0.5) * 0.012;
  vec3 col;

  if (uProgress <= 0.0) {
    col = tex(uA, uv, uCropA, uZoomA);
  } else if (uProgress >= 1.0) {
    col = tex(uB, uv, uCropB, uZoomB);
  } else {
    float asp = uRes.x / uRes.y;
    vec2 p = vec2(vUv.x * asp, vUv.y) * 2.4;
    float drift = uTime * 0.05;
    float n = smoothstep(0.2, 0.8, fbm(p + vec2(drift, -drift)));
    vec2 d = vec2(fbm(p * 0.8 + vec2(5.2, 1.3)), fbm(p * 0.8 + vec2(1.7, 9.2))) - 0.5;

    float w = 0.16;                                   // softness of the dissolve edge
    float t = uProgress * (1.0 + 2.0 * w) - w;        // threshold sweeps just past 0..1
    float m = 1.0 - smoothstep(t - w, t + w, n);      // 0 = still A, 1 = fully B
    float band = 4.0 * m * (1.0 - m);                 // peaks on the dissolving edge

    vec2 wA = d * (0.14 * uProgress + 0.06 * band);
    vec2 wB = -d * (0.14 * (1.0 - uProgress) + 0.06 * band);
    vec2 ca = vec2(0.006 * band, 0.0);                // chromatic split, only on the edge

    vec3 a = vec3(tex(uA, uv + wA + ca, uCropA, uZoomA).r,
                  tex(uA, uv + wA,      uCropA, uZoomA).g,
                  tex(uA, uv + wA - ca, uCropA, uZoomA).b);
    vec3 b = vec3(tex(uB, uv + wB + ca, uCropB, uZoomB).r,
                  tex(uB, uv + wB,      uCropB, uZoomB).g,
                  tex(uB, uv + wB - ca, uCropB, uZoomB).b);
    col = mix(a, b, m);
    col += band * vec3(0.80, 0.58, 0.20) * 0.22;      // brass light along the edge
  }

  // Grade toward the site palette: slight desaturation, darks lifted to wine-black, vignette.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.86);
  col = mix(col, vec3(0.082, 0.039, 0.063), 0.16 * (1.0 - l));
  float v = smoothstep(1.0, 0.25, length(vUv - 0.5) * 1.2);
  col *= mix(0.6, 1.0, v);

  gl_FragColor = vec4(col, 1.0);
}`;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[MorphRenderer] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = vs && compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    return null;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[MorphRenderer] program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  return { program, shaders: [vs, fs] };
}

export function createMorphRenderer(
  canvas,
  { sources, onFirstFrame, onFail, maxDpr = 1.5, duration = 1600 } = {}
) {
  if (!canvas || !sources?.length) return null;

  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const built = buildProgram(gl);
  if (!built) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
  const { program, shaders } = built;
  gl.useProgram(program);

  // One full-screen triangle strip.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const loc = {};
  for (const name of [
    'uA',
    'uB',
    'uCropA',
    'uCropB',
    'uProgress',
    'uTime',
    'uZoomA',
    'uZoomB',
    'uRes',
    'uPointer',
  ]) {
    loc[name] = gl.getUniformLocation(program, name);
  }

  const startedAt = performance.now();
  const textures = new Array(sources.length).fill(null);
  let crops = sources.map(() => [1, 1, 0, 0]);

  const state = {
    current: 0,
    anim: null, // { from, to, start, duration }
    shownAt: startedAt, // when `current` started to be shown (drives its Ken Burns zoom)
    prevShownAt: startedAt,
    manual: null, // { a, b, p } while scrubbing
    active: false,
    raf: 0,
    lastDraw: 0,
    px: 0.5,
    py: 0.5,
    tx: 0.5,
    ty: 0.5, // eased / target pointer
    firstFrame: false,
    destroyed: false,
    failed: false,
    scale: 1, // resolution multiplier, lowered by the governor on slow hardware
    lastAnimFrame: 0,
    slowSum: 0,
    slowN: 0,
  };

  function fail(reason) {
    if (state.failed || state.destroyed) return;
    state.failed = true;
    stopLoop();
    onFail?.(reason);
  }

  // Textures are created on first use and kept, so each image is uploaded at most once.
  function textureFor(i) {
    if (textures[i]) return textures[i];
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // ignored for ImageBitmap; the shader flips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // NPOT-safe (WebGL1)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sources[i].source);
    } catch (err) {
      // SecurityError (tainted image) or a closed ImageBitmap — nothing we can draw.
      gl.deleteTexture(tex);
      fail(err?.name || 'texture-upload');
      return null;
    }
    textures[i] = tex;
    return tex;
  }

  function draw(now) {
    if (state.destroyed || state.failed || gl.isContextLost()) return;

    let a = state.current;
    let b = state.current;
    let p = 0;
    let aShown = state.shownAt;
    let bShown = state.shownAt;

    if (state.manual) {
      ({ a, b, p } = state.manual);
    } else if (state.anim) {
      const t = (now - state.anim.start) / state.anim.duration;
      if (t >= 1) {
        state.current = state.anim.to;
        state.shownAt = state.anim.start; // its zoom has been running since it began to appear
        state.anim = null;
        a = b = state.current;
        aShown = bShown = state.shownAt;
      } else {
        a = state.anim.from;
        b = state.anim.to;
        p = easeInOutCubic(clamp01(t));
        aShown = state.prevShownAt;
        bShown = state.anim.start;
      }
    }

    const texA = textureFor(a);
    const texB = b === a ? texA : textureFor(b);
    if (!texA || !texB) return;

    state.px += (state.tx - state.px) * 0.06;
    state.py += (state.ty - state.py) * 0.06;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(loc.uA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(loc.uB, 1);

    gl.uniform4fv(loc.uCropA, crops[a]);
    gl.uniform4fv(loc.uCropB, crops[b]);
    gl.uniform1f(loc.uProgress, p);
    gl.uniform1f(loc.uTime, (now - startedAt) / 1000);
    gl.uniform1f(loc.uZoomA, ZOOM_BASE + ZOOM_RANGE * clamp01((now - aShown) / DWELL_MS));
    gl.uniform1f(loc.uZoomB, ZOOM_BASE + ZOOM_RANGE * clamp01((now - bShown) / DWELL_MS));
    gl.uniform2f(loc.uRes, canvas.width, canvas.height);
    gl.uniform2f(loc.uPointer, state.px, 1 - state.py);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!state.firstFrame && !state.failed) {
      state.firstFrame = true;
      onFirstFrame?.();
    }
  }

  function tick(now) {
    state.raf = 0;
    if (!state.active || state.destroyed) return;
    if (state.anim || now - state.lastDraw >= IDLE_FRAME_MS) {
      draw(now);
      state.lastDraw = now;
      govern(now);
    }
    state.raf = requestAnimationFrame(tick);
  }

  // Only transition frames are sampled; a stall (tab switch, GC) of > 500 ms is ignored as an outlier.
  function govern(now) {
    if (!state.anim) {
      state.lastAnimFrame = 0;
      return;
    }
    const dt = state.lastAnimFrame ? now - state.lastAnimFrame : 0;
    state.lastAnimFrame = now;
    if (dt <= 0 || dt > 500) return;
    state.slowSum += dt;
    if (++state.slowN < SLOW_SAMPLE) return;
    const avg = state.slowSum / state.slowN;
    state.slowSum = 0;
    state.slowN = 0;
    if (avg > SLOW_FRAME_MS && state.scale > MIN_SCALE) {
      state.scale = Math.max(MIN_SCALE, state.scale * SCALE_STEP);
      resize();
    }
  }

  function stopLoop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  const drawNow = () => draw(performance.now());

  function onContextLost(e) {
    e.preventDefault(); // lets the browser keep the context restorable; we fall back instead
    fail('context-lost');
  }
  canvas.addEventListener('webglcontextlost', onContextLost);

  function resize() {
    if (state.destroyed || state.failed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * state.scale;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    const frameAspect = w / h;
    crops = sources.map((s) => {
      const c = coverCrop(s.width / s.height, frameAspect);
      return [c.scaleX, c.scaleY, c.offsetX, c.offsetY];
    });
    if (!state.active) drawNow();
  }

  const api = {
    /** Morph to image `index`. `instant` (or an inactive renderer) jumps without animating. */
    goTo(index, { instant = false } = {}) {
      if (state.destroyed || state.failed) return;
      const target = Math.max(0, Math.min(sources.length - 1, index | 0));
      const now = performance.now();
      const settled = state.anim ? state.anim.to : state.current;
      if (target === settled) return; // already there, or already on its way
      if (instant || !state.active) {
        state.anim = null;
        state.current = target;
        state.prevShownAt = state.shownAt = now;
        drawNow();
        return;
      }
      // A transition already in flight completes instantly, then the new one starts from there.
      if (state.anim) {
        state.current = state.anim.to;
        state.shownAt = state.anim.start;
        state.anim = null;
      }
      state.prevShownAt = state.shownAt;
      state.anim = { from: state.current, to: target, start: now, duration };
    },

    /** Run (or pause) the render loop. Pause it whenever the canvas is off-screen / tab hidden. */
    setActive(active) {
      if (state.destroyed || state.failed || active === state.active) return;
      state.active = active;
      state.lastAnimFrame = 0;
      if (active) {
        state.lastDraw = 0;
        if (!state.raf) state.raf = requestAnimationFrame(tick);
      } else {
        stopLoop();
      }
    },

    /** Current resolution multiplier (1 = full; lowered automatically on slow hardware). */
    get scale() {
      return state.scale;
    },

    /** Pointer position (0..1 in the canvas) for the subtle parallax. */
    setPointer(x, y) {
      state.tx = clamp01(x);
      state.ty = clamp01(y);
    },

    resize,

    /** Draw a fixed mid-transition frame (a → b at progress p). Pass null to resume normal state. */
    scrub(a, b, p) {
      state.manual = a == null ? null : { a, b, p };
      drawNow();
    },

    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      stopLoop();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (!gl.isContextLost()) {
        for (const t of textures) if (t) gl.deleteTexture(t);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        for (const s of shaders) gl.deleteShader(s);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // free the GPU context immediately
    },
  };

  resize();
  drawNow(); // first frame right away, even before the loop is activated
  if (state.failed) {
    api.destroy(); // e.g. the very first texture upload threw: don't leak the GL context
    return null;
  }
  return api;
}
