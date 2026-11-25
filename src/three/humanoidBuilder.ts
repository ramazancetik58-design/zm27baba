import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Player } from '../engine/types';
import { createKitTexture, createPlayerFaceTexture } from './webglUtils';

export interface SharedHumanoidGeometries {
  headGeo: THREE.SphereGeometry;
  noseGeo: THREE.ConeGeometry;
  earGeo: THREE.SphereGeometry;
  neckGeo: THREE.CylinderGeometry;
  torsoGeo: THREE.LatheGeometry;
  pelvisGeo: THREE.LatheGeometry;
  shoulderGeo: THREE.SphereGeometry;
  sleeveGeo: THREE.LatheGeometry;
  upperArmSkinGeo: THREE.LatheGeometry;
  elbowGeo: THREE.SphereGeometry;
  forearmGeo: THREE.LatheGeometry;
  handGeo: THREE.SphereGeometry;
  gloveGeo: THREE.SphereGeometry;
  thighShortsGeo: THREE.LatheGeometry;
  thighSkinGeo: THREE.LatheGeometry;
  kneeGeo: THREE.SphereGeometry;
  calfGeo: THREE.LatheGeometry;
  bootVampGeo: THREE.SphereGeometry;
  bootHeelGeo: THREE.CylinderGeometry;
  shadowGeo: THREE.CircleGeometry;
  ringGeo: THREE.RingGeometry;
  hairShortGeo: THREE.SphereGeometry;
  hairCurlyGeo: THREE.SphereGeometry;
  hairAfroGeo: THREE.SphereGeometry;
  hairMohawkGeo: THREE.TubeGeometry;
  dispose: () => void;
}

/**
 * Creates detailed 23-part non-box human body geometries (~1.82m standing height)
 * matching our /models/player.glb proportions for instant frame-1 rendering.
 */
