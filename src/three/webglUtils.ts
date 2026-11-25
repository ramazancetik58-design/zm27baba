import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GRASS_RUNOFF_X,
  GRASS_RUNOFF_Z,
  PITCH_L,
  PITCH_W,
  TURF_MESH_L,
  TURF_MESH_W,
} from './pitchConstants';

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Basic Render|Software Rasterizer/i.test(gpu);
  } catch {
    return true;
  }
}

export function createStudioRenderer(container: HTMLElement, isSoftwareGl: boolean): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

export function applyStudioEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.16;
  pmremGenerator.dispose();
  return envTex;
}

export function afterDraw(renderer: THREE.WebGLRenderer, cb: () => void, setTimer: (id: number) => void) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (!gl || typeof gl.fenceSync !== 'function') {
    setTimer(window.setTimeout(cb, 25));
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (state === gl.UNSIGNALED) {
      setTimer(window.setTimeout(poll, 5));
    } else {
      if (sync) gl.deleteSync(sync);
      setTimer(window.setTimeout(cb, 25));
    }
  };
  setTimer(window.setTimeout(poll, 5));
}

/**
 * Generates high-resolution 2048x2048 PBR striped stadium turf color, blade bump,
 * and alternating mowed roughness textures aligned to FIFA 68x105m markings inside 74x113m turf.
 */
export function createPitchTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 2048;
  const h = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rctx = roughCanvas.getContext('2d')!;

  // Exact runoff mapping so playable touchlines match [-34..34] x [-52.5..52.5]
  const padX = ((GRASS_RUNOFF_X / 2) / TURF_MESH_W) * w;
  const padY = ((GRASS_RUNOFF_Z / 2) / TURF_MESH_L) * h;
  const pw = w - padX * 2;
  const ph = h - padY * 2;

  // Base deep lush night-stadium emerald surround
  ctx.fillStyle = '#092e15';
  ctx.fillRect(0, 0, w, h);

  // Mowed grass alternating cross-stripes across pitch length (20 crisp bands)
  const stripes = 20;
  const stripeH = ph / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0c3b1b' : '#114d24';
    ctx.fillRect(0, padY + i * stripeH, w, stripeH + 1);

    const rStripeH = 512 * (ph / h) / stripes;
    const rPadY = 512 * (padY / h);
    // Alternating roughness creates realistic floodlight turf nap reflection!
    rctx.fillStyle = i % 2 === 0 ? '#e0e0e0' : '#a8a8a8';
    rctx.fillRect(0, rPadY + i * rStripeH, 512, rStripeH + 1);
  }

  // Subtle cross-hatch mowing grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
  const vStripes = 12;
  const vW = pw / vStripes;
  for (let i = 0; i < vStripes; i += 2) {
    ctx.fillRect(padX + i * vW, padY, vW, ph);
  }

  // Subtle worn turf around goalmouths and center spot
  const drawWear = (cx: number, cy: number, rx: number, ry: number) => {
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(84, 72, 38, 0.24)');
    grad.addColorStop(1, 'rgba(84, 72, 38, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  drawWear(w / 2, h / 2, 34, 34);
  drawWear(w / 2, padY + 26, 76, 30);
  drawWear(w / 2, h - padY - 26, 76, 30);

  // Dense organic micro grass blades noise
  for (let i = 0; i < 95000; i++) {
    const x = (i * 131 + Math.floor(i / 410) * 37) % w;
    const y = (i * 257 + Math.floor(i / 290) * 53) % h;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(134,239,172,0.055)' : 'rgba(2,14,6,0.11)';
    ctx.fillRect(x, y, 2, 5);
  }

  // Exact FIFA markings scaled from meters -> canvas pixels
  const mx = (meters: number) => (meters / PITCH_W) * pw;
  const mz = (meters: number) => (meters / PITCH_L) * ph;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.lineWidth = 6.5;

  // Touchlines & Goal Lines
  ctx.strokeRect(padX, padY, pw, ph);

  // Halfway Line
  ctx.beginPath();
  ctx.moveTo(padX, h / 2);
  ctx.lineTo(w - padX, h / 2);
  ctx.stroke();

  // Center Circle (radius 9.15m) & Center Spot
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, mx(9.15), mz(9.15), 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty Boxes (40.32m x 16.5m) & 6-Yard Goal Areas (18.32m x 5.5m)
  const penW = mx(40.32);
  const penH = mz(16.5);
  const sixW = mx(18.32);
  const sixH = mz(5.5);
  const spotDist = mz(11);

  // -Z end (top of canvas)
  ctx.strokeRect((w - penW) / 2, padY, penW, penH);
  ctx.strokeRect((w - sixW) / 2, padY, sixW, sixH);
  ctx.beginPath();
  ctx.arc(w / 2, padY + spotDist, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2, padY + spotDist, mx(9.15), mz(9.15), 0, 0.21 * Math.PI, 0.79 * Math.PI);
  ctx.stroke();

  // +Z end (bottom of canvas)
  ctx.strokeRect((w - penW) / 2, h - padY - penH, penW, penH);
  ctx.strokeRect((w - sixW) / 2, h - padY - sixH, sixW, sixH);
  ctx.beginPath();
  ctx.arc(w / 2, h - padY - spotDist, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2, h - padY - spotDist, mx(9.15), mz(9.15), 0, 1.21 * Math.PI, 1.79 * Math.PI);
  ctx.stroke();

  // Corner Arcs
  const crx = mx(1.5);
  const cry = mz(1.5);
  [
    [padX, padY, 0, Math.PI * 0.5],
    [w - padX, padY, Math.PI * 0.5, Math.PI],
    [w - padX, h - padY, Math.PI, Math.PI * 1.5],
    [padX, h - padY, Math.PI * 1.5, Math.PI * 2],
  ].forEach(([cx, cy, s, e]) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, crx, cry, 0, s, e);
    ctx.stroke();
  });

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  // High-frequency tiled turf blade bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24000; i++) {
    const x = (i * 53) % 512;
    const y = (i * 97) % 512;
    const v = 82 + ((i * 31) % 108);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 4);
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(16, 24);

  return { map, bumpMap, roughnessMap };
}

