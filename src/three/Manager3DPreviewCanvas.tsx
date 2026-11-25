import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ManagerAppearance, ManagerPersonality } from '../engine/types';
import {
  afterDraw,
  applyStudioEnvironment,
  createStudioRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

export type ManagerCamPreset = 'FULL' | 'HEAD' | 'SIDE';

interface Manager3DPreviewCanvasProps {
  appearance: ManagerAppearance;
  personality: ManagerPersonality;
  age: number;
  cameraPreset: ManagerCamPreset;
}

interface ManagerRigRefs {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  armLPivot: THREE.Group;
  armRPivot: THREE.Group;
  suitGroup: THREE.Group;
  tracksuitGroup: THREE.Group;
  turtleneckGroup: THREE.Group;
  clipboardGroup: THREE.Group;
  glassesGroup: THREE.Group;
  hairVariants: {
    SHORT: THREE.Group;
    FADE: THREE.Group;
    CURLY: THREE.Group;
    MOHAWK: THREE.Group;
    PONYTAIL: THREE.Group;
    AFRO: THREE.Group;
  };
  stubbleMesh: THREE.Mesh;
  beardGroup: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  beardMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  trouserMat: THREE.MeshStandardMaterial;
  sleeveMat: THREE.MeshStandardMaterial;
}

export const Manager3DPreviewCanvas: React.FC<Manager3DPreviewCanvasProps> = ({
  appearance,
  personality,
  age,
  cameraPreset,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<ManagerRigRefs | null>(null);
  const targetCamRef = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 }>({
    pos: new THREE.Vector3(0.78, 1.32, 3.05),
    look: new THREE.Vector3(0, 0.94, 0),
  });
  const propsRef = useRef({ appearance, personality, age });
  propsRef.current = { appearance, personality, age };

  // Update camera target on preset change
  useEffect(() => {
    if (cameraPreset === 'HEAD') {
      targetCamRef.current = {
        pos: new THREE.Vector3(0.32, 1.62, 1.32),
        look: new THREE.Vector3(0, 1.52, 0),
      };
    } else if (cameraPreset === 'SIDE') {
      targetCamRef.current = {
        pos: new THREE.Vector3(2.15, 1.3, 1.55),
        look: new THREE.Vector3(0, 0.98, 0),
      };
    } else {
      targetCamRef.current = {
        pos: new THREE.Vector3(0.78, 1.32, 3.05),
        look: new THREE.Vector3(0, 0.94, 0),
      };
    }
  }, [cameraPreset]);

  // Apply live customization updates to existing Three.js rig without recreating WebGL context
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;

    rig.skinMat.color.set(appearance.skinTone);
    const hairCol = new THREE.Color(appearance.hairColor);
    if (age >= 54) {
      hairCol.lerp(new THREE.Color('#cbd5e1'), Math.min(0.45, (age - 52) * 0.025));
    }
    rig.hairMat.color.copy(hairCol);
    rig.beardMat.color.copy(hairCol);

    // Outfit visibility, sleeve & footwear styling
    rig.suitGroup.visible = appearance.outfit === 'SUIT';
    rig.tracksuitGroup.visible = appearance.outfit === 'TRACKSUIT';
    rig.turtleneckGroup.visible = appearance.outfit === 'TURTLENECK';

    const outfitHex =
      appearance.outfit === 'TRACKSUIT' ? '#1e293b' : appearance.outfit === 'TURTLENECK' ? '#18181b' : '#0f172a';
    rig.sleeveMat.color.set(outfitHex);
    rig.trouserMat.color.set(outfitHex);
    rig.shoeMat.color.set(appearance.outfit === 'TRACKSUIT' ? '#e2e8f0' : '#111827');

    // Glasses
    rig.glassesGroup.visible = appearance.glasses;

    // Hair style
    (Object.keys(rig.hairVariants) as Array<keyof typeof rig.hairVariants>).forEach((k) => {
      rig.hairVariants[k].visible = appearance.hairStyle === k;
    });

    // Facial hair
    rig.stubbleMesh.visible = appearance.facialHair === 'STUBBLE';
    rig.beardGroup.visible = appearance.facialHair === 'BEARD';

    // Personality pose & clipboard
    rig.clipboardGroup.visible = personality === 'TACTICIAN';
  }, [appearance, personality, age]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(container, isSoftwareGl);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091119');
    scene.fog = new THREE.Fog('#091119', 5.5, 14);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      36,
      (container.clientWidth || 460) / (container.clientHeight || 520),
      0.1,
      40
    );
    camera.position.copy(targetCamRef.current.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(targetCamRef.current.look);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.85;
    controls.maxDistance = 4.2;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.update();

    // 3-Point Studio Lighting (Warm Key + Cool Fill + Cyan Edge Rim)
    const hemi = new THREE.HemisphereLight('#93c5fd', '#0f172a', 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 2.2);
    keyLight.position.set(2.4, 3.8, 2.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#00e5ff', 1.45);
    rimLight.position.set(-2.5, 2.4, -2.2);
    scene.add(rimLight);

    const backAccent = new THREE.PointLight('#b7ff4a', 1.0, 8);
    backAccent.position.set(1.6, 1.5, -2.0);
    scene.add(backAccent);

    // Architectural Studio Pedestal + Pitch Grid Ring
    const floorMesh = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 48),
      new THREE.MeshStandardMaterial({ color: '#0b1520', roughness: 0.85, metalness: 0.1 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.74, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: '#111b21', roughness: 0.35, metalness: 0.6 })
    );
    plinth.position.y = 0.04;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const limeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.012, 12, 64),
      new THREE.MeshStandardMaterial({
        color: '#b7ff4a',
        emissive: '#b7ff4a',
        emissiveIntensity: 0.55,
        roughness: 0.25,
      })
    );
    limeRing.rotation.x = Math.PI / 2;
    limeRing.position.y = 0.082;
    scene.add(limeRing);

    const cyanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.008, 12, 64),
      new THREE.MeshStandardMaterial({
        color: '#00e5ff',
        emissive: '#00e5ff',
        emissiveIntensity: 0.45,
        roughness: 0.3,
      })
    );
    cyanRing.rotation.x = Math.PI / 2;
    cyanRing.position.y = 0.015;
    scene.add(cyanRing);

    // Contact shadow disc under feet
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 32),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.42 })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.084;
    scene.add(contactShadow);

    // --- COMPOSITE ARTICULATED 3D MANAGER FIGURE ---
    const skinMat = new THREE.MeshStandardMaterial({ color: propsRef.current.appearance.skinTone, roughness: 0.58 });
    const hairMat = new THREE.MeshStandardMaterial({ color: propsRef.current.appearance.hairColor, roughness: 0.72 });
    const beardMat = new THREE.MeshStandardMaterial({ color: propsRef.current.appearance.hairColor, roughness: 0.85 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.65 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.58 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.28, metalness: 0.25 });

    const root = new THREE.Group();
    root.position.y = 0.08;
    scene.add(root);

    // Sculpted Capsule Legs & Contoured Dress/Athletic Shoes
    [-0.105, 0.105].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, 0.66, 10, 16), trouserMat);
      leg.position.set(lx, 0.43, 0);
      leg.castShadow = true;
      root.add(leg);

      const shoeSole = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.12, 8, 12), shoeMat);
      shoeSole.rotation.x = Math.PI / 2;
      shoeSole.scale.set(1.05, 1.0, 0.58);
      shoeSole.position.set(lx, 0.036, 0.045);
      shoeSole.castShadow = true;
      root.add(shoeSole);
    });

    // Pelvis / Belt
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.165, 0.16, 18), trouserMat);
    pelvis.position.y = 0.84;
    pelvis.castShadow = true;
    root.add(pelvis);

    const beltMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.5 });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.179, 0.179, 0.035, 18), beltMat);
    belt.position.y = 0.88;
    root.add(belt);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.02),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
    );
    buckle.position.set(0, 0.88, 0.178);
    root.add(buckle);

    // Upper Torso Container (breathing pivot)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.9;
    root.add(torsoGroup);

    // 1. SUIT OUTFIT (Tailored double-button blazer, silk tie knot + blade, crisp collar & pocket square)
    const suitGroup = new THREE.Group();
    const jacketMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.56, metalness: 0.1 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 });
    const tieMat = new THREE.MeshStandardMaterial({ color: '#00e5ff', roughness: 0.32, metalness: 0.22 });
    const btnMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.25, metalness: 0.8 });

    const blazerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.195, 0.26, 12, 22), jacketMat);
    blazerBody.scale.set(1.12, 1.02, 0.72);
    blazerBody.position.y = 0.25;
    blazerBody.castShadow = true;
    suitGroup.add(blazerBody);

    const blazerSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.215, 0.18, 22), jacketMat);
    blazerSkirt.scale.set(1.06, 1, 0.72);
    blazerSkirt.position.y = 0.04;
    suitGroup.add(blazerSkirt);

    const shirtFront = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 16), shirtMat);
    shirtFront.rotation.z = Math.PI;
    shirtFront.scale.set(0.95, 1, 0.28);
    shirtFront.position.set(0, 0.36, 0.128);
    suitGroup.add(shirtFront);

    const tieKnot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), tieMat);
    tieKnot.position.set(0, 0.445, 0.148);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.22, 10), tieMat);
    tie.scale.set(1, 1, 0.45);
    tie.position.set(0, 0.33, 0.146);
    suitGroup.add(tieKnot, tie);

    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.22, 6, 10), jacketMat);
      lapel.scale.set(1.05, 1, 0.45);
      lapel.position.set(side * 0.068, 0.355, 0.136);
      lapel.rotation.z = side * 0.24;
      suitGroup.add(lapel);
    });
    [0.14, 0.22].forEach((by) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 12), btnMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, 0.148);
      suitGroup.add(btn);
    });
    const pocketSquare = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.02, 0.014), tieMat);
    pocketSquare.position.set(0.095, 0.355, 0.142);
    pocketSquare.rotation.z = -0.18;
    suitGroup.add(pocketSquare);
    torsoGroup.add(suitGroup);

    // 2. TRACKSUIT OUTFIT (Contoured zip jacket, piped shoulder stripes & club crest badge)
    const tracksuitGroup = new THREE.Group();
    const trackMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42 });
    const voltMat = new THREE.MeshStandardMaterial({
      color: '#b7ff4a',
      emissive: '#b7ff4a',
      emissiveIntensity: 0.18,
      roughness: 0.3,
    });
    const trackBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.198, 0.26, 12, 22), trackMat);
    trackBody.scale.set(1.12, 1.02, 0.74);
    trackBody.position.y = 0.25;
    trackBody.castShadow = true;
    tracksuitGroup.add(trackBody);

    const zipper = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.43, 8), voltMat);
    zipper.position.set(0, 0.25, 0.148);
    tracksuitGroup.add(zipper);

    const trackCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 16), voltMat);
    trackCrest.rotation.x = Math.PI / 2;
    trackCrest.position.set(0.09, 0.35, 0.142);
    tracksuitGroup.add(trackCrest);

    const trackCollar = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.022, 10, 20), trackMat);
    trackCollar.rotation.x = Math.PI / 2;
    trackCollar.position.y = 0.485;
    tracksuitGroup.add(trackCollar);

    [-1, 1].forEach((side) => {
      const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.1, 6, 8), voltMat);
      stripe.position.set(side * 0.155, 0.44, 0);
      stripe.rotation.z = side * 1.15;
      tracksuitGroup.add(stripe);
    });
    torsoGroup.add(tracksuitGroup);

    // 3. TURTLENECK + TAILORED OVERCOAT OUTFIT
    const turtleneckGroup = new THREE.Group();
    const knitMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.88 });
    const coatMat = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.72 });
    const knitBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.188, 0.25, 12, 20), knitMat);
    knitBody.scale.set(1.08, 1.0, 0.71);
    knitBody.position.y = 0.24;
    knitBody.castShadow = true;
    turtleneckGroup.add(knitBody);

    [-1, 1].forEach((side) => {
      const coatFlap = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.36, 10, 14), coatMat);
      coatFlap.scale.set(1.1, 1, 0.55);
      coatFlap.position.set(side * 0.115, 0.21, 0.065);
      coatFlap.castShadow = true;
      turtleneckGroup.add(coatFlap);
    });

    const turtleCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.09, 0.088, 20), knitMat);
    turtleCollar.position.y = 0.505;
    turtleneckGroup.add(turtleCollar);
    torsoGroup.add(turtleneckGroup);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.12, 16), skinMat);
    neck.position.y = 0.53;
    torsoGroup.add(neck);

    // Articulated Arms with Rounded Shoulders + Wristwatch
    const createArm = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.215, 0.445, 0);

      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 14), sleeveMat);
      shoulder.scale.set(0.92, 1.05, 0.92);
      shoulder.castShadow = true;
      pivot.add(shoulder);

      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.28, 14), sleeveMat);
      upperArm.position.y = -0.14;
      upperArm.castShadow = true;
      pivot.add(upperArm);

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 12), sleeveMat);
      elbow.position.y = -0.27;
      pivot.add(elbow);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.038, 0.25, 14), sleeveMat);
      forearm.position.set(0, -0.37, 0.03);
      forearm.rotation.x = -0.22;
      forearm.castShadow = true;
      pivot.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), skinMat);
      hand.position.set(0, -0.495, 0.06);
      pivot.add(hand);

      if (side === -1) {
        const watch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.044, 0.044, 0.022, 14),
          new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
        );
        watch.position.set(0, -0.445, 0.048);
        watch.rotation.x = -0.22;
        pivot.add(watch);
      }
      return pivot;
    };

    const armLPivot = createArm(-1);
    const armRPivot = createArm(1);
    torsoGroup.add(armLPivot);
    torsoGroup.add(armRPivot);

    // Tactician Clipboard held in left hand
    const clipboardGroup = new THREE.Group();
    clipboardGroup.position.set(0.04, -0.505, 0.14);
    clipboardGroup.rotation.set(-0.65, 0.2, 0.1);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.3, 0.015),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.3 })
    );
    const pitchScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.19, 0.26),
      new THREE.MeshStandardMaterial({
        color: '#0b4f26',
        emissive: '#00e5ff',
        emissiveIntensity: 0.18,
        roughness: 0.5,
      })
    );
    pitchScreen.position.z = 0.009;
    clipboardGroup.add(board, pitchScreen);
    armLPivot.add(clipboardGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.67;
    torsoGroup.add(headGroup);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 24), skinMat);
    cranium.scale.set(0.92, 1.08, 0.96);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Ears
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), skinMat);
      ear.scale.set(0.55, 1.15, 0.8);
      ear.position.set(side * 0.125, -0.01, -0.01);
      headGroup.add(ear);
    });

    // Nose & subtle mouth
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.052, 12), skinMat);
    nose.position.set(0, -0.012, 0.128);
    nose.rotation.x = Math.PI * 0.36;
    headGroup.add(nose);

    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.046, 0.008, 0.012),
      new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.7 })
    );
    mouth.position.set(0, -0.058, 0.118);
    headGroup.add(mouth);

    // Eyes & Brows
    const scleraMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.15 });
    [-0.044, 0.044].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 12), scleraMat);
      eye.scale.set(1.1, 0.85, 0.7);
      eye.position.set(ex, 0.02, 0.115);
      headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), pupilMat);
      pupil.position.set(ex, 0.02, 0.127);
      headGroup.add(pupil);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.011, 0.014), hairMat);
      brow.position.set(ex, 0.046, 0.12);
      brow.rotation.z = ex < 0 ? 0.06 : -0.06;
      headGroup.add(brow);
    });

    // Sleek dark titanium glasses without bright white reflection glare
    const glassesGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.82, roughness: 0.28 });
    const lensMat = new THREE.MeshBasicMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.14,
    });
    [-0.045, 0.045].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0038, 10, 22), frameMat);
      rim.position.set(gx, 0.02, 0.136);
      glassesGroup.add(rim);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), lensMat);
      lens.position.set(gx, 0.02, 0.135);
      glassesGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0045, 0.005), frameMat);
    bridge.position.set(0, 0.024, 0.138);
    glassesGroup.add(bridge);
    [-1, 1].forEach((side) => {
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0045, 0.12), frameMat);
      temple.position.set(side * 0.074, 0.022, 0.08);
      glassesGroup.add(temple);
    });
    headGroup.add(glassesGroup);

    // Facial Hair: Stubble + Sculpted Jaw Beard
    const stubbleMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.128, 18, 14, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ color: '#334155', transparent: true, opacity: 0.32, roughness: 0.9 })
    );
    stubbleMesh.scale.set(0.94, 1.05, 0.98);
    stubbleMesh.position.y = -0.015;
    headGroup.add(stubbleMesh);

    const beardGroup = new THREE.Group();
    const beardJaw = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 22, 16, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42),
      beardMat
    );
    beardJaw.scale.set(0.96, 1.08, 1.01);
    beardJaw.position.y = -0.018;
    const mustache = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.056, 10), beardMat);
    mustache.rotation.z = Math.PI / 2;
    mustache.position.set(0, -0.042, 0.122);
    beardGroup.add(beardJaw, mustache);
    headGroup.add(beardGroup);

    // Hair Variants
    const makeShortHair = () => {
      const g = new THREE.Group();
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.141, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
        hairMat
      );
      cap.scale.set(0.94, 1.04, 0.98);
      cap.position.y = 0.018;
      g.add(cap);
      return g;
    };
    const makeFadeHair = () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.065, 0.21), hairMat);
      top.position.set(0, 0.118, 0.01);
      const sideCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.138, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.44),
        hairMat
      );
      sideCap.scale.set(0.93, 1.02, 0.96);
      sideCap.position.y = 0.018;
      g.add(top, sideCap);
      return g;
    };
    const makeCurlyHair = () => {
      const g = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), hairMat);
        puff.position.set(Math.cos(ang) * 0.088, 0.1 + (i % 2) * 0.025, Math.sin(ang) * 0.088);
        g.add(puff);
      }
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), hairMat);
      crown.position.set(0, 0.13, 0);
      g.add(crown);
      return g;
    };
    const makeMohawkHair = () => {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.095, 0.048), hairMat);
        fin.position.set(0, 0.135 - Math.abs(i - 2.5) * 0.008, 0.08 - i * 0.036);
        fin.rotation.x = -0.15;
        g.add(fin);
      }
      return g;
    };
    const makePonytailHair = () => {
      const g = makeShortHair();
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.04, 0.16, 12), hairMat);
      tail.position.set(0, 0.02, -0.155);
      tail.rotation.x = 0.45;
      g.add(tail);
      return g;
    };
    const makeAfroHair = () => {
      const g = new THREE.Group();
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.185, 22, 18), hairMat);
      crown.position.set(0, 0.065, -0.01);
      g.add(crown);
      return g;
    };

    const hairVariants = {
      SHORT: makeShortHair(),
      FADE: makeFadeHair(),
      CURLY: makeCurlyHair(),
      MOHAWK: makeMohawkHair(),
      PONYTAIL: makePonytailHair(),
      AFRO: makeAfroHair(),
    };
    Object.values(hairVariants).forEach((hv) => headGroup.add(hv));

    rigRef.current = {
      root,
      torsoGroup,
      headGroup,
      armLPivot,
      armRPivot,
      suitGroup,
      tracksuitGroup,
      turtleneckGroup,
      clipboardGroup,
      glassesGroup,
      hairVariants,
      stubbleMesh,
      beardGroup,
      skinMat,
      hairMat,
      beardMat,
      shoeMat,
      trouserMat,
      sleeveMat,
    };

    // Sync initial appearance immediately
    const initApp = propsRef.current.appearance;
    const initAge = propsRef.current.age;
    const initHairCol = new THREE.Color(initApp.hairColor);
    if (initAge >= 54) {
      initHairCol.lerp(new THREE.Color('#cbd5e1'), Math.min(0.45, (initAge - 52) * 0.025));
    }
    hairMat.color.copy(initHairCol);
    beardMat.color.copy(initHairCol);
    const initOutfitHex =
      initApp.outfit === 'TRACKSUIT' ? '#1e293b' : initApp.outfit === 'TURTLENECK' ? '#18181b' : '#0f172a';
    sleeveMat.color.set(initOutfitHex);
    trouserMat.color.set(initOutfitHex);
    shoeMat.color.set(initApp.outfit === 'TRACKSUIT' ? '#e2e8f0' : '#111827');

    suitGroup.visible = initApp.outfit === 'SUIT';
    tracksuitGroup.visible = initApp.outfit === 'TRACKSUIT';
    turtleneckGroup.visible = initApp.outfit === 'TURTLENECK';
    glassesGroup.visible = initApp.glasses;
    (Object.keys(hairVariants) as Array<keyof typeof hairVariants>).forEach((k) => {
      hairVariants[k].visible = initApp.hairStyle === k;
    });
    stubbleMesh.visible = initApp.facialHair === 'STUBBLE';
    beardGroup.visible = initApp.facialHair === 'BEARD';
    clipboardGroup.visible = propsRef.current.personality === 'TACTICIAN';

    // Handle Resize cleanly
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // WebGL context loss guard
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let clockTime = 0;
    let lastPresetPos = targetCamRef.current.pos.clone();

    const stepFrame = () => {
      if (disposed) return;
      clockTime += 0.032;

      // Smoothly transition camera if preset switched
      if (!lastPresetPos.equals(targetCamRef.current.pos)) {
        camera.position.lerp(targetCamRef.current.pos, 0.14);
        controls.target.lerp(targetCamRef.current.look, 0.14);
        if (camera.position.distanceTo(targetCamRef.current.pos) < 0.03) {
          lastPresetPos.copy(targetCamRef.current.pos);
        }
      }

      // Subtle living touchline idle animation + personality posture
      const pers = propsRef.current.personality;
      torsoGroup.position.y = 0.9 + Math.sin(clockTime * 1.9) * 0.008;
      headGroup.rotation.y = Math.sin(clockTime * 0.75) * 0.1;
      headGroup.rotation.x = Math.sin(clockTime * 1.1) * 0.03;

      if (pers === 'TACTICIAN') {
        armLPivot.rotation.x = -0.82 + Math.sin(clockTime * 1.4) * 0.03;
        armLPivot.rotation.z = -0.18;
        armRPivot.rotation.x = -0.15;
        armRPivot.rotation.z = 0.12;
      } else if (pers === 'DESPOT') {
        armLPivot.rotation.x = -0.58;
        armLPivot.rotation.z = -0.45;
        armRPivot.rotation.x = -0.62;
        armRPivot.rotation.z = 0.45;
      } else if (pers === 'ENCOURAGING') {
        armLPivot.rotation.x = -0.18 + Math.sin(clockTime * 1.6) * 0.06;
        armLPivot.rotation.z = -0.22;
        armRPivot.rotation.x = -0.28 - Math.sin(clockTime * 1.6) * 0.06;
        armRPivot.rotation.z = 0.24;
      } else {
        // NEGOTIATOR
        armLPivot.rotation.x = -0.12;
        armLPivot.rotation.z = -0.14;
        armRPivot.rotation.x = -0.22 + Math.sin(clockTime * 1.2) * 0.04;
        armRPivot.rotation.z = 0.15;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(renderer, stepFrame, (id) => {
          timerId = id;
        });
      } else {
        rafId = requestAnimationFrame(stepFrame);
      }
    };

    stepFrame();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rigRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[360px]" />;
};