export function createSharedHumanoidGeometries(): SharedHumanoidGeometries {
  const headGeo = new THREE.SphereGeometry(0.118, 24, 18, -Math.PI * 0.5, Math.PI * 2);
  const noseGeo = new THREE.ConeGeometry(0.022, 0.052, 8);
  noseGeo.rotateX(Math.PI * 0.52);
  const earGeo = new THREE.SphereGeometry(0.024, 10, 8);

  const neckGeo = new THREE.CylinderGeometry(0.056, 0.068, 0.13, 14);

  const torsoProfile = [
    new THREE.Vector2(0.001, -0.26),
    new THREE.Vector2(0.158, -0.25),
    new THREE.Vector2(0.154, -0.14),
    new THREE.Vector2(0.178, -0.01),
    new THREE.Vector2(0.212, 0.12),
    new THREE.Vector2(0.222, 0.20),
    new THREE.Vector2(0.165, 0.26),
    new THREE.Vector2(0.078, 0.29),
    new THREE.Vector2(0.001, 0.29),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 24, Math.PI * 0.5, Math.PI * 2);

  const pelvisProfile = [
    new THREE.Vector2(0.001, -0.11),
    new THREE.Vector2(0.172, -0.10),
    new THREE.Vector2(0.180, 0.0),
    new THREE.Vector2(0.162, 0.09),
    new THREE.Vector2(0.001, 0.10),
  ];
  const pelvisGeo = new THREE.LatheGeometry(pelvisProfile, 22);

  const shoulderGeo = new THREE.SphereGeometry(0.076, 12, 10);

  const sleeveGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.18),
      new THREE.Vector2(0.062, -0.17),
      new THREE.Vector2(0.068, -0.07),
      new THREE.Vector2(0.072, -0.01),
      new THREE.Vector2(0.001, 0.0),
    ],
    14,
  );

  const upperArmSkinGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.28),
      new THREE.Vector2(0.047, -0.27),
      new THREE.Vector2(0.055, -0.17),
      new THREE.Vector2(0.056, -0.14),
      new THREE.Vector2(0.001, -0.14),
    ],
    14,
  );

  const elbowGeo = new THREE.SphereGeometry(0.046, 10, 8);

  const forearmGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.26),
      new THREE.Vector2(0.034, -0.25),
      new THREE.Vector2(0.044, -0.12),
      new THREE.Vector2(0.049, -0.02),
      new THREE.Vector2(0.001, 0.0),
    ],
    14,
  );

  const handGeo = new THREE.SphereGeometry(0.046, 10, 8);
  const gloveGeo = new THREE.SphereGeometry(0.065, 12, 10);

  const thighShortsGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.29),
      new THREE.Vector2(0.088, -0.28),
      new THREE.Vector2(0.098, -0.14),
      new THREE.Vector2(0.102, -0.01),
      new THREE.Vector2(0.001, 0.0),
    ],
    16,
  );

  const thighSkinGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.41),
      new THREE.Vector2(0.062, -0.40),
      new THREE.Vector2(0.076, -0.31),
      new THREE.Vector2(0.082, -0.26),
      new THREE.Vector2(0.001, -0.26),
    ],
    16,
  );

  const kneeGeo = new THREE.SphereGeometry(0.060, 12, 10);

  const calfGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.41),
      new THREE.Vector2(0.042, -0.40),
      new THREE.Vector2(0.052, -0.27),
      new THREE.Vector2(0.069, -0.14),
      new THREE.Vector2(0.062, -0.03),
      new THREE.Vector2(0.001, 0.0),
    ],
    16,
  );

  const bootVampGeo = new THREE.SphereGeometry(0.062, 14, 10);
  const bootHeelGeo = new THREE.CylinderGeometry(0.046, 0.050, 0.085, 12);

  const shadowGeo = new THREE.CircleGeometry(0.5, 20);
  shadowGeo.rotateX(-Math.PI / 2);

  const ringGeo = new THREE.RingGeometry(0.56, 0.74, 28);
  ringGeo.rotateX(-Math.PI / 2);

  const hairShortGeo = new THREE.SphereGeometry(0.124, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.44);
  const hairCurlyGeo = new THREE.SphereGeometry(0.134, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.50);
  const hairAfroGeo = new THREE.SphereGeometry(0.152, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const mohawkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.03, 0.09),
    new THREE.Vector3(0, 0.145, 0.03),
    new THREE.Vector3(0, 0.15, -0.045),
    new THREE.Vector3(0, 0.06, -0.12),
  ]);
  const hairMohawkGeo = new THREE.TubeGeometry(mohawkCurve, 14, 0.034, 10, false);

  return {
    headGeo,
    noseGeo,
    earGeo,
    neckGeo,
    torsoGeo,
    pelvisGeo,
    shoulderGeo,
    sleeveGeo,
    upperArmSkinGeo,
    elbowGeo,
    forearmGeo,
    handGeo,
    gloveGeo,
    thighShortsGeo,
    thighSkinGeo,
    kneeGeo,
    calfGeo,
    bootVampGeo,
    bootHeelGeo,
    shadowGeo,
    ringGeo,
    hairShortGeo,
    hairCurlyGeo,
    hairAfroGeo,
    hairMohawkGeo,
    dispose: () => {
      headGeo.dispose();
      noseGeo.dispose();
      earGeo.dispose();
      neckGeo.dispose();
      torsoGeo.dispose();
      pelvisGeo.dispose();
      shoulderGeo.dispose();
      sleeveGeo.dispose();
      upperArmSkinGeo.dispose();
      elbowGeo.dispose();
      forearmGeo.dispose();
      handGeo.dispose();
      gloveGeo.dispose();
      thighShortsGeo.dispose();
      thighSkinGeo.dispose();
      kneeGeo.dispose();
      calfGeo.dispose();
      bootVampGeo.dispose();
      bootHeelGeo.dispose();
      shadowGeo.dispose();
      ringGeo.dispose();
      hairShortGeo.dispose();
      hairCurlyGeo.dispose();
      hairAfroGeo.dispose();
      hairMohawkGeo.dispose();
    },
  };
}

export interface ArticulatedHumanoidParts {
  bodyGroup: THREE.Group;
  armLPivot: THREE.Group;
  armRPivot: THREE.Group;
  thighLPivot: THREE.Group;
  thighRPivot: THREE.Group;
  calfLPivot: THREE.Group;
  calfRPivot: THREE.Group;
  /** Omurga: gövde/kol/baş bu eklemde öne eğilir ve döner (bacaklardan bağımsız). */
  spinePivot?: THREE.Group;
  foreLPivot?: THREE.Group;
  foreRPivot?: THREE.Group;
  headPivot?: THREE.Group;
  headMesh: THREE.Mesh;
  hairMesh: THREE.Mesh;
  headMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshStandardMaterial;
  torsoMat: THREE.MeshStandardMaterial;
  sleeveMat: THREE.MeshStandardMaterial;
  shortsMat: THREE.MeshStandardMaterial;
  sockMat: THREE.MeshStandardMaterial;
}