/**
 * Generates high-resolution 512x512 procedural human face texture mapped onto SphereGeometry(phiStart = -PI/2),
 * placing facial features directly at +Z (u = 0.5), ears at u = 0.25/0.75, and scalp/neck blending seamlessly.
 */
export function createPlayerFaceTexture(
  skinToneHex: string,
  hairColorHex: string,
  facialHair: 'NONE' | 'STUBBLE' | 'BEARD' | 'GOATEE',
  seed: number,
): THREE.CanvasTexture {
  const s = 512;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(skinToneHex);
  const darkSkin = baseCol.clone().multiplyScalar(0.74);
  const midShadow = baseCol.clone().multiplyScalar(0.86);
  const warmHighlight = baseCol.clone().lerp(new THREE.Color('#ffd6c4'), 0.22);

  // Base skin tone fill
  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, s, s);

  // Side/neck ambient skin shading
  const faceGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 220);
  faceGrad.addColorStop(0, `#${warmHighlight.getHexString()}`);
  faceGrad.addColorStop(0.55, `#${baseCol.getHexString()}`);
  faceGrad.addColorStop(1, `#${midShadow.getHexString()}`);
  ctx.fillStyle = faceGrad;
  ctx.fillRect(0, 0, s, s);

  // Subtle scalp hairline shadow at top & back (-Z near edges u=0, u=1)
  const hairCol = new THREE.Color(hairColorHex);
  ctx.fillStyle = `#${hairCol.clone().multiplyScalar(0.82).getHexString()}`;
  ctx.fillRect(0, 0, s, 110);
  // Back of head hair band wraps cleanly across u = 0..0.22 and u = 0.78..1.0
  ctx.fillRect(0, 88, 120, 175);
  ctx.fillRect(s - 120, 88, 120, 175);

  // Subtle cheekbone warmth / skin tone realism
  ctx.fillStyle = 'rgba(205, 92, 92, 0.14)';
  ctx.beginPath();
  ctx.ellipse(210, 294, 24, 15, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(302, 294, 24, 15, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Jawline & chin shadow contour
  ctx.strokeStyle = `rgba(${Math.round(darkSkin.r * 255)}, ${Math.round(darkSkin.g * 255)}, ${Math.round(darkSkin.b * 255)}, 0.44)`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 282, 102, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  // Eye socket soft shading
  [222, 290].forEach((ex) => {
    const sg = ctx.createRadialGradient(ex, 250, 4, ex, 250, 22);
    sg.addColorStop(0, 'rgba(65, 38, 25, 0.28)');
    sg.addColorStop(1, 'rgba(65, 38, 25, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(ex, 250, 22, 0, Math.PI * 2);
    ctx.fill();
  });

  // Eyebrows (varied thickness/arch by seed)
  const browStyle = seed % 3;
  ctx.strokeStyle = `#${hairCol.clone().multiplyScalar(0.68).getHexString()}`;
  ctx.lineWidth = browStyle === 0 ? 7.5 : 6;
  ctx.lineCap = 'round';
  [
    [206, 232, 238, 229 - (browStyle === 1 ? 3 : 0)],
    [274, 229 - (browStyle === 1 ? 3 : 0), 306, 232],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 4, x2, y2);
    ctx.stroke();
  });

  // Realistic Eyes (almond sclera, dark iris, pupil, specular catchlight, lash line)
  const irisPalettes = ['#3b2416', '#1e3a5f', '#2e4f34', '#4a3525'];
  const irisHex = irisPalettes[seed % irisPalettes.length];
  [222, 290].forEach((ex) => {
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.ellipse(ex, 250, 14, 7.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = irisHex;
    ctx.beginPath();
    ctx.arc(ex, 250, 6.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090d14';
    ctx.beginPath();
    ctx.arc(ex, 250, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 1.8, 248.2, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(30, 18, 12, 0.75)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(ex, 249.5, 14.5, 7.8, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  });

  // Nose bridge highlight + tip shadow + nostrils
  ctx.fillStyle = 'rgba(255, 240, 232, 0.25)';
  ctx.beginPath();
  ctx.ellipse(256, 276, 4.5, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(85, 48, 32, 0.26)';
  ctx.beginPath();
  ctx.ellipse(256, 296, 13, 6.5, 0, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = 'rgba(40, 20, 14, 0.58)';
  ctx.beginPath();
  ctx.ellipse(249, 297, 3.2, 2.1, 0.2, 0, Math.PI * 2);
  ctx.ellipse(263, 297, 3.2, 2.1, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Facial hair / Stubble / Beard shading painted cleanly into jawline & upper lip
  if (facialHair !== 'NONE') {
    const hR = Math.round(hairCol.r * 255);
    const hG = Math.round(hairCol.g * 255);
    const hB = Math.round(hairCol.b * 255);
    const alpha = facialHair === 'STUBBLE' ? 0.28 : 0.78;
    ctx.fillStyle = `rgba(${hR}, ${hG}, ${hB}, ${alpha})`;
    if (facialHair === 'GOATEE') {
      ctx.beginPath();
      ctx.ellipse(256, 334, 24, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(186, 296);
      ctx.quadraticCurveTo(212, 365, 256, 375);
      ctx.quadraticCurveTo(300, 365, 326, 296);
      ctx.quadraticCurveTo(306, 340, 256, 344);
      ctx.quadraticCurveTo(206, 340, 186, 296);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(235, 306, 42, 8);
    }
  }

  // Lips
  ctx.fillStyle = 'rgba(155, 76, 72, 0.8)';
  ctx.beginPath();
  ctx.moveTo(238, 320);
  ctx.quadraticCurveTo(256, 315, 274, 320);
  ctx.quadraticCurveTo(256, 330, 238, 320);
  ctx.fill();

  ctx.strokeStyle = 'rgba(72, 32, 32, 0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(239, 320);
  ctx.quadraticCurveTo(256, 322, 273, 320);
  ctx.stroke();

  // Ears at u = 0.25 (x = 128) and u = 0.75 (x = 384)
  [132, 380].forEach((earX) => {
    ctx.fillStyle = `#${midShadow.getHexString()}`;
    ctx.beginPath();
    ctx.ellipse(earX, 266, 11, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 35, 22, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(earX, 266, 7, 0.3, Math.PI * 1.6);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates dark tiered stadium seat-step texture for concrete stand bowls.
 */
export function createBowlSeatRowsTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09121d';
  ctx.fillRect(0, 0, w, h);

  // Horizontal concrete step shadows + dark navy stadium seats
  for (let y = 0; y < h; y += 16) {
    ctx.fillStyle = '#112031';
    ctx.fillRect(0, y, w, 7);
    ctx.fillStyle = '#060c14';
    ctx.fillRect(0, y + 7, w, 3);
    for (let x = 2; x < w; x += 12) {
      ctx.fillStyle = (x + y) % 24 === 0 ? '#16293d' : '#0f1e2e';
      ctx.fillRect(x, y + 1, 9, 5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

/**
 * Generates 512x512 jersey texture with fabric texture, collar, shoulder bands,
 * club stripe motif, front crest accent (at u = 0.75) and crisp squad number on back (u = 0.25)
 * aligned to LatheGeometry(phiStart = PI * 0.5).
 */
export function createKitTexture(
  primaryHex: string,
  secondaryHex: string,
  accentHex: string,
  squadNumber: number,
  clubShort: string,
  patternSeed: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical jersey pattern (stripes / sash / collar)
  const mode = patternSeed % 3;
  if (mode === 0) {
    // Classic vertical stripes
    ctx.fillStyle = secondaryHex;
    ctx.globalAlpha = 0.85;
    for (let x = 32; x < w; x += 64) {
      ctx.fillRect(x, 0, 26, h);
    }
    ctx.globalAlpha = 1;
  } else if (mode === 1) {
    // Modern chest band & shoulder trim
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 145, w, 58);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 138, w, 8);
    ctx.fillRect(0, 202, w, 8);
  } else {
    // Side athletic panels
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 0, 42, h);
    ctx.fillRect(w - 42, 0, 42, h);
    ctx.fillRect(236, 0, 40, h);
  }

  // Woven breathable mesh fabric dots
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let y = 0; y < h; y += 8) {
    for (let x = (y % 16 === 0 ? 0 : 4); x < w; x += 8) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Collar band at top (v = 1 -> y = 0..46)
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 36, w, 7);

  // Determine high-contrast text color against kit primary/secondary
  const colLum = new THREE.Color(primaryHex);
  const lum = 0.299 * colLum.r + 0.587 * colLum.g + 0.114 * colLum.b;
  const numFill = lum > 0.62 ? '#0f172a' : '#f8fafc';
  const numStroke = lum > 0.62 ? '#f8fafc' : '#080d11';

  // Back of torso centered at u = 0.25 -> x = 128
  ctx.save();
  ctx.fillStyle = numFill;
  ctx.strokeStyle = numStroke;
  ctx.lineWidth = 8;
  ctx.font = '900 132px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numStr = String(squadNumber);
  ctx.strokeText(numStr, 128, 250);
  ctx.fillText(numStr, 128, 250);

  // Micro club/player tag above back number
  ctx.font = '800 26px "Chakra Petch", sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeText(clubShort.slice(0, 4), 128, 134);
  ctx.fillText(clubShort.slice(0, 4), 128, 134);
  ctx.restore();

  // Front of torso centered at u = 0.75 -> x = 384 (club crest badge + sponsor bar)
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(412, 138, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = numFill;
  ctx.font = '800 28px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ZEPHYR', 384, 232);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates high-resolution 512x512 2D spectator cluster texture (3 realistic shoulder-to-shoulder
 * fans with varied poses, scarves, natural skin heads/hair, and vivid shaded team jerseys).
 */
export function createCrowdSpectatorTexture(
  jerseyPrimary: string,
  jerseySecondary: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const skins = ['#f1c29b', '#dca378', '#c68652', '#8d5524'];
  const hairs = ['#141414', '#3b2416', '#7b522c', '#d4aa62'];

  const drawFan = (cx: number, scaleY: number, skin: string, hair: string, shirt: string, pose: number) => {
    const baseY = h - 4;
    const bodyTop = baseY - 148 * scaleY;
    const headY = bodyTop - 36 * scaleY;

    // Raised cheering / clapping arms
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    if (pose === 0) {
      // Both arms raised with scarf/fist!
      ctx.beginPath();
      ctx.moveTo(cx - 42, bodyTop + 26);
      ctx.lineTo(cx - 66, headY - 22);
      ctx.moveTo(cx + 42, bodyTop + 26);
      ctx.lineTo(cx + 66, headY - 22);
      ctx.stroke();

      // Hands
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx - 68, headY - 28, 10, 0, Math.PI * 2);
      ctx.arc(cx + 68, headY - 28, 10, 0, Math.PI * 2);
      ctx.fill();

      // Stretched supporter scarf above head!
      ctx.fillStyle = jerseySecondary;
      ctx.fillRect(cx - 64, headY - 40, 128, 14);
      ctx.fillStyle = jerseyPrimary;
      ctx.fillRect(cx - 34, headY - 40, 68, 14);
    } else if (pose === 1) {
      // One arm raised cheering, one arm resting
      ctx.beginPath();
      ctx.moveTo(cx - 44, bodyTop + 28);
      ctx.lineTo(cx - 54, bodyTop + 92);
      ctx.moveTo(cx + 42, bodyTop + 24);
      ctx.lineTo(cx + 68, headY - 12);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx + 70, headY - 18, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Arms folded / applauding
      ctx.beginPath();
      ctx.moveTo(cx - 44, bodyTop + 28);
      ctx.lineTo(cx - 56, bodyTop + 96);
      ctx.moveTo(cx + 44, bodyTop + 28);
      ctx.lineTo(cx + 56, bodyTop + 96);
      ctx.stroke();
    }

    // Torso / Jacket / Jersey
    const grad = ctx.createLinearGradient(cx, bodyTop, cx, baseY);
    grad.addColorStop(0, shirt);
    grad.addColorStop(1, '#0c1118');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 54, baseY);
    ctx.lineTo(cx - 48, bodyTop + 26);
    ctx.quadraticCurveTo(cx, bodyTop - 6, cx + 48, bodyTop + 26);
    ctx.lineTo(cx + 54, baseY);
    ctx.closePath();
    ctx.fill();

    // Jersey chest stripe / scarf around neck
    ctx.fillStyle = jerseySecondary;
    ctx.fillRect(cx - 18, bodyTop + 14, 36, 78 * scaleY);

    // Neck
    ctx.fillStyle = skin;
    ctx.fillRect(cx - 11, headY + 18, 22, 24);

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, headY, 26, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair cap
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 11, 27, 22, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Subtle facial shadows (eyes + smile so close camera sees real human faces!)
    ctx.fillStyle = 'rgba(20, 14, 10, 0.72)';
    ctx.beginPath();
    ctx.arc(cx - 9, headY - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 9, headY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 42, 34, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, headY + 9, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  };

  drawFan(108, 0.96, skins[0], hairs[1], jerseyPrimary, 1);
  drawFan(256, 1.04, skins[1], hairs[0], jerseySecondary, 0);
  drawFan(404, 0.94, skins[2], hairs[2], jerseyPrimary, 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates midnight stadium sky dome texture with deep indigo horizon glow + subtle starfield.
 */
export function createNightSkyDomeTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#02050c');
  grad.addColorStop(0.55, '#071122');
  grad.addColorStop(0.84, '#10243d');
  grad.addColorStop(1, '#09131e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle stars in upper hemisphere
  for (let i = 0; i < 420; i++) {
    const x = (i * 197 + Math.floor(i / 17) * 43) % w;
    const y = (i * 89 + Math.floor(i / 23) * 31) % Math.floor(h * 0.65);
    const alpha = 0.18 + ((i * 29) % 55) / 100;
    ctx.fillStyle = `rgba(226, 240, 255, ${alpha})`;
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1.3, i % 5 === 0 ? 2 : 1.3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates true spherical truncated-icosahedron (classic 12-pentagon / 20-hexagon)
 * leather match football albedo + stitched seam bump textures without equirectangular distortion.
 */
export function createFootballTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bctx = bumpCanvas.getContext('2d')!;

  const img = ctx.createImageData(w, h);
  const bumpImg = bctx.createImageData(w, h);
  const data = img.data;
  const bdata = bumpImg.data;

  const phi = (1 + Math.sqrt(5)) / 2;
  const rawVerts: Array<[number, number, number]> = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];
  const pentCenters = rawVerts.map(([vx, vy, vz]) => {
    const len = Math.hypot(vx, vy, vz);
    return [vx / len, vy / len, vz / len] as [number, number, number];
  });

  const faces: Array<[number, number, number]> = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const hexCenters = faces.map(([a, b, c]) => {
    const sx = pentCenters[a][0] + pentCenters[b][0] + pentCenters[c][0];
    const sy = pentCenters[a][1] + pentCenters[b][1] + pentCenters[c][1];
    const sz = pentCenters[a][2] + pentCenters[b][2] + pentCenters[c][2];
    const len = Math.hypot(sx, sy, sz);
    return [sx / len, sy / len, sz / len] as [number, number, number];
  });

  for (let py = 0; py < h; py++) {
    const theta = (py / h) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let px = 0; px < w; px++) {
      const lam = (px / w) * Math.PI * 2;
      const x = sinT * Math.cos(lam);
      const y = cosT;
      const z = sinT * Math.sin(lam);

      let d1 = 99;
      let d2 = 99;
      let nearestIsPent = false;

      for (let i = 0; i < 12; i++) {
        const dot = x * pentCenters[i][0] + y * pentCenters[i][1] + z * pentCenters[i][2];
        const ang = Math.acos(Math.max(-1, Math.min(1, dot))) * 1.09;
        if (ang < d1) {
          d2 = d1;
          d1 = ang;
          nearestIsPent = true;
        } else if (ang < d2) {
          d2 = ang;
        }
      }
      for (let i = 0; i < 20; i++) {
        const dot = x * hexCenters[i][0] + y * hexCenters[i][1] + z * hexCenters[i][2];
        const ang = Math.acos(Math.max(-1, Math.min(1, dot))) * 0.94;
        if (ang < d1) {
          d2 = d1;
          d1 = ang;
          nearestIsPent = false;
        } else if (ang < d2) {
          d2 = ang;
        }
      }

      const seamDist = d2 - d1;
      const idx = (py * w + px) * 4;
      const grain = (((px * 73 + py * 139) % 17) - 8) * 1.1;

      if (seamDist < 0.022) {
        data[idx] = 28;
        data[idx + 1] = 36;
        data[idx + 2] = 44;
        data[idx + 3] = 255;
        bdata[idx] = 35;
        bdata[idx + 1] = 35;
        bdata[idx + 2] = 35;
        bdata[idx + 3] = 255;
      } else if (nearestIsPent) {
        const isTrim = seamDist < 0.036;
        data[idx] = isTrim ? 18 : Math.max(12, Math.min(40, 22 + grain));
        data[idx + 1] = isTrim ? 168 : Math.max(14, Math.min(44, 28 + grain));
        data[idx + 2] = isTrim ? 195 : Math.max(20, Math.min(54, 42 + grain));
        data[idx + 3] = 255;
        bdata[idx] = 195;
        bdata[idx + 1] = 195;
        bdata[idx + 2] = 195;
        bdata[idx + 3] = 255;
      } else {
        const v = Math.max(215, Math.min(252, 240 + grain));
        data[idx] = v;
        data[idx + 1] = v + 2;
        data[idx + 2] = Math.min(255, v + 4);
        data[idx + 3] = 255;
        bdata[idx] = 212;
        bdata[idx + 1] = 212;
        bdata[idx + 2] = 212;
        bdata[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bumpImg, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  return { map, bumpMap };
}

/**
 * Generates crisp woven diamond nylon goal net texture with alpha transparency.
 */
export function createGoalNetTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
  ctx.lineWidth = 2.6;
  const step = 16;
  for (let i = -size; i <= size * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - size, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(11, 5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates crisp perimeter LED advertising board texture.
 */
export function createLedBoardTexture(
  homeShort: string,
  awayShort: string,
  competitionId?: 'LEAGUE' | 'UCL' | 'UEL' | 'UECL' | 'UNL'
): THREE.CanvasTexture {
  const w = 1024;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palette =
    competitionId === 'UCL'
      ? { bg: '#071436', top: '#3b82f6', bottom: '#e0f2fe', text: '#ffffff', tag: 'UEFA CHAMPIONS LEAGUE' }
      : competitionId === 'UEL'
        ? { bg: '#1e0e04', top: '#f97316', bottom: '#fbbf24', text: '#fff7ed', tag: 'UEFA EUROPA LEAGUE' }
        : competitionId === 'UECL'
          ? { bg: '#041f16', top: '#10b981', bottom: '#6ee7b7', text: '#ecfdf5', tag: 'UEFA CONFERENCE LEAGUE' }
          : competitionId === 'UNL'
            ? { bg: '#051a2e', top: '#06b6d4', bottom: '#facc15', text: '#f0f9ff', tag: 'UEFA NATIONS LEAGUE' }
            : { bg: '#07111d', top: '#00e5ff', bottom: '#b7ff4a', text: '#ffffff', tag: 'NIGHT STADIUM EDITION' };

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);

  if (competitionId === 'UCL') {
    // Twinkling Champions League night stars across LED banner
    ctx.fillStyle = 'rgba(147, 197, 253, 0.25)';
    for (let sx = 40; sx < w; sx += 96) {
      ctx.beginPath();
      ctx.arc(sx, 26 + ((sx * 7) % 44), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = palette.top;
  ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = palette.bottom;
  ctx.fillRect(0, h - 6, w, 6);

  ctx.font = '800 32px "Chakra Petch", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.text;
  ctx.fillText(`★ ${palette.tag}  •  ${homeShort} vs ${awayShort}  •  ZEPHYR 27 ★`, 28, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(5, 1);
  return tex;
}

/**
 * Generates mid-bowl 360-degree LED hospitality ribbon banner texture.
 */
export function createRibbonLedTexture(
  homeName: string,
  awayName: string,
  homeColor: string,
  competitionId?: 'LEAGUE' | 'UCL' | 'UEL' | 'UECL' | 'UNL'
): THREE.CanvasTexture {
  const w = 1024;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const compBanner =
    competitionId === 'UCL'
      ? { bg: '#07163b', trim: '#60a5fa', label: 'UEFA CHAMPIONS LEAGUE NIGHT' }
      : competitionId === 'UEL'
        ? { bg: '#210e03', trim: '#f97316', label: 'UEFA EUROPA LEAGUE NIGHT' }
        : competitionId === 'UECL'
          ? { bg: '#032016', trim: '#10b981', label: 'UEFA CONFERENCE LEAGUE' }
          : competitionId === 'UNL'
            ? { bg: '#051b2c', trim: '#22d3ee', label: 'UEFA NATIONS LEAGUE ARENA' }
            : { bg: '#040a14', trim: '#00e5ff', label: 'ZEPHYR 27 CHAMPIONS NIGHT' };

  ctx.fillStyle = compBanner.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = competitionId && competitionId !== 'LEAGUE' ? compBanner.trim : homeColor;
  ctx.fillRect(0, 0, w, 5);
  ctx.fillStyle = compBanner.trim;
  ctx.fillRect(0, h - 5, w, 5);

  ctx.font = '800 25px "Chakra Petch", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(
    `★ ${homeName.toUpperCase()}  •  ${compBanner.label}  •  ${awayName.toUpperCase()} ★`,
    24,
    h / 2
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

