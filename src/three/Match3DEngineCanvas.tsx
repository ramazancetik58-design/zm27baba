import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../engine/audio';
import { createRng } from '../engine/rng';
import { shotModifiers } from '../engine/matchEngine';
import type { PlayerMatchStats, ShotRecord } from '../engine/matchAnalysis';
import { AutoDirector, DEFAULT_CAMERA_SETTINGS, applyDistance, cameraRig, lookRate, posRate, type CameraSettings } from './cameraDirector';
import { PERF_TIERS, PerfGovernor, qualityToTier } from './perfGovernor';
import { ACTOR_FLOATS, HEADER_FLOATS, ReplayBuffer, sampleClip, type ReplayClip } from './replayBuffer';
import {
  KICK_DUR, REST, angleDiff, approachPose, celebrateTarget, clonePose, dampAngle, diveTarget, gaitTarget,
  arrayToPose, poseToArray, groundOffset, headerTarget, idleTarget, kickTarget, limpTarget, styleFromSeed, tackleTarget, type GaitStyle, type Pose, type Target,
} from './humanoidPose';
import {
  calculateTacticalStrength,
  getClubDisplayName,
  getClubShortName,
  getPlayerDisplayName,
} from '../engine/hardcoreRules';
import {
  CameraAngle,
  Club,
  CompetitionId,
  GraphicsQuality,
  LicenseMode,
  MatchEventLog,
  Player,
  TacticsConfig,
} from '../engine/types';
import {
  buildArticulatedHumanoid,
  createSharedHumanoidGeometries,
  HumanoidGltfController,
  HumanoidGltfRigHandle,
  type ArticulatedHumanoidParts,
} from './humanoidBuilder';
import {
  BALL_RADIUS,
  HALF_PITCH_L,
  HALF_PITCH_W,
  PITCH_L,
  PITCH_W,
  TURF_MESH_L,
  TURF_MESH_W,
} from './pitchConstants';
import { buildColossalNightStadium } from './stadiumBuilder';
import {
  afterDraw,
  applyStudioEnvironment,
  createFootballTextures,
  createKitTexture,
  createPitchTextures,
  createPlayerFaceTexture,
  createStudioRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

export interface LiveMatchSnapshot {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  phase: 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME';
  bannerText: string | null;
  events: MatchEventLog[];
  playerConditions: Record<string, number>;
  injuredIds: string[];
  yellowCardIds: string[];
  /** Oyuncu bazlı maç istatistikleri ve şut kaydı (maç analizi için). */
  playerStats?: PlayerMatchStats[];
  shots?: ShotRecord[];
  /** -1 (deplasman) … +1 (ev sahibi). */
  momentum?: number;
  homePpda?: number;
  awayPpda?: number;
}

export interface Live2DTelemetry {
  ball: { x: number; y: number; z: number };
  actors: Array<{
    x: number;
    z: number;
    team: 'HOME' | 'AWAY';
    role: string;
    name: string;
    hasBall: boolean;
    condition: number;
  }>;
  referee: { x: number; z: number };
  homeColor: string;
  awayColor: string;
  homeShort: string;
  awayShort: string;
}

interface Match3DEngineCanvasProps {
  /** Maç tohumu: aynı tohum + aynı kadro = aynı karar dizisi. */
  matchSeed?: string;
  homeClub: Club;
  awayClub: Club;
  myClubId: string;
  homeTactics: TacticsConfig;
  awayTactics: TacticsConfig;
  licenseMode: LicenseMode;
  cameraAngle: CameraAngle;
  cameraSettings?: CameraSettings;
  speedMultiplier: 1 | 2 | 4;
  paused: boolean;
  crowdDensity: 'HIGH' | 'MEDIUM';
  graphicsQuality?: GraphicsQuality;
  showPlayerNamesIn3D: boolean;
  preMatchBoost: number;
  halfTimeBoost: number;
  competitionId?: CompetitionId;
  gltfModelUrl?: string;
  liveTelemetryRef?: React.MutableRefObject<Live2DTelemetry | null>;
  onHalfTimeReached: () => void;
  onUpdateSnapshot: (snap: LiveMatchSnapshot) => void;
  onFinishMatch: (finalSnap: LiveMatchSnapshot) => void;
}

// Pre-allocated scratch math objects (Zero GC inside render loop)
const _v1 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _camLookSmooth = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _spinAxis = new THREE.Vector3();
const _spinQuat = new THREE.Quaternion();

interface SimActor {
  slotIndex: number;
  playerId: string;
  name: string;
  team: 'HOME' | 'AWAY';
  role: string;
  ovr: number;
  squadNumber: number;
  baseX: number;
  baseZ: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  stridePhase: number;
  kickTimer: number;
  diveTimer: number;
  diveDir: number;
  tackleTimer: number;
  headerTimer: number;
  celebrateTimer: number;
  celebrateStyle: 'KNEE_SLIDE' | 'ARM_JUMP';
  condition: number;
  injured: boolean;
  yellowCard: boolean;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  armLPivot: THREE.Group;
  armRPivot: THREE.Group;
  thighLPivot: THREE.Group;
  thighRPivot: THREE.Group;
  calfLPivot: THREE.Group;
  calfRPivot: THREE.Group;
  spinePivot?: THREE.Group;
  foreLPivot?: THREE.Group;
  foreRPivot?: THREE.Group;
  headPivot?: THREE.Group;
  /** Sönümlenmiş anlık poz (eklem açıları) ve zemin yüksekliği. */
  pose: Pose;
  groundY: number;
  animT: number;
  style: GaitStyle;
  carrierRing: THREE.Mesh;
  headMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshStandardMaterial;
  torsoMat: THREE.MeshStandardMaterial;
  hairMesh: THREE.Mesh;
  nameSprite: THREE.Sprite;
  gltfRig?: HumanoidGltfRigHandle;
}

type PosableRig = Pick<
  ArticulatedHumanoidParts,
  'bodyGroup' | 'armLPivot' | 'armRPivot' | 'thighLPivot' | 'thighRPivot' | 'calfLPivot' | 'calfRPivot' | 'spinePivot' | 'foreLPivot' | 'foreRPivot' | 'headPivot'
>;

/** Anatomik pozu rig eklemlerine yazar (işaret kuralları için bkz. humanoidPose.ts). */
function applyPoseToRig(r: PosableRig, p: Pose, groundY: number): void {
  r.bodyGroup.position.y = groundY + p.air;
  r.bodyGroup.rotation.set(p.rootPitch + (r.spinePivot ? 0 : p.lean), 0, p.rootRoll);
  r.spinePivot?.rotation.set(p.lean, p.twist, p.roll);
  r.headPivot?.rotation.set(p.headPitch, p.headYaw, 0);
  r.thighLPivot.rotation.x = -p.hipL;
  r.thighRPivot.rotation.x = -p.hipR;
  r.calfLPivot.rotation.x = p.kneeL;
  r.calfRPivot.rotation.x = p.kneeR;
  r.armLPivot.rotation.set(-p.shL, 0, -p.abdL);
  r.armRPivot.rotation.set(-p.shR, 0, p.abdR);
  if (r.foreLPivot) r.foreLPivot.rotation.x = -p.elbL;
  if (r.foreRPivot) r.foreRPivot.rotation.x = -p.elbR;
}

function createNameplateTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 52;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 52);
  ctx.fillStyle = 'rgba(8, 13, 17, 0.88)';
  ctx.beginPath();
  ctx.roundRect(12, 6, 232, 38, 10);
  ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 18), 128, 25);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Match3DEngineCanvas: React.FC<Match3DEngineCanvasProps> = ({
  matchSeed,
  homeClub,
  awayClub,
  myClubId,
  homeTactics,
  awayTactics,
  licenseMode,
  cameraAngle,
  cameraSettings,
  speedMultiplier,
  paused,
  crowdDensity,
  graphicsQuality = 'MEDIUM',
  showPlayerNamesIn3D,
  preMatchBoost,
  halfTimeBoost,
  competitionId,
  gltfModelUrl,
  liveTelemetryRef,
  onHalfTimeReached,
  onUpdateSnapshot,
  onFinishMatch,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    homeClub,
    awayClub,
    myClubId,
    homeTactics,
    awayTactics,
    licenseMode,
    cameraAngle,
    cameraSettings,
    speedMultiplier,
    paused,
    showPlayerNamesIn3D,
    preMatchBoost,
    halfTimeBoost,
    liveTelemetryRef,
    onHalfTimeReached,
    onUpdateSnapshot,
    onFinishMatch,
  });
  propsRef.current = {
    homeClub,
    awayClub,
    myClubId,
    homeTactics,
    awayTactics,
    licenseMode,
    cameraAngle,
    cameraSettings,
    speedMultiplier,
    paused,
    showPlayerNamesIn3D,
    preMatchBoost,
    halfTimeBoost,
    liveTelemetryRef,
    onHalfTimeReached,
    onUpdateSnapshot,
    onFinishMatch,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Oyun kararları (şut/gol/pas/sakatlık) için tohumlu RNG; kamera sarsıntısı gibi görsel efektler ayrı akış.
    const seedBase = `${matchSeed ?? 'nomatch'}|${homeClub.id}|${awayClub.id}`;
    const rand = createRng(seedBase);
    const vfx = createRng(`${seedBase}|vfx`);

    soundEngine.startCrowdAmbience();

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(container, isSoftwareGl);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040a14');
    scene.fog = new THREE.FogExp2('#071220', 0.0034);
    const envTex = applyStudioEnvironment(renderer, scene);

    // True TV Broadcast Telephoto Lens (FOV 36°) showing full 68x105m pitch + towering stands + roof & floodlights
    const camera = new THREE.PerspectiveCamera(
      36,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.4,
      360
    );
    camera.position.set(62, 21.8, 0);
    camera.lookAt(-3, 5.0, 0);

    // Night Stadium Floodlight Lighting Rig (Dramatic Roof & Player Shadows + Corner Mast Floodlights)
    const hemi = new THREE.HemisphereLight('#4f9cf9', '#05150b', 0.36);
    scene.add(hemi);

    const quality: GraphicsQuality = graphicsQuality;
    const maxPixelRatio = quality === 'LOW' ? 1 : quality === 'MEDIUM' ? 1.25 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));

    const primaryFlood = new THREE.DirectionalLight('#fff8eb', 2.35);
    primaryFlood.position.set(34, 82, 24);
    primaryFlood.castShadow = quality !== 'LOW';
    const shadowRes = quality === 'LOW' ? 512 : isSoftwareGl || quality === 'MEDIUM' ? 1024 : 2048;
    primaryFlood.shadow.mapSize.set(shadowRes, shadowRes);
    primaryFlood.shadow.camera.left = -78;
    primaryFlood.shadow.camera.right = 78;
    primaryFlood.shadow.camera.top = 84;
    primaryFlood.shadow.camera.bottom = -84;
    primaryFlood.shadow.camera.near = 10;
    primaryFlood.shadow.camera.far = 205;
    primaryFlood.shadow.bias = -0.0005;
    primaryFlood.shadow.normalBias = 0.025;
    scene.add(primaryFlood);

    const oppFlood = new THREE.DirectionalLight('#93c5fd', 0.98);
    oppFlood.position.set(-44, 66, -34);
    scene.add(oppFlood);

    const spotLights: THREE.SpotLight[] = [];
    // 4 Corner Tower Floodlight SpotLights (skipped on LOW mobile preset for 60 FPS)
    if (quality !== 'LOW') {
      const spotCoords: Array<[number, number, number, number]> = [
        [-62, -82, -14, -20],
        [62, -82, 14, -20],
        [-62, 82, -14, 20],
        [62, 82, 14, 20],
      ];
      spotCoords.forEach(([sx, sz, tx, tz]) => {
        const spot = new THREE.SpotLight('#fffbeb', 320, 225, 0.58, 0.78, 1.22);
        spot.position.set(sx, 55, sz);
        spot.target.position.set(tx, 0, tz);
        scene.add(spot, spot.target);
        spotLights.push(spot);
      });
    }

    // Kendini ayarlayan performans: kare süresi 60 FPS'i tutmuyorsa kalite kademeli düşer, rahatsa geri çıkar.
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const gov = new PerfGovernor({ bestTier: isSoftwareGl ? PERF_TIERS.length - 1 : qualityToTier(quality) });
    let shadowEvery = 1;
    let crowdStride = 1;
    let frameNo = 0;
    const applyTier = (tier: number) => {
      const T = PERF_TIERS[tier];
      renderer.setPixelRatio(basePixelRatio * T.pixelScale);
      primaryFlood.castShadow = quality !== 'LOW' && T.shadows;
      renderer.shadowMap.autoUpdate = T.shadowEvery === 1;
      shadowEvery = T.shadowEvery;
      crowdStride = T.crowdStride;
      spotLights.forEach((sp, i) => {
        sp.visible = i < T.spots;
      });
    };
    applyTier(gov.tier);

    // 1. High-Res PBR Mowed Grass Turf Pitch (FIFA 68x105m inside 74x113m turf)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { map: pitchMap, bumpMap: pitchBump, roughnessMap: pitchRough } = createPitchTextures(maxAniso);
    const pitchGeo = new THREE.PlaneGeometry(TURF_MESH_W, TURF_MESH_L);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: pitchMap,
      bumpMap: pitchBump,
      bumpScale: 0.06,
      roughnessMap: pitchRough,
      roughness: 0.88,
      metalness: 0.01,
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    const resolvedAwayKitHex = (() => {
      const cDist = (aHex: string, bHex: string) => {
        const ca = new THREE.Color(aHex);
        const cb = new THREE.Color(bHex);
        return Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b);
      };
      if (cDist(homeClub.primaryColor, awayClub.primaryColor) >= 0.42) {
        return awayClub.primaryColor;
      }
      if (cDist(homeClub.primaryColor, awayClub.secondaryColor) >= 0.42) {
        return awayClub.secondaryColor;
      }
      if (cDist(homeClub.primaryColor, awayClub.accentColor) >= 0.42) {
        return awayClub.accentColor;
      }
      return '#dc2626';
    })();
    const resolvedAwaySecHex =
      resolvedAwayKitHex === awayClub.secondaryColor ? awayClub.primaryColor : awayClub.secondaryColor;

    const homeDispName = getClubDisplayName(homeClub, licenseMode);
    const awayDispName = getClubDisplayName(awayClub, licenseMode);
    const homeDispShort = getClubShortName(homeClub, licenseMode);
    const awayDispShort = getClubShortName(awayClub, licenseMode);

    // 2. Colossal Two-Tier Night Stadium, Regulation Goals, Floodlight Towers & InstancedMesh Crowd
    const stadium = buildColossalNightStadium(scene, {
      homeName: homeDispName,
      awayName: awayDispName,
      homeShort: homeDispShort,
      awayShort: awayDispShort,
      homePrimary: homeClub.primaryColor,
      homeSecondary: homeClub.secondaryColor,
      awayPrimary: resolvedAwayKitHex,
      awaySecondary: resolvedAwaySecHex,
      crowdDensity,
      maxAnisotropy: maxAniso,
      competitionId,
    });

    // 3. Shared Zero-Box Anatomical Humanoid Geometries & GLTFLoader Controller
    const humanGeos = createSharedHumanoidGeometries();
    const gltfController = new HumanoidGltfController();
    const extraMaterials: THREE.Material[] = [];
    const extraTextures: THREE.Texture[] = [];

    const ringMat = new THREE.MeshBasicMaterial({ color: '#b7ff4a', side: THREE.DoubleSide });
    const gkGloveMat = new THREE.MeshStandardMaterial({ color: '#b7ff4a', roughness: 0.45 });
    const ballShadowGeo = new THREE.CircleGeometry(0.32, 16);
    ballShadowGeo.rotateX(-Math.PI / 2);
    const ballShadowMat = new THREE.MeshBasicMaterial({
      color: '#02060a',
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    });
    extraMaterials.push(ringMat, gkGloveMat, ballShadowMat);

    // Touchline Technical Area: Non-Box Anatomical Manager + 3 Warming-Up Bench Substitutes
    const managerHuman = buildArticulatedHumanoid(humanGeos, {
      kitPrimaryHex: '#0f172a',
      kitSecondaryHex: '#1e293b',
      kitAccentHex: '#00e5ff',
      shortsHex: '#0f172a',
      sockHex: '#0f172a',
      squadNumber: 0,
      clubShort: homeDispShort,
      skinToneHex: '#e5b895',
      hairColorHex: '#2c221e',
      bootColorHex: '#111827',
      hairStyle: 'SHORT',
      facialHair: 'STUBBLE',
      isGK: false,
      seed: 99,
      extraMaterials,
      extraTextures,
    });
    const managerGroup = new THREE.Group();
    managerGroup.add(managerHuman.bodyGroup);
    managerGroup.position.set(HALF_PITCH_W + 2.4, 0, -9.5);
    managerGroup.rotation.y = -Math.PI / 2;
    scene.add(managerGroup);

    const warmupSubs: Array<{
      group: THREE.Group;
      parts: ReturnType<typeof buildArticulatedHumanoid>;
      phase: number;
      baseZ: number;
    }> = [];
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const subParts = buildArticulatedHumanoid(humanGeos, {
        kitPrimaryHex: '#b7ff4a',
        kitSecondaryHex: '#0f172a',
        kitAccentHex: '#ffffff',
        shortsHex: '#0f172a',
        sockHex: '#0f172a',
        squadNumber: 12 + sIdx,
        clubShort: homeDispShort,
        skinToneHex: sIdx === 1 ? '#b97b4c' : '#e2b28e',
        hairColorHex: sIdx === 2 ? '#8c6239' : '#1b1412',
        bootColorHex: '#00e5ff',
        hairStyle: sIdx === 1 ? 'CURLY' : 'SHORT',
        facialHair: sIdx === 0 ? 'STUBBLE' : 'NONE',
        isGK: false,
        seed: 40 + sIdx,
        extraMaterials,
        extraTextures,
      });
      const subG = new THREE.Group();
      subG.add(subParts.bodyGroup);
      const bz = -20 - sIdx * 2.4;
      subG.position.set(HALF_PITCH_W + 2.5, 0, bz);
      subG.rotation.y = -Math.PI / 2;
      scene.add(subG);
      warmupSubs.push({ group: subG, parts: subParts, phase: sIdx * 1.9, baseZ: bz });
    }

    // 4. 3D Match Ball + Contact Shadow
    const { map: ballMap, bumpMap: ballBump } = createFootballTextures(maxAniso);
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 18);
    const ballMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: ballMap,
      bumpMap: ballBump,
      bumpScale: 0.015,
      roughness: 0.34,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(0, BALL_RADIUS, 0);
    scene.add(ballMesh);

    const ballShadow = new THREE.Mesh(ballShadowGeo, ballShadowMat);
    ballShadow.position.y = 0.025;
    scene.add(ballShadow);

    // 5. Spawn 22 Articulated Humanoid Footballers (Textured Faces, Kit Numbers, Non-Box Limbs)
    const actors: SimActor[] = [];

    // ── Maç analizi için oyuncu istatistikleri ve şut kaydı ──
    const matchStats = new Map<string, PlayerMatchStats>();
    const statStart = new Map<string, number>();
    const shotLog: ShotRecord[] = [];
    let liveMinute = 0;
    let lastPass: { team: 'HOME' | 'AWAY'; from: string; to: string; t: number } | null = null;
    const openStat = (a: SimActor, minute: number) => {
      matchStats.set(a.playerId, {
        id: a.playerId, name: a.name, team: a.team, role: a.role, minutes: 0, goals: 0, assists: 0,
        shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, defActions: 0, saves: 0,
      });
      statStart.set(a.playerId, minute);
    };
    const closeStat = (playerId: string, minute: number) => {
      const st = matchStats.get(playerId);
      if (st) st.minutes += Math.max(0, minute - (statStart.get(playerId) ?? 0));
      statStart.delete(playerId);
    };
    const statOf = (a: SimActor) => matchStats.get(a.playerId);
    const collectStats = (minuteNow: number): PlayerMatchStats[] =>
      [...matchStats.values()].map((st) => ({
        ...st,
        xg: Math.round(st.xg * 100) / 100,
        minutes: st.minutes + (statStart.has(st.id) ? Math.max(0, minuteNow - (statStart.get(st.id) ?? 0)) : 0),
      }));

    const getSlotPitchBase = (slotX: number, slotZ: number, role: string, team: 'HOME' | 'AWAY') => {
      const sign = team === 'HOME' ? 1 : -1;
      if (role === 'GK') {
        return {
          bx: 0,
          bz: team === 'HOME' ? -(HALF_PITCH_L - 2.2) : HALF_PITCH_L - 2.2,
        };
      }
      return {
        bx: slotX * (PITCH_W * 0.44) * sign,
        bz: slotZ * (PITCH_L * 0.45) * sign,
      };
    };

    const applyActorAppearance = (actor: SimActor, player: Player) => {
      const app = player.appearance;
      const newFaceTex = createPlayerFaceTexture(
        app.skinTone,
        app.hairColor,
        app.facialHair,
        actor.slotIndex + Math.round(player.ovr),
      );
      extraTextures.push(newFaceTex);
      actor.headMat.map = newFaceTex;
      actor.headMat.needsUpdate = true;
      actor.skinMat.color.set(app.skinTone);
      actor.hairMat.color.set(app.hairColor);
      actor.bootMat.color.set(app.bootColor);

      const isHome = actor.team === 'HOME';
      const kitPri = actor.role === 'GK' ? (isHome ? '#f59e0b' : '#22c55e') : isHome ? homeClub.primaryColor : resolvedAwayKitHex;
      const kitSec = actor.role === 'GK' ? '#0f172a' : isHome ? homeClub.secondaryColor : resolvedAwaySecHex;
      const kitAcc = actor.role === 'GK' ? '#ffffff' : isHome ? homeClub.accentColor : awayClub.accentColor;
      const newKitTex = createKitTexture(
        kitPri,
        kitSec,
        kitAcc,
        actor.squadNumber,
        isHome ? homeDispShort : awayDispShort,
        actor.slotIndex,
      );
      extraTextures.push(newKitTex);
      actor.torsoMat.map = newKitTex;
      actor.torsoMat.needsUpdate = true;

      actor.hairMesh.visible = app.hairStyle !== 'BALD';
      actor.hairMesh.geometry =
        app.hairStyle === 'AFRO'
          ? humanGeos.hairAfroGeo
          : app.hairStyle === 'CURLY'
          ? humanGeos.hairCurlyGeo
          : app.hairStyle === 'MOHAWK'
          ? humanGeos.hairMohawkGeo
          : humanGeos.hairShortGeo;
      actor.hairMesh.position.y = app.hairStyle === 'AFRO' ? 0.02 : 0.006;

      const buildScaleX = app.build === 'STOCKY' ? 1.13 : app.build === 'SLIM' ? 0.92 : 1.0;
      actor.bodyGroup.scale.set(buildScaleX, 1.0, buildScaleX);

      const newTex = createNameplateTexture(getPlayerDisplayName(player, propsRef.current.licenseMode));
      extraTextures.push(newTex);
      (actor.nameSprite.material as THREE.SpriteMaterial).map = newTex;
      (actor.nameSprite.material as THREE.SpriteMaterial).needsUpdate = true;
    };

    const spawnTeam = (club: Club, tactics: TacticsConfig, team: 'HOME' | 'AWAY') => {
      tactics.slots.forEach((slot, idx) => {
        const player = club.players.find((p) => p.id === slot.playerId) ?? club.players[idx];
        const isGK = slot.role === 'GK';
        const isHome = team === 'HOME';
        const squadNum = isGK ? 1 : idx + 1;
        const kitPri = isGK ? (isHome ? '#f59e0b' : '#22c55e') : isHome ? homeClub.primaryColor : resolvedAwayKitHex;
        const kitSec = isGK ? '#0f172a' : isHome ? homeClub.secondaryColor : resolvedAwaySecHex;
        const kitAcc = isGK ? '#ffffff' : isHome ? homeClub.accentColor : awayClub.accentColor;
        const shortsHex = isGK ? '#0f172a' : isHome ? homeClub.secondaryColor : resolvedAwaySecHex;
        const sockHex = isHome ? homeClub.primaryColor : '#0f172a';

        const grp = new THREE.Group();

        const shadow = new THREE.Mesh(humanGeos.shadowGeo, ballShadowMat);
        shadow.position.y = 0.025;
        grp.add(shadow);

        const cRing = new THREE.Mesh(humanGeos.ringGeo, ringMat);
        cRing.position.y = 0.035;
        cRing.visible = false;
        grp.add(cRing);

        const parts = buildArticulatedHumanoid(humanGeos, {
          kitPrimaryHex: kitPri,
          kitSecondaryHex: kitSec,
          kitAccentHex: kitAcc,
          shortsHex,
          sockHex,
          squadNumber: squadNum,
          clubShort: getClubShortName(club, licenseMode),
          skinToneHex: player.appearance.skinTone,
          hairColorHex: player.appearance.hairColor,
          bootColorHex: player.appearance.bootColor,
          hairStyle: player.appearance.hairStyle,
          facialHair: player.appearance.facialHair,
          isGK,
          seed: idx + (isHome ? 0 : 17),
          gloveMat: gkGloveMat,
          extraMaterials,
          extraTextures,
        });

        const buildScaleX =
          player.appearance.build === 'STOCKY'
            ? 1.13
            : player.appearance.build === 'SLIM'
            ? 0.92
            : 1.0;
        parts.bodyGroup.scale.set(buildScaleX, 1.0, buildScaleX);
        grp.add(parts.bodyGroup);

        // Floating Carrier Nameplate Sprite
        const nameTex = createNameplateTexture(getPlayerDisplayName(player, propsRef.current.licenseMode));
        extraTextures.push(nameTex);
        const spriteMat = new THREE.SpriteMaterial({
          map: nameTex,
          transparent: true,
          depthTest: false,
        });
        extraMaterials.push(spriteMat);
        const nameSprite = new THREE.Sprite(spriteMat);
        nameSprite.position.set(0, 2.45, 0);
        nameSprite.scale.set(3.5, 0.7, 1);
        nameSprite.visible = false;
        grp.add(nameSprite);

        const { bx, bz } = getSlotPitchBase(slot.x, slot.z, slot.role, team);
        grp.position.set(bx, 0, bz);
        scene.add(grp);

        const actor: SimActor = {
          slotIndex: idx,
          playerId: player.id,
          name: getPlayerDisplayName(player, propsRef.current.licenseMode),
          team,
          role: slot.role,
          ovr: player.ovr,
          squadNumber: squadNum,
          baseX: bx,
          baseZ: bz,
          x: bx,
          z: bz,
          vx: 0,
          vz: 0,
          stridePhase: idx * 0.7,
          kickTimer: 0,
          diveTimer: 0,
          diveDir: 1,
          tackleTimer: 0,
          headerTimer: 0,
          celebrateTimer: 0,
          celebrateStyle: 'ARM_JUMP',
          condition: player.condition,
          injured: false,
          yellowCard: false,
          group: grp,
          bodyGroup: parts.bodyGroup,
          armLPivot: parts.armLPivot,
          armRPivot: parts.armRPivot,
          thighLPivot: parts.thighLPivot,
          thighRPivot: parts.thighRPivot,
          calfLPivot: parts.calfLPivot,
          calfRPivot: parts.calfRPivot,
          spinePivot: parts.spinePivot,
          foreLPivot: parts.foreLPivot,
          foreRPivot: parts.foreRPivot,
          headPivot: parts.headPivot,
          pose: clonePose(REST),
          groundY: 0,
          animT: idx * 1.37,
          style: styleFromSeed(rand(), rand(), rand()),
          carrierRing: cRing,
          headMat: parts.headMat,
          skinMat: parts.skinMat,
          hairMat: parts.hairMat,
          bootMat: parts.bootMat,
          torsoMat: parts.torsoMat,
          hairMesh: parts.hairMesh,
          nameSprite,
        };
        actors.push(actor);
      });
    };

    spawnTeam(homeClub, homeTactics, 'HOME');
    spawnTeam(awayClub, awayTactics, 'AWAY');

    // 6. Match Referee Actor (Unified Zero-Box Anatomical Official)
    const refParts = buildArticulatedHumanoid(humanGeos, {
      kitPrimaryHex: '#eab308',
      kitSecondaryHex: '#0f172a',
      kitAccentHex: '#ffffff',
      shortsHex: '#0f172a',
      sockHex: '#0f172a',
      squadNumber: 99,
      clubShort: 'REF',
      skinToneHex: '#e2b28e',
      hairColorHex: '#1c1614',
      bootColorHex: '#090d14',
      hairStyle: 'SHORT',
      facialHair: 'STUBBLE',
      isGK: false,
      seed: 77,
      extraMaterials,
      extraTextures,
    });
    const refGroup = new THREE.Group();
    const refShadow = new THREE.Mesh(humanGeos.shadowGeo, ballShadowMat);
    refShadow.position.y = 0.025;
    refGroup.add(refShadow, refParts.bodyGroup);
    refGroup.position.set(-7.5, 0, 0);
    scene.add(refGroup);
    const refState = { x: -7.5, z: 0, stride: 0, animT: 0, groundY: 0, pose: clonePose(REST), parts: refParts };

    // 7. Load External glTF Rig (/models/player.glb or custom .glb) via GLTFLoader + SkeletonUtils
    let disposed = false;
    const resolvedModelUrl = gltfModelUrl || '/models/player.glb';
    gltfController.loadGltfTemplate(resolvedModelUrl).then((gltf) => {
      if (!gltf || disposed) return;

      actors.forEach((act) => {
        const club = act.team === 'HOME' ? propsRef.current.homeClub : propsRef.current.awayClub;
        const player = club.players.find((p) => p.id === act.playerId) ?? club.players[act.slotIndex];
        const isHome = act.team === 'HOME';
        const isGK = act.role === 'GK';
        const kitPri = isGK ? (isHome ? '#f59e0b' : '#22c55e') : isHome ? homeClub.primaryColor : resolvedAwayKitHex;
        const kitSec = isGK ? '#0f172a' : isHome ? homeClub.secondaryColor : resolvedAwaySecHex;
        const kitAcc = isGK ? '#ffffff' : isHome ? homeClub.accentColor : awayClub.accentColor;
        const shortsHex = isGK ? '#0f172a' : isHome ? homeClub.secondaryColor : resolvedAwaySecHex;
        const sockHex = isHome ? homeClub.primaryColor : '#0f172a';

        const rig = gltfController.instantiateClone(gltf, humanGeos, {
          kitPrimaryHex: kitPri,
          kitSecondaryHex: kitSec,
          kitAccentHex: kitAcc,
          shortsHex,
          sockHex,
          squadNumber: act.squadNumber,
          clubShort: isHome ? homeDispShort : awayDispShort,
          skinToneHex: player.appearance.skinTone,
          hairColorHex: player.appearance.hairColor,
          bootColorHex: player.appearance.bootColor,
          hairStyle: player.appearance.hairStyle,
          facialHair: player.appearance.facialHair,
          isGK,
          seed: act.slotIndex + (isHome ? 0 : 17),
          gloveMat: gkGloveMat,
          extraMaterials,
          extraTextures,
        });

        if (rig.isNamedMultiPartRig && rig.parts) {
          act.group.remove(act.bodyGroup);
          const buildScaleX =
            player.appearance.build === 'STOCKY'
              ? 1.13
              : player.appearance.build === 'SLIM'
              ? 0.92
              : 1.0;
          rig.parts.bodyGroup.scale.set(buildScaleX, 1.0, buildScaleX);
          act.group.add(rig.parts.bodyGroup);

          act.bodyGroup = rig.parts.bodyGroup;
          act.armLPivot = rig.parts.armLPivot;
          act.armRPivot = rig.parts.armRPivot;
          act.thighLPivot = rig.parts.thighLPivot;
          act.thighRPivot = rig.parts.thighRPivot;
          act.calfLPivot = rig.parts.calfLPivot;
          act.calfRPivot = rig.parts.calfRPivot;
          act.spinePivot = rig.parts.spinePivot;
          act.foreLPivot = rig.parts.foreLPivot;
          act.foreRPivot = rig.parts.foreRPivot;
          act.headPivot = rig.parts.headPivot;
          act.headMat = rig.parts.headMat;
          act.skinMat = rig.parts.skinMat;
          act.hairMat = rig.parts.hairMat;
          act.bootMat = rig.parts.bootMat;
          act.torsoMat = rig.parts.torsoMat;
          act.hairMesh = rig.parts.hairMesh;
          act.gltfRig = rig;
        } else {
          // External SkinnedMesh Mixamo/RPM character
          act.bodyGroup.visible = false;
          act.group.add(rig.modelRoot);
          act.gltfRig = rig;
          const runClip = rig.actions['run'] || rig.actions['walk'] || Object.values(rig.actions)[0];
          runClip?.play();
        }
      });

      // Upgrade Referee & Manager from the loaded .glb template too when named rig matches
      const refRig = gltfController.instantiateClone(gltf, humanGeos, {
        kitPrimaryHex: '#eab308',
        kitSecondaryHex: '#0f172a',
        kitAccentHex: '#ffffff',
        shortsHex: '#0f172a',
        sockHex: '#0f172a',
        squadNumber: 99,
        clubShort: 'REF',
        skinToneHex: '#e2b28e',
        hairColorHex: '#1c1614',
        bootColorHex: '#090d14',
        hairStyle: 'SHORT',
        facialHair: 'STUBBLE',
        isGK: false,
        seed: 77,
        extraMaterials,
        extraTextures,
      });
      if (refRig.isNamedMultiPartRig && refRig.parts) {
        refGroup.remove(refState.parts.bodyGroup);
        refGroup.add(refRig.parts.bodyGroup);
        refState.parts = refRig.parts;
      }
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const ball = {
      x: 0,
      y: BALL_RADIUS,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 6.8,
    };

    interface PendingShotState {
      active: boolean;
      outcome: 'GOAL' | 'SAVE' | 'WOODWORK';
      team: 'HOME' | 'AWAY';
      scorerName: string;
      minute: number;
      startX: number;
      startZ: number;
      targetX: number;
      targetY: number;
      goalZ: number;
      elapsed: number;
      duration: number;
      gkIdx: number;
    }

    let pendingShot: PendingShotState | null = null;
    let kickoffResetTimer = 0;

    let possessionTeam: 'HOME' | 'AWAY' = 'HOME';
    let carrierIdx = 9;
    let passCooldown = 0.75;
    let matchSeconds = 0;
    const MATCH_DURATION_SIM_SEC = 54;

    let homeGoals = 0;
    let awayGoals = 0;
    let homeXg = 0;
    let awayXg = 0;
    let homeShots = 0;
    let awayShots = 0;
    let homePossTicks = 1;
    let awayPossTicks = 1;
    // Momentum (ev sahibi pozitif) ve PPDA sayaçları
    let momentum = 0;
    let lastMomMinute = 0;
    let homePasses = 0;
    let awayPasses = 0;
    let homeDefActs = 1;
    let awayDefActs = 1;
    let crowdExcitement = 0;
    let netRippleHomeTimer = 0;
    let netRippleAwayTimer = 0;
    let trauma = 0;
    let hitstopTimer = 0;
    let bannerTimer = 1.6;
    let bannerText: string | null = 'MAÇ BAŞLADI';
    let lastMinuteReported = -1;
    let finished = false;
    let halfTimeTriggered = false;

    const events: MatchEventLog[] = [
      {
        minute: 1,
        type: 'KICKOFF',
        teamId: homeClub.id,
        playerName: actors[9]?.name ?? 'Santra',
        detail: 'Hakem ilk düdüğü çaldı, gece derbisi başladı!',
      },
    ];
    const injuredIds: string[] = [];
    const yellowCardIds: string[] = [];

    soundEngine.playWhistle(false);

    const emitSnapshot = (phase: LiveMatchSnapshot['phase']) => {
      const minute = Math.min(90, Math.max(1, Math.round((matchSeconds / MATCH_DURATION_SIM_SEC) * 90)));
      const conds: Record<string, number> = {};
      const mySide = propsRef.current.myClubId === homeClub.id ? 'HOME' : 'AWAY';
      for (const a of actors) {
        if (a.team === mySide) conds[a.playerId] = Math.round(a.condition);
      }
      const totalTicks = homePossTicks + awayPossTicks;
      const snap: LiveMatchSnapshot = {
        minute,
        homeGoals,
        awayGoals,
        homeXg: Math.round(homeXg * 100) / 100,
        awayXg: Math.round(awayXg * 100) / 100,
        homeShots,
        awayShots,
        homePossession: Math.round((homePossTicks / totalTicks) * 100),
        momentum: Math.round(momentum * 100) / 100,
        homePpda: Math.round((awayPasses / homeDefActs) * 10) / 10,
        awayPpda: Math.round((homePasses / awayDefActs) * 10) / 10,
        phase,
        bannerText,
        events: [...events].slice(-14).reverse(),
        playerConditions: conds,
        injuredIds: [...injuredIds],
        yellowCardIds: [...yellowCardIds],
        playerStats: collectStats(phase === 'FULL_TIME' ? 90 : liveMinute),
        shots: [...shotLog],
      };
      if (phase === 'FULL_TIME') {
        propsRef.current.onFinishMatch(snap);
      } else {
        propsRef.current.onUpdateSnapshot(snap);
      }
    };

    const aiSubbedSlotIndices = new Set<number>();
    const aiUsedPlayerIds = new Set<string>();
    const initialOppSide: 'HOME' | 'AWAY' = propsRef.current.myClubId === homeClub.id ? 'AWAY' : 'HOME';
    actors.forEach((a) => {
      if (a.team === initialOppSide) aiUsedPlayerIds.add(a.playerId);
    });
    let aiSubsMade = 0;
    let nextAiSubMinute = 58 + Math.floor(rand() * 8);

    const roleGroup = (role: string): 'GK' | 'DEF' | 'MID' | 'FWD' => {
      if (role === 'GK') return 'GK';
      if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(role)) return 'DEF';
      if (['ST', 'CF', 'LW', 'RW', 'FWD'].includes(role)) return 'FWD';
      return 'MID';
    };

    const runOpponentAutoSubs = (minute: number) => {
      if (aiSubsMade >= 5) return;
      const { homeClub: hc, awayClub: ac, myClubId: mcid, licenseMode: lm } = propsRef.current;
      const oppSide: 'HOME' | 'AWAY' = mcid === hc.id ? 'AWAY' : 'HOME';
      const oppClub = oppSide === 'HOME' ? hc : ac;
      const oppShort = oppSide === 'HOME' ? homeDispShort : awayDispShort;

      const oppOutfield = actors.filter((a) => a.team === oppSide && a.role !== 'GK');
      const injuredActor = oppOutfield.find((a) => a.injured);
      const shouldSubByTime = minute >= nextAiSubMinute && minute <= 87;
      if (!injuredActor && !shouldSubByTime) return;

      let outActor = injuredActor;
      if (!outActor) {
        const sortedByFatigue = [...oppOutfield].sort((a, b) => a.condition - b.condition);
        outActor = sortedByFatigue[0];
        if (!outActor || (outActor.condition > 76 && minute < 72)) {
          nextAiSubMinute = minute + 5;
          return;
        }
      }

      const targetGroup = roleGroup(outActor.role);
      const availableBench = oppClub.players.filter(
        (p) =>
          !aiUsedPlayerIds.has(p.id) &&
          p.positionGroup !== 'GK' &&
          p.injuredWeeks === 0
      );
      if (availableBench.length === 0) {
        aiSubsMade = 5;
        return;
      }

      availableBench.sort((a, b) => {
        const aMatch = a.positionGroup === targetGroup ? 12 : 0;
        const bMatch = b.positionGroup === targetGroup ? 12 : 0;
        return b.ovr + b.condition * 0.25 + bMatch - (a.ovr + a.condition * 0.25 + aMatch);
      });

      const incoming = availableBench[0];
      const outName = outActor.name;
      closeStat(outActor.playerId, liveMinute);
      outActor.playerId = incoming.id;
      outActor.name = getPlayerDisplayName(incoming, lm);
      outActor.squadNumber = incoming.shirtNumber;
      outActor.ovr = incoming.ovr;
      outActor.condition = Math.max(82, incoming.condition);
      outActor.injured = false;
      outActor.yellowCard = false;
      applyActorAppearance(outActor, incoming);
      openStat(outActor, liveMinute);

      aiSubbedSlotIndices.add(outActor.slotIndex);
      aiUsedPlayerIds.add(incoming.id);
      aiSubsMade += 1;
      nextAiSubMinute = minute + 6 + Math.floor(rand() * 5);

      bannerText = `RAKİP DEĞİŞİKLİK (${oppShort}): ${outActor.name}`;
      bannerTimer = 2.0;
      soundEngine.playSubWhistle();
      events.push({
        minute,
        type: 'SUB',
        teamId: oppClub.id,
        playerName: outActor.name,
        detail: `${outName} kenara geldi, ${outActor.name} oyuna girdi (${oppShort}).`,
      });
    };

    const syncLiveSubstitutions = () => {
      const { homeTactics: ht, awayTactics: at, homeClub: hc, awayClub: ac, licenseMode: lm, myClubId: mcid } = propsRef.current;
      const oppSide: 'HOME' | 'AWAY' = mcid === hc.id ? 'AWAY' : 'HOME';
      const syncSide = (tactics: TacticsConfig, club: Club, team: 'HOME' | 'AWAY') => {
        tactics.slots.forEach((slot, idx) => {
          const actor = actors.find((a) => a.team === team && a.slotIndex === idx);
          if (!actor) return;
          const { bx, bz } = getSlotPitchBase(slot.x, slot.z, slot.role, team);
          actor.baseX = bx;
          actor.baseZ = bz;
          actor.role = slot.role;
          if (team === oppSide && aiSubbedSlotIndices.has(idx)) return;
          if (slot.playerId && actor.playerId !== slot.playerId) {
            const incoming = club.players.find((p) => p.id === slot.playerId);
            if (incoming) {
              const outName = actor.name;
              closeStat(actor.playerId, liveMinute);
              actor.playerId = incoming.id;
              actor.name = getPlayerDisplayName(incoming, lm);
              actor.squadNumber = incoming.shirtNumber;
              actor.ovr = incoming.ovr;
              actor.condition = incoming.condition;
              actor.injured = false;
              actor.yellowCard = false;
              applyActorAppearance(actor, incoming);
              openStat(actor, liveMinute);
              const minute = Math.min(90, Math.max(1, Math.round((matchSeconds / MATCH_DURATION_SIM_SEC) * 90)));
              bannerText = `OYUNCU DEĞİŞİKLİĞİ: ${actor.name}`;
              bannerTimer = 2.0;
              soundEngine.playSubWhistle();
              events.push({
                minute,
                type: 'SUB',
                teamId: club.id,
                playerName: actor.name,
                detail: `${outName} kenara geldi, ${actor.name} oyuna girdi.`,
              });
            }
          }
        });
      };
      syncSide(ht, hc, 'HOME');
      syncSide(at, ac, 'AWAY');
    };

    const pickTargetActor = (team: 'HOME' | 'AWAY', excludeIdx: number, preferForward = true): number => {
      const dir = team === 'HOME' ? 1 : -1;
      const refZ = excludeIdx >= 0 && actors[excludeIdx] ? actors[excludeIdx].z : 0;
      const forward: number[] = [];
      const allOutfield: number[] = [];
      for (let i = 0; i < actors.length; i++) {
        if (actors[i].team === team && i !== excludeIdx && actors[i].role !== 'GK') {
          allOutfield.push(i);
          if (actors[i].z * dir > refZ * dir - 4) {
            forward.push(i);
          }
        }
      }
      const pool = preferForward && forward.length > 0 && rand() < 0.72 ? forward : allOutfield;
      return pool[Math.floor(rand() * pool.length)] ?? (team === 'HOME' ? 9 : 20);
    };

    let strCache: { at: number; homeT: TacticsConfig; awayT: TacticsConfig; home: ReturnType<typeof calculateTacticalStrength>; away: ReturnType<typeof calculateTacticalStrength> } | null = null;
    const director = new AutoDirector();
    actors.forEach((a) => openStat(a, 0));

    // ── Gol tekrarı: son birkaç saniyeyi kaydet, gol sonrası yavaş çekimde oynat ──
    const REPLAY_SECONDS = 3.6;
    const REPLAY_SPEED = 0.7;
    const replayBuf = new ReplayBuffer(actors.length, 600);
    const replayFrame = new Float32Array(replayBuf.stride);
    const replayPose = clonePose(REST);
    let replayClip: ReplayClip | null = null;
    let replayCountdown = -1;
    let replay: { clip: ReplayClip; t: number } | null = null;
    const endReplay = () => {
      replay = null;
      replayClip = null;
      bannerText = null;
      bannerTimer = 0;
    };
    const advanceReplay = (dtReal: number) => {
      if (!replay) return;
      replay.t += dtReal * REPLAY_SPEED;
      const over = sampleClip(replay.clip, replay.t, replayFrame);
      ballMesh.position.set(replayFrame[1], replayFrame[2], replayFrame[3]);
      actors.forEach((a, i) => {
        const o = HEADER_FLOATS + i * ACTOR_FLOATS;
        a.group.position.set(replayFrame[o], 0, replayFrame[o + 1]);
        a.group.rotation.y = replayFrame[o + 2];
        arrayToPose(replayFrame, o + 4, replayPose);
        applyPoseToRig(a, replayPose, replayFrame[o + 3]);
      });
      if (over) endReplay();
    };
    const recordReplayFrame = (dtReal: number) => {
      const f = replayBuf.begin();
      f[0] = dtReal;
      f[1] = ball.x;
      f[2] = ball.y;
      f[3] = ball.z;
      actors.forEach((a, i) => {
        const o = HEADER_FLOATS + i * ACTOR_FLOATS;
        f[o] = a.x;
        f[o + 1] = a.z;
        f[o + 2] = a.group.rotation.y;
        f[o + 3] = a.groundY;
        poseToArray(a.pose, f, o + 4);
      });
      replayBuf.commit();
    };
    let camInit = false;
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let frameId = 0;

    const tick = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = Math.max(0.001, (nowMs - lastTimeMs) / 1000);
      lastTimeMs = nowMs;
      const elapsedTimeSec = (nowMs - startTimeMs) / 1000;
      const dt = Math.min(rawDt, isSoftwareGl ? 0.45 : 0.05);
      const perfChange = gov.push(rawDt * 1000);
      if (perfChange !== null) applyTier(perfChange);
      frameNo++;
      if (shadowEvery > 1 && frameNo % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;

      syncLiveSubstitutions();

      const {
        paused: isPaused,
        speedMultiplier: spd,
        cameraAngle: camMode,
        homeTactics: ht,
        awayTactics: at,
        myClubId: mcid,
        showPlayerNamesIn3D: showNames,
        preMatchBoost: pmBoost,
        halfTimeBoost: htBoost,
      } = propsRef.current;

      const mySide = mcid === homeClub.id ? 'HOME' : 'AWAY';
      // Pahalı hesap: kare başına değil, 4 Hz veya taktik değişince yenilenir.
      if (!strCache || nowMs - strCache.at > 250 || strCache.homeT !== ht || strCache.awayT !== at) {
        strCache = {
          at: nowMs,
          homeT: ht,
          awayT: at,
          home: calculateTacticalStrength(homeClub, ht, at),
          away: calculateTacticalStrength(awayClub, at, ht),
        };
      }
      const baseHomeStr = strCache.home;
      const baseAwayStr = strCache.away;
      const talkBonus = pmBoost + (halfTimeTriggered ? htBoost : 0);
      const homeOverall = baseHomeStr.overall + (mySide === 'HOME' ? talkBonus : 0);
      const awayOverall = baseAwayStr.overall + (mySide === 'AWAY' ? talkBonus : 0);
      const homeDefense = baseHomeStr.defense + (mySide === 'HOME' ? talkBonus * 0.6 : 0);
      const awayDefense = baseAwayStr.defense + (mySide === 'AWAY' ? talkBonus * 0.6 : 0);

      // Tekrar: kutlama bitince başlar
      if (!replay && replayCountdown > 0 && !isPaused && !finished) {
        replayCountdown -= dt;
        if (replayCountdown <= 0) {
          replayCountdown = -1;
          if (replayClip && replayClip.frames > 20) {
            replay = { clip: replayClip, t: 0 };
            bannerText = 'TEKRAR';
            bannerTimer = 999;
          }
        }
      }

      if (replay) {
        if (!isPaused) advanceReplay(dt);
      } else if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
      } else if (!isPaused && !finished) {
        const simDt = dt * spd;
        matchSeconds += simDt;
        const currentMinute = Math.min(90, Math.floor((matchSeconds / MATCH_DURATION_SIM_SEC) * 90));
        liveMinute = currentMinute;
        if (currentMinute > lastMomMinute) {
          momentum *= Math.pow(0.93, currentMinute - lastMomMinute);
          lastMomMinute = currentMinute;
        }

        if (bannerTimer > 0) {
          bannerTimer -= dt;
          if (bannerTimer <= 0) bannerText = null;
        }

        if (!halfTimeTriggered && currentMinute >= 45) {
          halfTimeTriggered = true;
          bannerText = 'DEVRE ARASI';
          bannerTimer = 2.0;
          soundEngine.playWhistle(false);
          emitSnapshot('HALF_TIME');
          propsRef.current.onHalfTimeReached();
        }

        if (currentMinute >= 46) {
          runOpponentAutoSubs(currentMinute);
        }

        if (kickoffResetTimer > 0) {
          kickoffResetTimer -= simDt;
          if (kickoffResetTimer <= 0) {
            ball.x = 0;
            ball.y = BALL_RADIUS;
            ball.z = 0;
            ball.vx = 0;
            ball.vy = 0;
            ball.vz = 0;
            passCooldown = 0.7;
          }
        } else if (pendingShot && pendingShot.active) {
          pendingShot.elapsed += simDt;
          const t = Math.min(1, pendingShot.elapsed / pendingShot.duration);
          ball.x = THREE.MathUtils.lerp(pendingShot.startX, pendingShot.targetX, t);
          ball.z = THREE.MathUtils.lerp(pendingShot.startZ, pendingShot.goalZ, t);
          ball.y = BALL_RADIUS + Math.sin(t * Math.PI) * pendingShot.targetY + t * (pendingShot.targetY * 0.42);

          const gk = actors[pendingShot.gkIdx];
          if (gk) {
            const defendGoalZ = pendingShot.team === 'HOME' ? HALF_PITCH_L - 1.5 : -(HALF_PITCH_L - 1.5);
            gk.x = THREE.MathUtils.lerp(gk.x, THREE.MathUtils.clamp(pendingShot.targetX * 0.85, -3.3, 3.3), 0.22);
            gk.z = defendGoalZ;
            if (t >= 0.45 && gk.diveTimer <= 0) {
              gk.diveTimer = 0.56;
              gk.diveDir = pendingShot.targetX >= gk.x ? -1 : 1;
            }
          }

          if (t >= 1) {
            const shot = pendingShot;
            pendingShot = null;

            if (shot.outcome === 'GOAL') {
              if (shot.team === 'HOME') {
                homeGoals++;
                momentum = Math.max(-1, Math.min(1, momentum + 0.45));
                netRippleAwayTimer = 0.95;
              } else {
                awayGoals++;
                momentum = Math.max(-1, Math.min(1, momentum - 0.45));
                netRippleHomeTimer = 0.95;
              }

              const dir = shot.team === 'HOME' ? 1 : -1;
              ball.z = shot.goalZ + dir * 1.15;
              ball.y = 0.35;
              ball.vx = 0;
              ball.vy = 0;
              ball.vz = 0;

              bannerText = `GOOOL! ${shot.scorerName} (${shot.minute}')`;
              bannerTimer = 2.6;
              crowdExcitement = 1.8;
              if ((propsRef.current.cameraSettings?.replay ?? true) && spd < 4 && currentMinute < 89) {
                replayClip = replayBuf.snapshotLast(REPLAY_SECONDS);
                replayCountdown = 3.4;
              }
              trauma = 0.46;
              hitstopTimer = 0.06;
              soundEngine.playGoalRoar();

              for (let ai = 0; ai < actors.length; ai++) {
                const act = actors[ai];
                if (act.team === shot.team) {
                  act.celebrateTimer = 2.2;
                  act.celebrateStyle = act.name === shot.scorerName ? 'KNEE_SLIDE' : 'ARM_JUMP';
                }
              }

              events.push({
                minute: shot.minute,
                type: 'GOAL',
                teamId: shot.team === 'HOME' ? homeClub.id : awayClub.id,
                playerName: shot.scorerName,
                detail: `${shot.scorerName} köşeden ağları sarstı!`,
              });

              possessionTeam = shot.team === 'HOME' ? 'AWAY' : 'HOME';
              carrierIdx = possessionTeam === 'HOME' ? 9 : 20;
              kickoffResetTimer = 0.85;
              passCooldown = 1.35;
            } else if (shot.outcome === 'WOODWORK') {
              soundEngine.playPostHit();
              bannerText = `DİREKTEN DÖNDÜ! (${shot.scorerName})`;
              bannerTimer = 1.7;
              trauma = 0.24;
              const dir = shot.team === 'HOME' ? 1 : -1;
              ball.vx = -Math.sign(shot.targetX || 1) * 7.5;
              ball.vz = -dir * 12.5;
              ball.vy = 3.2;

              events.push({
                minute: shot.minute,
                type: 'WOODWORK',
                teamId: shot.team === 'HOME' ? homeClub.id : awayClub.id,
                playerName: shot.scorerName,
                detail: `${shot.scorerName}'in sert şutu direkte patladı!`,
              });

              possessionTeam = shot.team === 'HOME' ? 'AWAY' : 'HOME';
              carrierIdx = possessionTeam === 'HOME' ? 2 : 13;
              passCooldown = 0.95;
            } else {
              soundEngine.playKick(1.0);
              bannerText = `HARİKA KURTARIŞ! (${actors[shot.gkIdx]?.name ?? 'Kaleci'})`;
              bannerTimer = 1.45;
              const dir = shot.team === 'HOME' ? 1 : -1;
              ball.vx = (rand() - 0.5) * 6.5;
              ball.vz = -dir * 8.5;
              ball.vy = 2.2;

              events.push({
                minute: shot.minute,
                type: 'SAVE',
                teamId: shot.team === 'HOME' ? homeClub.id : awayClub.id,
                playerName: shot.scorerName,
                detail: `Kaleci uçarak ${shot.scorerName}'in şutunu çıkardı!`,
              });

              possessionTeam = shot.team === 'HOME' ? 'AWAY' : 'HOME';
              carrierIdx = shot.gkIdx;
              passCooldown = 0.95;
            }
          }
        } else {
          const subSteps = Math.max(1, Math.ceil(simDt / 0.05));
          const subDt = simDt / subSteps;
          for (let s = 0; s < subSteps; s++) {
            ball.vy -= 19.5 * subDt;
            ball.x += ball.vx * subDt;
            ball.y += ball.vy * subDt;
            ball.z += ball.vz * subDt;

            if (ball.y <= BALL_RADIUS) {
              ball.y = BALL_RADIUS;
              if (Math.abs(ball.vy) > 1.8) {
                ball.vy = -ball.vy * 0.6;
              } else {
                ball.vy = 0;
              }
              const friction = Math.exp(-1.75 * subDt);
              ball.vx *= friction;
              ball.vz *= friction;
            }
          }

          if (Math.abs(ball.x) > HALF_PITCH_W * 0.96) {
            ball.x = Math.sign(ball.x) * HALF_PITCH_W * 0.95;
            ball.vx *= -0.5;
          }
          if (Math.abs(ball.z) > HALF_PITCH_L * 0.965) {
            ball.z = Math.sign(ball.z) * HALF_PITCH_L * 0.95;
            ball.vz *= -0.5;
          }
        }

        const speedHoriz = Math.hypot(ball.vx, ball.vz);
        if (speedHoriz > 0.15) {
          _spinAxis.set(ball.vz, 0, -ball.vx).normalize();
          _spinQuat.setFromAxisAngle(_spinAxis, (speedHoriz / BALL_RADIUS) * simDt);
          ballMesh.quaternion.premultiply(_spinQuat);
        }

        ballMesh.position.set(ball.x, ball.y, ball.z);
        ballShadow.position.set(ball.x, 0.025, ball.z);
        const shadowScale = Math.max(0.42, 1 - (ball.y - BALL_RADIUS) * 0.11);
        ballShadow.scale.setScalar(shadowScale);

        if (possessionTeam === 'HOME') homePossTicks++;
        else awayPossTicks++;

        if (!pendingShot && kickoffResetTimer <= 0) {
          passCooldown -= simDt;
        }
        let aiSteps = 0;
        while (!pendingShot && kickoffResetTimer <= 0 && passCooldown <= 0 && aiSteps < 6) {
          aiSteps++;
          const carrier = actors[carrierIdx];
          if (!carrier) break;

          const attackDir = carrier.team === 'HOME' ? 1 : -1;
          const distToGoal = Math.abs(attackDir * HALF_PITCH_L - carrier.z);
          const teamPower = carrier.team === 'HOME' ? homeOverall : awayOverall;
          const oppPower = carrier.team === 'HOME' ? awayDefense : homeDefense;

          if (distToGoal < 30.5 && rand() < 0.56) {
            const oppGk = actors.find((a) => a.team !== carrier.team && a.role === 'GK');
            const mods = shotModifiers({
              shooterOvr: carrier.ovr,
              shooterCondition: carrier.condition,
              gkRating: oppGk ? oppGk.ovr : null,
              momentum: carrier.team === 'HOME' ? momentum : -momentum,
            });
            const shotXg = THREE.MathUtils.clamp(
              (0.08 + (teamPower - oppPower) * 0.012 + rand() * 0.24) * mods.xgMul,
              0.03,
              0.62
            );
            momentum = Math.max(-1, Math.min(1, momentum + (carrier.team === 'HOME' ? 0.05 : -0.05)));
            if (carrier.team === 'HOME') {
              homeShots++;
              homeXg += shotXg;
            } else {
              awayShots++;
              awayXg += shotXg;
            }

            carrier.kickTimer = 0.38;
            soundEngine.playKick(1.3);
            soundEngine.boostCrowdAmbience('SHOT');
            crowdExcitement = 0.78;

            const isGoal = rand() < shotXg * 0.88 * mods.convMul;
            const isPost = !isGoal && rand() < 0.22;
            const outcome: PendingShotState['outcome'] = isGoal ? 'GOAL' : isPost ? 'WOODWORK' : 'SAVE';
            const oppGkIdx = actors.findIndex((a) => a.team !== carrier.team && a.role === 'GK');
            const shooterStat = statOf(carrier);
            if (shooterStat) {
              shooterStat.shots++;
              shooterStat.xg += shotXg;
              if (outcome !== 'WOODWORK') shooterStat.onTarget++;
              if (outcome === 'GOAL') shooterStat.goals++;
            }
            if (outcome === 'SAVE' && oppGkIdx >= 0) {
              const gkStat = statOf(actors[oppGkIdx]);
              if (gkStat) gkStat.saves++;
            }
            if (outcome === 'GOAL' && lastPass && lastPass.to === carrier.playerId && lastPass.team === carrier.team && matchSeconds - lastPass.t < 2.5) {
              const assistStat = matchStats.get(lastPass.from);
              if (assistStat) assistStat.assists++;
            }
            shotLog.push({
              minute: currentMinute,
              team: carrier.team,
              x: Math.round(ball.x * 10) / 10,
              z: Math.round(ball.z * 10) / 10,
              xg: Math.round(shotXg * 100) / 100,
              outcome,
              playerId: carrier.playerId,
              name: carrier.name,
            });
            const goalZ = attackDir * HALF_PITCH_L;

            const targetX =
              outcome === 'WOODWORK'
                ? (rand() < 0.5 ? -3.55 : 3.55)
                : outcome === 'GOAL'
                ? (rand() < 0.5 ? -1 : 1) * (1.85 + rand() * 1.35)
                : (rand() - 0.5) * 3.8;
            const targetY =
              outcome === 'WOODWORK'
                ? 2.28
                : outcome === 'GOAL'
                ? 0.55 + rand() * 1.35
                : 0.75 + rand() * 1.05;

            pendingShot = {
              active: true,
              outcome,
              team: carrier.team,
              scorerName: carrier.name,
              minute: currentMinute,
              startX: ball.x,
              startZ: ball.z,
              targetX,
              targetY,
              goalZ,
              elapsed: 0,
              duration: 0.52,
              gkIdx: oppGkIdx >= 0 ? oppGkIdx : 0,
            };
            break;
          } else {
            const passSuccessProb = THREE.MathUtils.clamp(0.76 + (teamPower - oppPower) * 0.012, 0.56, 0.9);
            if (rand() < passSuccessProb) {
              carrier.kickTimer = 0.25;
              if (carrier.team === 'HOME') homePasses++;
              else awayPasses++;
              const nextIdx = pickTargetActor(carrier.team, carrierIdx, true);
              const receiver = actors[nextIdx];
              const passerStat = statOf(carrier);
              if (passerStat) {
                passerStat.passes++;
                passerStat.passesOk++;
              }
              lastPass = { team: carrier.team, from: carrier.playerId, to: receiver.playerId, t: matchSeconds };
              const dx = receiver.x - ball.x;
              const dz = receiver.z - ball.z;
              const passDist = Math.hypot(dx, dz);
              const flightTime = THREE.MathUtils.clamp(passDist / 24, 0.42, 1.05);
              ball.vx = dx / flightTime;
              ball.vz = dz / flightTime;
              ball.vy = 1.6 + Math.min(3.0, passDist * 0.06);
              if (ball.vy > 2.6 && rand() < 0.42) {
                receiver.headerTimer = 0.42;
              }
              carrierIdx = nextIdx;
              passCooldown += flightTime * 0.92 + rand() * 0.35;
              soundEngine.playKick(0.75);
            } else {
              possessionTeam = carrier.team === 'HOME' ? 'AWAY' : 'HOME';
              carrierIdx = pickTargetActor(possessionTeam, -1, true);
              const interceptor = actors[carrierIdx];
              const lostPasser = statOf(carrier);
              if (lostPasser) lostPasser.passes++;
              const interceptStat = statOf(interceptor);
              if (interceptStat) interceptStat.defActions++;
              if (interceptor.team === 'HOME') homeDefActs++;
              else awayDefActs++;
              interceptor.tackleTimer = 0.48;
              ball.vx = (interceptor.x - ball.x) * 1.25;
              ball.vz = (interceptor.z - ball.z) * 1.25;
              ball.vy = 1.2;
              passCooldown += 0.72;
              soundEngine.playKick(0.85);
            }
          }
        }

        // Move & Animate Referee smoothly alongside active play
        const refTx = THREE.MathUtils.clamp(ball.x * 0.45 - 6.8, -HALF_PITCH_W * 0.72, HALF_PITCH_W * 0.72);
        const refTz = THREE.MathUtils.clamp(ball.z * 0.62, -HALF_PITCH_L * 0.68, HALF_PITCH_L * 0.68);
        const rdx = refTx - refState.x;
        const rdz = refTz - refState.z;
        const rdist = Math.hypot(rdx, rdz);
        refState.x = THREE.MathUtils.lerp(refState.x, refTx, Math.min(1, simDt * 3.5));
        refState.z = THREE.MathUtils.lerp(refState.z, refTz, Math.min(1, simDt * 3.5));
        refGroup.position.set(refState.x, 0, refState.z);
        refGroup.rotation.y = Math.atan2(ball.x - refState.x, ball.z - refState.z);
        {
          const moving = rdist > 0.25;
          const rSpeed = Math.min(5, rdist * 3.5);
          let rTarget: Target;
          if (moving) {
            refState.stride += (rSpeed * simDt * Math.PI * 2) / 1.5;
            rTarget = gaitTarget(refState.stride, Math.max(1.8, rSpeed));
          } else {
            rTarget = idleTarget(refState.animT, 0, false);
          }
          refState.animT += dt;
          approachPose(refState.pose, rTarget.pose, rTarget.rate, dt);
          refState.groundY += (groundOffset(refState.pose, rTarget.ground) - refState.groundY) * (1 - Math.exp(-25 * dt));
          applyPoseToRig(refState.parts, refState.pose, refState.groundY);
        }

        // Move & Animate 22 Articulated Humanoid Athletes
        const myTactics = mySide === 'HOME' ? ht : at;
        const pressDrain =
          myTactics.pressing === 'GEGENPRESS'
            ? 0.42
            : myTactics.pressing === 'HIGH'
            ? 0.31
            : 0.2;

        for (let i = 0; i < actors.length; i++) {
          const a = actors[i];
          const isCarrier = !pendingShot && kickoffResetTimer <= 0 && i === carrierIdx;
          a.carrierRing.visible = isCarrier;
          a.nameSprite.visible = showNames && (isCarrier || a.celebrateTimer > 0);

          if (a.team === mySide && !a.injured) {
            a.condition = Math.max(18, a.condition - pressDrain * simDt);
            if (a.condition < 54 && rand() < 0.0012 * simDt * 10) {
              a.injured = true;
              injuredIds.push(a.playerId);
              bannerText = `SAKATLANDI: ${a.name} — Değişiklik Önerilir!`;
              bannerTimer = 2.4;
              events.push({
                minute: currentMinute,
                type: 'INJURY',
                teamId: myClubId,
                playerName: a.name,
                detail: `${a.name} sakatlandı! Kenardan değişiklik bekleniyor.`,
              });
            }
          }

          const shiftZ = a.role === 'GK' ? 0 : ball.z * 0.46;
          const shiftX = a.role === 'GK' ? THREE.MathUtils.clamp(ball.x * 0.22, -3.1, 3.1) : ball.x * 0.36;

          const tx = isCarrier
            ? ball.x
            : THREE.MathUtils.clamp(a.baseX + shiftX, -HALF_PITCH_W * 0.92, HALF_PITCH_W * 0.92);
          const tz = isCarrier
            ? ball.z
            : THREE.MathUtils.clamp(a.baseZ + shiftZ, -HALF_PITCH_L * 0.96, HALF_PITCH_L * 0.96);

          const dx = tx - a.x;
          const dz = tz - a.z;
          const dist = Math.hypot(dx, dz);
          // True pro sprint speed scaled for 68x105m FIFA pitch (~7.5 - 9.8 m/s)
          const maxSpd = (a.injured ? 3.1 : 7.5 + (a.ovr - 70) * 0.1) * (a.condition < 55 ? 0.78 : 1.0);

          if (a.gltfRig && !a.gltfRig.isNamedMultiPartRig) {
            a.gltfRig.mixer.update(dt);
          }

          // Durum → hedef poz. Pozlar sönümlenerek uygulanır: geçişlerde sıçrama olmaz.
          let target: Target;
          if (a.celebrateTimer > 0) {
            a.celebrateTimer = Math.max(0, a.celebrateTimer - dt);
            target = celebrateTarget(a.celebrateStyle, a.celebrateTimer);
          } else if (a.diveTimer > 0) {
            a.diveTimer = Math.max(0, a.diveTimer - dt);
            target = diveTarget(1 - a.diveTimer / 0.55, a.diveDir);
          } else if (a.tackleTimer > 0) {
            a.tackleTimer = Math.max(0, a.tackleTimer - dt);
            target = tackleTarget(1 - a.tackleTimer / 0.48);
          } else if (a.headerTimer > 0) {
            a.headerTimer = Math.max(0, a.headerTimer - dt);
            target = headerTarget(1 - a.headerTimer / 0.42);
          } else if (a.kickTimer > 0) {
            a.kickTimer = Math.max(0, a.kickTimer - dt);
            target = kickTarget(Math.min(1, 1 - a.kickTimer / KICK_DUR));
          } else if (dist > 0.18) {
            const step = Math.min(dist, maxSpd * simDt);
            const speed = step / Math.max(0.001, simDt);
            a.vx = (dx / dist) * speed;
            a.vz = (dz / dist) * speed;
            a.x += (dx / dist) * step;
            a.z += (dz / dist) * step;
            a.group.rotation.y = dampAngle(a.group.rotation.y, Math.atan2(dx, dz), 11, dt);
            // Adım uzunluğu hızla büyür: ayak yerde kaymaz (faz mesafeye bağlı).
            const strideLen = a.injured ? 1.2 : 1.25 + 1.35 * Math.min(1, Math.max(0, (speed - 1) / 7));
            a.stridePhase += (step * Math.PI * 2) / strideLen;
            target = a.injured ? limpTarget(a.stridePhase) : gaitTarget(a.stridePhase, speed, a.style);
          } else {
            // Bekleme: nefes alır, topa doğru yavaşça döner, başıyla topu izler.
            const toBall = Math.atan2(ball.x - a.x, ball.z - a.z);
            a.group.rotation.y = dampAngle(a.group.rotation.y, toBall, 2.2, dt);
            target = idleTarget(a.animT, angleDiff(toBall, a.group.rotation.y), a.role === 'GK');
          }
          a.animT += dt;
          approachPose(a.pose, target.pose, target.rate, dt);
          a.groundY += (groundOffset(a.pose, target.ground) - a.groundY) * (1 - Math.exp(-25 * dt));
          applyPoseToRig(a, a.pose, a.groundY);

          a.group.position.set(a.x, 0, a.z);
        }

        if (currentMinute !== lastMinuteReported) {
          lastMinuteReported = currentMinute;
          emitSnapshot(currentMinute < 45 ? 'FIRST_HALF' : 'SECOND_HALF');
        }

        if (matchSeconds >= MATCH_DURATION_SIM_SEC) {
          finished = true;
          bannerText = 'MAÇ SONA ERDİ';
          soundEngine.playWhistle(true);
          emitSnapshot('FULL_TIME');
        }
      }

      // Independent Goal Net Ripple effect ONLY on the scored end
      if (netRippleHomeTimer > 0) {
        netRippleHomeTimer = Math.max(0, netRippleHomeTimer - dt);
        const sZ = 1 + Math.sin(netRippleHomeTimer * 26) * 0.14 * netRippleHomeTimer;
        stadium.goalNetGroups[0]?.scale.set(1, 1, sZ);
      } else {
        stadium.goalNetGroups[0]?.scale.set(1, 1, 1);
      }
      if (netRippleAwayTimer > 0) {
        netRippleAwayTimer = Math.max(0, netRippleAwayTimer - dt);
        const sZ = 1 + Math.sin(netRippleAwayTimer * 26) * 0.14 * netRippleAwayTimer;
        stadium.goalNetGroups[1]?.scale.set(1, 1, sZ);
      } else {
        stadium.goalNetGroups[1]?.scale.set(1, 1, 1);
      }

      // Sync real-time 2D Radar Telemetry
      if (propsRef.current.liveTelemetryRef) {
        propsRef.current.liveTelemetryRef.current = {
          ball: { x: ball.x, y: ball.y, z: ball.z },
          actors: actors.map((act, idx) => ({
            x: act.x,
            z: act.z,
            team: act.team,
            role: act.role,
            name: act.name,
            hasBall: !pendingShot && kickoffResetTimer <= 0 && idx === carrierIdx,
            condition: act.condition,
          })),
          referee: { x: refState.x, z: refState.z },
          homeColor: homeClub.primaryColor,
          awayColor: resolvedAwayKitHex,
          homeShort: homeDispShort,
          awayShort: awayDispShort,
        };
      }

      // Corner flags, LED ad & ribbon scroll, touchline manager & warming-up subs
      const tAnim = elapsedTimeSec;
      for (let cf = 0; cf < stadium.cornerFlags.length; cf++) {
        stadium.cornerFlags[cf].rotation.y = Math.sin(tAnim * 4.5 + cf) * 0.28;
      }
      stadium.ledTex.offset.x = (tAnim * 0.08) % 1;
      stadium.ribbonTex.offset.x = (tAnim * 0.04) % 1;
      stadium.adMat.emissiveIntensity = 0.45 + crowdExcitement * 0.5;

      managerGroup.position.z = -9.5 + Math.sin(tAnim * 0.9) * 1.6;
      managerHuman.armRPivot.rotation.x = -0.45 - Math.abs(Math.sin(tAnim * 2.4)) * 0.7;

      for (let wIdx = 0; wIdx < warmupSubs.length; wIdx++) {
        const ws = warmupSubs[wIdx];
        ws.group.position.z = ws.baseZ + Math.sin(tAnim * 1.8 + ws.phase) * 2.1;
        ws.group.position.y = Math.abs(Math.sin(tAnim * 6.5 + ws.phase)) * 0.09;
        const wSwing = Math.sin(tAnim * 7.2 + ws.phase);
        ws.parts.thighLPivot.rotation.x = wSwing * 0.55;
        ws.parts.thighRPivot.rotation.x = -wSwing * 0.55;
      }

      // InstancedMesh 3D Seated Spectator Crowd Wave Animation (bolted seats stay still, fans jump on excitement!)
      crowdExcitement = THREE.MathUtils.damp(crowdExcitement, 0, 1.4, dt);
      if (crowdExcitement > 0.04 && frameNo % crowdStride === 0) {
        const waveAmp = 0.08 + crowdExcitement * 0.36;
        const { torsoMesh, headMesh, entries } = stadium.crowdGroup;
        for (let i = 0; i < entries.length; i++) {
          const bp = entries[i];
          const bounce = Math.abs(Math.sin(tAnim * (3.2 + crowdExcitement * 4) + bp.phase)) * waveAmp;
          _dummy.position.set(bp.x, bp.y + bounce, bp.z);
          _dummy.rotation.set(0, bp.rotY, 0);
          _dummy.scale.setScalar(bp.scale);
          _dummy.updateMatrix();
          torsoMesh.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(bp.x, bp.y + bounce + 0.58 * bp.scale, bp.z);
          _dummy.updateMatrix();
          headMesh.setMatrixAt(i, _dummy.matrix);
        }
        torsoMesh.instanceMatrix.needsUpdate = true;
        headMesh.instanceMatrix.needsUpdate = true;
      }

      if (!replay && !isPaused && !finished && hitstopTimer <= 0) recordReplayFrame(dt);

      // Kamera: kurgu → hedef konum/bakış → uzaklık ve FOV ayarı → sönümlü takip (bakış noktası da yumuşatılır).
      const cs = propsRef.current.cameraSettings ?? DEFAULT_CAMERA_SETTINGS;
      const carrierActor = carrierIdx >= 0 ? actors[carrierIdx] : null;
      const effMode =
        replay
          ? 'sideline'
          : camMode === 'auto'
          ? director.pick({ pendingShot: pendingShot !== null, celebrating: actors.some((x) => x.celebrateTimer > 0) }, elapsedTimeSec)
          : camMode;
      const rig = applyDistance(
        cameraRig(effMode, {
          ball: replay ? { x: replayFrame[1], z: replayFrame[3] } : ball,
          carrier: carrierActor ? { x: carrierActor.x, z: carrierActor.z, vx: carrierActor.vx, vz: carrierActor.vz } : null,
          t: elapsedTimeSec,
          halfW: HALF_PITCH_W,
          halfL: HALF_PITCH_L,
        }),
        replay ? cs.distance * 0.85 : cs.distance
      );
      _camTargetPos.set(rig.pos[0], rig.pos[1], rig.pos[2]);
      _camLookTarget.set(rig.look[0], rig.look[1], rig.look[2]);
      if (!camInit) {
        camInit = true;
        _camLookSmooth.copy(_camLookTarget);
      }
      camera.position.lerp(_camTargetPos, 1 - Math.exp(-posRate(cs.smoothing) * dt));
      _camLookSmooth.lerp(_camLookTarget, 1 - Math.exp(-lookRate(cs.smoothing) * dt));
      if (Math.abs(camera.fov - cs.fov) > 0.05) {
        camera.fov += (cs.fov - camera.fov) * (1 - Math.exp(-8 * dt));
        camera.updateProjectionMatrix();
      }
      _v1.copy(_camLookSmooth);
      if (trauma > 0.01) {
        trauma = Math.max(0, trauma - dt * 1.4);
        if (cs.shake) {
          const shake = trauma * trauma * 0.95;
          _v1.x += (vfx() - 0.5) * shake;
          _v1.y += (vfx() - 0.5) * shake;
        }
      }
      camera.lookAt(_v1);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      soundEngine.stopCrowdAmbience();

      pitchMap.dispose();
      pitchBump.dispose();
      pitchRough.dispose();
      pitchGeo.dispose();
      pitchMat.dispose();
      stadium.dispose();
      humanGeos.dispose();
      ballMap.dispose();
      ballBump.dispose();
      ballGeo.dispose();
      ballMat.dispose();
      ballShadowGeo.dispose();
      extraMaterials.forEach((m) => m.dispose());
      extraTextures.forEach((t) => t.dispose());
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [homeClub.id, awayClub.id, crowdDensity, gltfModelUrl]);

  return <div ref={mountRef} data-testid="match-3d-canvas" className="absolute inset-0 w-full h-full" />;
};