/**
 * Gövde, boyun, baş ve kolları kalça hizasındaki bir "SpinePivot" altına alır; böylece gövde
 * bacaklardan bağımsız eğilir/döner. GLB ve prosedürel rig için aynı adlandırmayı kullanır.
 */
export function ensureSpinePivot(body: THREE.Object3D, pivotY = 0.95): THREE.Group {
  const existing = body.getObjectByName('SpinePivot') as THREE.Group | undefined;
  if (existing) return existing;
  const spine = new THREE.Group();
  spine.name = 'SpinePivot';
  spine.position.set(0, pivotY, 0);
  for (const name of ['Torso', 'Neck', 'HeadPivot', 'ArmLPivot', 'ArmRPivot']) {
    const n = body.children.find((c) => c.name === name);
    if (n) {
      body.remove(n);
      n.position.y -= pivotY;
      spine.add(n);
    }
  }
  body.add(spine);
  return spine;
}

export interface HumanoidGltfRigHandle {
  modelRoot: THREE.Object3D;
  isNamedMultiPartRig: boolean;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  parts?: ArticulatedHumanoidParts;
}

/**
 * GLTFLoader + SkeletonUtils controller loading /models/player.glb (or a custom external .glb).
 * Supports both our 23-part named articulated glTF humanoid (binding custom face/kit textures per player)
 * and any external SkinnedMesh Mixamo/ReadyPlayerMe .glb character via AnimationMixer.
 */
export class HumanoidGltfController {
  private loader: GLTFLoader;
  private cache = new Map<string, Promise<GLTF | null>>();

  constructor() {
    this.loader = new GLTFLoader();
  }

  public loadGltfTemplate(url = '/models/player.glb'): Promise<GLTF | null> {
    const existing = this.cache.get(url);
    if (existing) return existing;

    const promise = this.loader
      .loadAsync(url)
      .then((gltf) => {
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        return gltf;
      })
      .catch(() => null);

    this.cache.set(url, promise);
    return promise;
  }

  public instantiateClone(
    gltf: GLTF,
    geos: SharedHumanoidGeometries,
    options: {
      kitPrimaryHex: string;
      kitSecondaryHex: string;
      kitAccentHex: string;
      shortsHex: string;
      sockHex: string;
      squadNumber: number;
      clubShort: string;
      skinToneHex: string;
      hairColorHex: string;
      bootColorHex: string;
      hairStyle: Player['appearance']['hairStyle'];
      facialHair: Player['appearance']['facialHair'];
      isGK: boolean;
      seed: number;
      gloveMat?: THREE.Material;
      extraMaterials: THREE.Material[];
      extraTextures: THREE.Texture[];
    },
    targetHeight = 1.82,
  ): HumanoidGltfRigHandle {
    const cloned = SkeletonUtils.clone(gltf.scene);
    const bodyGroup = cloned.getObjectByName('BodyGroup') as THREE.Group | undefined;
    const armLPivot = cloned.getObjectByName('ArmLPivot') as THREE.Group | undefined;
    const armRPivot = cloned.getObjectByName('ArmRPivot') as THREE.Group | undefined;
    const thighLPivot = cloned.getObjectByName('ThighLPivot') as THREE.Group | undefined;
    const thighRPivot = cloned.getObjectByName('ThighRPivot') as THREE.Group | undefined;
    const calfLPivot = cloned.getObjectByName('CalfLPivot') as THREE.Group | undefined;
    const calfRPivot = cloned.getObjectByName('CalfRPivot') as THREE.Group | undefined;
    const headMesh = cloned.getObjectByName('Head') as THREE.Mesh | undefined;
    const hairMesh = cloned.getObjectByName('Hair') as THREE.Mesh | undefined;
    const foreLPivot = cloned.getObjectByName('ForearmLPivot') as THREE.Group | undefined;
    const foreRPivot = cloned.getObjectByName('ForearmRPivot') as THREE.Group | undefined;
    const headPivot = cloned.getObjectByName('HeadPivot') as THREE.Group | undefined;

    const mixer = new THREE.AnimationMixer(cloned);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of gltf.animations) {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    }

    const isNamed = Boolean(
      bodyGroup && armLPivot && armRPivot && thighLPivot && thighRPivot && calfLPivot && calfRPivot && headMesh && hairMesh,
    );

    if (isNamed && bodyGroup && armLPivot && armRPivot && thighLPivot && thighRPivot && calfLPivot && calfRPivot && headMesh && hairMesh) {
      const faceTex = createPlayerFaceTexture(
        options.skinToneHex,
        options.hairColorHex,
        options.facialHair,
        options.seed,
      );
      const kitTex = createKitTexture(
        options.kitPrimaryHex,
        options.kitSecondaryHex,
        options.kitAccentHex,
        options.squadNumber,
        options.clubShort,
        options.seed,
      );
      options.extraTextures.push(faceTex, kitTex);

      const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.54, metalness: 0.02 });
      const skinMat = new THREE.MeshStandardMaterial({ color: options.skinToneHex, roughness: 0.58, metalness: 0.02 });
      const hairMat = new THREE.MeshStandardMaterial({ color: options.hairColorHex, roughness: 0.78 });
      const bootMat = new THREE.MeshStandardMaterial({ color: options.bootColorHex, roughness: 0.30, metalness: 0.16 });
      const torsoMat = new THREE.MeshStandardMaterial({ map: kitTex, roughness: 0.58, metalness: 0.04 });
      const sleeveMat = new THREE.MeshStandardMaterial({ color: options.kitPrimaryHex, roughness: 0.58 });
      const shortsMat = new THREE.MeshStandardMaterial({ color: options.shortsHex, roughness: 0.65 });
      const sockMat = new THREE.MeshStandardMaterial({ color: options.sockHex, roughness: 0.72 });
      options.extraMaterials.push(headMat, skinMat, hairMat, bootMat, torsoMat, sleeveMat, shortsMat, sockMat);

      const bindMat = (name: string, mat: THREE.Material) => {
        const m = cloned.getObjectByName(name) as THREE.Mesh | undefined;
        if (m) {
          m.material = mat;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      };

      bindMat('Torso', torsoMat);
      bindMat('Head', headMat);
      bindMat('Hair', hairMat);
      bindMat('Pelvis', shortsMat);
      ['ShoulderL', 'ShoulderR', 'SleeveL', 'SleeveR'].forEach((n) => bindMat(n, sleeveMat));
      ['Neck', 'Nose', 'EarL', 'EarR', 'UpperArmL', 'UpperArmR', 'ElbowL', 'ElbowR', 'ForearmL', 'ForearmR', 'ThighSkinL', 'ThighSkinR', 'KneeL', 'KneeR'].forEach((n) =>
        bindMat(n, skinMat),
      );
      ['ThighShortsL', 'ThighShortsR'].forEach((n) => bindMat(n, shortsMat));
      ['CalfL', 'CalfR'].forEach((n) => bindMat(n, sockMat));
      ['BootHeelL', 'BootHeelR', 'BootVampL', 'BootVampR'].forEach((n) => bindMat(n, bootMat));

      const handL = cloned.getObjectByName('HandL') as THREE.Mesh | undefined;
      const handR = cloned.getObjectByName('HandR') as THREE.Mesh | undefined;
      const gloveL = cloned.getObjectByName('GloveL') as THREE.Mesh | undefined;
      const gloveR = cloned.getObjectByName('GloveR') as THREE.Mesh | undefined;
      if (handL && handR) {
        handL.material = skinMat;
        handR.material = skinMat;
        handL.visible = !options.isGK;
        handR.visible = !options.isGK;
      }
      if (gloveL && gloveR) {
        if (options.gloveMat) {
          gloveL.material = options.gloveMat;
          gloveR.material = options.gloveMat;
        }
        gloveL.visible = options.isGK;
        gloveR.visible = options.isGK;
      }

      hairMesh.visible = options.hairStyle !== 'BALD';
      hairMesh.geometry =
        options.hairStyle === 'AFRO'
          ? geos.hairAfroGeo
          : options.hairStyle === 'CURLY'
          ? geos.hairCurlyGeo
          : options.hairStyle === 'MOHAWK'
          ? geos.hairMohawkGeo
          : geos.hairShortGeo;

      return {
        modelRoot: cloned,
        isNamedMultiPartRig: true,
        mixer,
        actions,
        parts: {
          bodyGroup,
          armLPivot,
          armRPivot,
          spinePivot: ensureSpinePivot(bodyGroup),
          foreLPivot,
          foreRPivot,
          headPivot,
          thighLPivot,
          thighRPivot,
          calfLPivot,
          calfRPivot,
          headMesh,
          hairMesh,
          headMat,
          skinMat,
          hairMat,
          bootMat,
          torsoMat,
          sleeveMat,
          shortsMat,
          sockMat,
        },
      };
    }

    // Arbitrary external GLB (e.g., Mixamo / ReadyPlayerMe character) auto-scaled to 1.82m
    const box = new THREE.Box3().setFromObject(cloned);
    const h = Math.max(0.1, box.max.y - box.min.y);
    cloned.scale.setScalar(targetHeight / h);
    cloned.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return { modelRoot: cloned, isNamedMultiPartRig: false, mixer, actions };
  }
}

/**
 * Fallback/instant frame-1 23-part non-box anatomical footballer builder (~1.82m)
 * while /models/player.glb loads asynchronously via GLTFLoader.
 */
export function buildArticulatedHumanoid(
  geos: SharedHumanoidGeometries,
  options: {
    kitPrimaryHex: string;
    kitSecondaryHex: string;
    kitAccentHex: string;
    shortsHex: string;
    sockHex: string;
    squadNumber: number;
    clubShort: string;
    skinToneHex: string;
    hairColorHex: string;
    bootColorHex: string;
    hairStyle: Player['appearance']['hairStyle'];
    facialHair: Player['appearance']['facialHair'];
    isGK: boolean;
    seed: number;
    gloveMat?: THREE.Material;
    extraMaterials: THREE.Material[];
    extraTextures: THREE.Texture[];
  },
): ArticulatedHumanoidParts {
  const bodyGroup = new THREE.Group();

  const faceTex = createPlayerFaceTexture(
    options.skinToneHex,
    options.hairColorHex,
    options.facialHair,
    options.seed,
  );
  const kitTex = createKitTexture(
    options.kitPrimaryHex,
    options.kitSecondaryHex,
    options.kitAccentHex,
    options.squadNumber,
    options.clubShort,
    options.seed,
  );
  options.extraTextures.push(faceTex, kitTex);

  const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.54, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: options.skinToneHex, roughness: 0.58, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: options.hairColorHex, roughness: 0.78 });
  const bootMat = new THREE.MeshStandardMaterial({ color: options.bootColorHex, roughness: 0.30, metalness: 0.16 });
  const torsoMat = new THREE.MeshStandardMaterial({ map: kitTex, roughness: 0.58, metalness: 0.04 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: options.kitPrimaryHex, roughness: 0.58 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: options.shortsHex, roughness: 0.65 });
  const sockMat = new THREE.MeshStandardMaterial({ color: options.sockHex, roughness: 0.72 });
  options.extraMaterials.push(headMat, skinMat, hairMat, bootMat, torsoMat, sleeveMat, shortsMat, sockMat);

  const makeLeg = (xOff: number) => {
    const thighPivot = new THREE.Group();
    thighPivot.position.set(xOff, 0.89, 0);

    const thighShorts = new THREE.Mesh(geos.thighShortsGeo, shortsMat);
    thighShorts.scale.set(1.0, 1.0, 1.06);
    thighShorts.castShadow = true;
    thighPivot.add(thighShorts);

    const thighSkin = new THREE.Mesh(geos.thighSkinGeo, skinMat);
    thighSkin.castShadow = true;
    thighPivot.add(thighSkin);

    const kneeMesh = new THREE.Mesh(geos.kneeGeo, skinMat);
    kneeMesh.position.y = -0.41;
    thighPivot.add(kneeMesh);

    const calfPivot = new THREE.Group();
    calfPivot.position.y = -0.41;

    const calfMesh = new THREE.Mesh(geos.calfGeo, sockMat);
    calfMesh.castShadow = true;
    calfPivot.add(calfMesh);

    const heel = new THREE.Mesh(geos.bootHeelGeo, bootMat);
    heel.position.set(0, -0.405, -0.01);
    heel.castShadow = true;
    calfPivot.add(heel);

    const vamp = new THREE.Mesh(geos.bootVampGeo, bootMat);
    vamp.scale.set(0.86, 0.56, 2.08);
    vamp.position.set(0, -0.445, 0.075);
    vamp.castShadow = true;
    calfPivot.add(vamp);

    thighPivot.add(calfPivot);
    return { thighPivot, calfPivot };
  };

  const leftLeg = makeLeg(-0.112);
  const rightLeg = makeLeg(0.112);
  bodyGroup.add(leftLeg.thighPivot, rightLeg.thighPivot);

  const pelvis = new THREE.Mesh(geos.pelvisGeo, shortsMat);
  pelvis.position.y = 0.91;
  pelvis.scale.set(1.06, 1.0, 0.76);
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  const torso = new THREE.Mesh(geos.torsoGeo, torsoMat);
  torso.position.y = 1.22;
  torso.scale.set(1.08, 1.0, 0.70);
  torso.castShadow = true;
  torso.name = 'Torso';
  bodyGroup.add(torso);

  const makeArm = (xOff: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 1.43, 0);

    const shoulder = new THREE.Mesh(geos.shoulderGeo, sleeveMat);
    shoulder.castShadow = true;
    armPivot.add(shoulder);

    const sleeve = new THREE.Mesh(geos.sleeveGeo, sleeveMat);
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const upperArm = new THREE.Mesh(geos.upperArmSkinGeo, skinMat);
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const elbow = new THREE.Mesh(geos.elbowGeo, skinMat);
    elbow.position.y = -0.28;
    armPivot.add(elbow);

    // Dirsek eklemi (GLB'deki ForearmL/RPivot ile aynı konum): önkol ve el burada bükülür.
    const forePivot = new THREE.Group();
    forePivot.position.y = -0.28;
    armPivot.add(forePivot);

    const forearm = new THREE.Mesh(geos.forearmGeo, skinMat);
    forearm.castShadow = true;
    forePivot.add(forearm);

    if (options.isGK && options.gloveMat) {
      const glove = new THREE.Mesh(geos.gloveGeo, options.gloveMat);
      glove.scale.set(0.86, 1.24, 0.58);
      glove.position.set(0, -0.28, 0.015);
      forePivot.add(glove);
    } else {
      const hand = new THREE.Mesh(geos.handGeo, skinMat);
      hand.scale.set(0.75, 1.18, 0.52);
      hand.position.set(0, -0.28, 0.014);
      forePivot.add(hand);
    }
    return { armPivot, forePivot };
  };
  const armL = makeArm(-0.265);
  const armR = makeArm(0.265);
  const armLPivot = armL.armPivot;
  const armRPivot = armR.armPivot;
  armLPivot.name = 'ArmLPivot';
  armRPivot.name = 'ArmRPivot';
  bodyGroup.add(armLPivot, armRPivot);

  const neck = new THREE.Mesh(geos.neckGeo, skinMat);
  neck.position.y = 1.52;
  neck.name = 'Neck';
  bodyGroup.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.68;
  headPivot.name = 'HeadPivot';
  bodyGroup.add(headPivot);

  const headMesh = new THREE.Mesh(geos.headGeo, headMat);
  headMesh.scale.set(0.84, 1.08, 0.96);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  const noseMesh = new THREE.Mesh(geos.noseGeo, skinMat);
  noseMesh.position.set(0, -0.008, 0.116);
  headPivot.add(noseMesh);

  const earL = new THREE.Mesh(geos.earGeo, skinMat);
  earL.scale.set(0.45, 1.05, 0.72);
  earL.position.set(-0.098, -0.006, 0.0);
  const earR = new THREE.Mesh(geos.earGeo, skinMat);
  earR.scale.set(0.45, 1.05, 0.72);
  earR.position.set(0.098, -0.006, 0.0);
  headPivot.add(earL, earR);

  const hairMesh = new THREE.Mesh(
    options.hairStyle === 'AFRO'
      ? geos.hairAfroGeo
      : options.hairStyle === 'CURLY'
      ? geos.hairCurlyGeo
      : options.hairStyle === 'MOHAWK'
      ? geos.hairMohawkGeo
      : geos.hairShortGeo,
    hairMat,
  );
  hairMesh.scale.set(0.85, 1.05, 0.97);
  hairMesh.position.y = 0.006;
  hairMesh.visible = options.hairStyle !== 'BALD';
  headPivot.add(hairMesh);

  const spinePivot = ensureSpinePivot(bodyGroup);
  return {
    bodyGroup,
    armLPivot,
    armRPivot,
    spinePivot,
    foreLPivot: armL.forePivot,
    foreRPivot: armR.forePivot,
    headPivot,
    thighLPivot: leftLeg.thighPivot,
    thighRPivot: rightLeg.thighPivot,
    calfLPivot: leftLeg.calfPivot,
    calfRPivot: rightLeg.calfPivot,
    headMesh,
    hairMesh,
    headMat,
    skinMat,
    hairMat,
    bootMat,
    torsoMat,
    sleeveMat,
    shortsMat,
    sockMat,
  };
}
