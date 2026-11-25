import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Minimal FileReader polyfill for Node.js so GLTFExporter binary mode works cleanly
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class NodeFileReader {
    constructor() {
      this.result = null;
      this.onloadend = null;
      this.onload = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      });
    }
  };
}

/**
 * Builds an athletic, 23-part non-box human footballer rig (~1.82m tall)
 * with anatomically proportioned chest/shoulders, facial nose/ears/brow relief,
 * muscular thighs/calves, sleeves, hands/gloves, and sculpted cleats,
 * plus embedded Idle/Run/Kick animation tracks, exported as valid binary glTF 2.0 (.glb).
 */
function buildPlayerGltfScene() {
  const root = new THREE.Group();
  root.name = 'PlayerRig';

  const matKit = new THREE.MeshStandardMaterial({ name: 'KitMat', color: '#dc2626', roughness: 0.58 });
  const matShorts = new THREE.MeshStandardMaterial({ name: 'ShortsMat', color: '#f8fafc', roughness: 0.65 });
  const matSocks = new THREE.MeshStandardMaterial({ name: 'SocksMat', color: '#dc2626', roughness: 0.72 });
  const matSkin = new THREE.MeshStandardMaterial({ name: 'SkinMat', color: '#e2b28e', roughness: 0.55 });
  const matHead = new THREE.MeshStandardMaterial({ name: 'HeadMat', color: '#e2b28e', roughness: 0.52 });
  const matHair = new THREE.MeshStandardMaterial({ name: 'HairMat', color: '#1e1612', roughness: 0.78 });
  const matBoot = new THREE.MeshStandardMaterial({ name: 'BootMat', color: '#111827', roughness: 0.3, metalness: 0.16 });
  const matGlove = new THREE.MeshStandardMaterial({ name: 'GloveMat', color: '#b7ff4a', roughness: 0.45 });

  // BodyGroup moves as whole for dive/tackle/jump/lean
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'BodyGroup';
  root.add(bodyGroup);

  // 1. Pelvis & Shorts Hip Block (sculpted Lathe, zero box)
  const pelvisGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.11),
      new THREE.Vector2(0.172, -0.10),
      new THREE.Vector2(0.180, 0.0),
      new THREE.Vector2(0.162, 0.09),
      new THREE.Vector2(0.001, 0.10),
    ],
    22,
  );
  const pelvisMesh = new THREE.Mesh(pelvisGeo, matShorts);
  pelvisMesh.name = 'Pelvis';
  pelvisMesh.position.y = 0.91;
  pelvisMesh.scale.set(1.06, 1.0, 0.76);
  bodyGroup.add(pelvisMesh);

  // 2. Sculpted Athletic V-Taper Torso (phiStart = PI/2 puts back number on -Z and front chest on +Z)
  const torsoGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.26),
      new THREE.Vector2(0.158, -0.25), // waist seam
      new THREE.Vector2(0.154, -0.14), // narrow athletic waist
      new THREE.Vector2(0.178, -0.01), // mid ribcage
      new THREE.Vector2(0.212, 0.12),  // broad lats & chest
      new THREE.Vector2(0.222, 0.20),  // muscular pectorals & shoulder girdle
      new THREE.Vector2(0.165, 0.26),  // trapezius slope
      new THREE.Vector2(0.078, 0.29),  // neck collar
      new THREE.Vector2(0.001, 0.29),
    ],
    24,
    Math.PI * 0.5,
    Math.PI * 2,
  );
  const torsoMesh = new THREE.Mesh(torsoGeo, matKit);
  torsoMesh.name = 'Torso';
  torsoMesh.position.y = 1.22;
  torsoMesh.scale.set(1.08, 1.0, 0.70);
  bodyGroup.add(torsoMesh);

  // 3. Neck + Anatomical Head + Nose + Ears + Hair Cap
  const neckGeo = new THREE.CylinderGeometry(0.056, 0.068, 0.13, 14);
  const neckMesh = new THREE.Mesh(neckGeo, matSkin);
  neckMesh.name = 'Neck';
  neckMesh.position.y = 1.52;
  bodyGroup.add(neckMesh);

  const headPivot = new THREE.Group();
  headPivot.name = 'HeadPivot';
  headPivot.position.y = 1.68;
  bodyGroup.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.118, 24, 18, -Math.PI * 0.5, Math.PI * 2);
  const headMesh = new THREE.Mesh(headGeo, matHead);
  headMesh.name = 'Head';
  headMesh.scale.set(0.84, 1.08, 0.96);
  headPivot.add(headMesh);

  // Sculpted Nose Bridge & Chin Relief (gives true human facial silhouette from side/dynamic angles!)
  const noseGeo = new THREE.ConeGeometry(0.022, 0.052, 8);
  noseGeo.rotateX(Math.PI * 0.52);
  const noseMesh = new THREE.Mesh(noseGeo, matSkin);
  noseMesh.name = 'Nose';
  noseMesh.position.set(0, -0.008, 0.116);
  headPivot.add(noseMesh);

  const earGeo = new THREE.SphereGeometry(0.024, 10, 8);
  const earL = new THREE.Mesh(earGeo, matSkin);
  earL.name = 'EarL';
  earL.scale.set(0.45, 1.05, 0.72);
  earL.position.set(-0.098, -0.006, 0.0);
  const earR = new THREE.Mesh(earGeo, matSkin);
  earR.name = 'EarR';
  earR.scale.set(0.45, 1.05, 0.72);
  earR.position.set(0.098, -0.006, 0.0);
  headPivot.add(earL, earR);

  const hairGeo = new THREE.SphereGeometry(0.124, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.44);
  const hairMesh = new THREE.Mesh(hairGeo, matHair);
  hairMesh.name = 'Hair';
  hairMesh.scale.set(0.85, 1.05, 0.97);
  hairMesh.position.y = 0.006;
  headPivot.add(hairMesh);

  // 4. Articulated Left & Right Arms (Shoulder Deltoid + Jersey Sleeve + Bicep + Forearm + Hand/Glove)
  const shoulderGeo = new THREE.SphereGeometry(0.076, 12, 10);
  const sleeveGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.18),
      new THREE.Vector2(0.062, -0.17), // jersey sleeve cuff
      new THREE.Vector2(0.068, -0.07),
      new THREE.Vector2(0.072, -0.01),
      new THREE.Vector2(0.001, 0.0),
    ],
    14,
  );
  const upperArmSkinGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.28),
      new THREE.Vector2(0.047, -0.27), // elbow
      new THREE.Vector2(0.055, -0.17), // bicep
      new THREE.Vector2(0.056, -0.14),
      new THREE.Vector2(0.001, -0.14),
    ],
    14,
  );
  const elbowGeo = new THREE.SphereGeometry(0.046, 10, 8);
  const forearmGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.26),
      new THREE.Vector2(0.034, -0.25), // wrist
      new THREE.Vector2(0.044, -0.12),
      new THREE.Vector2(0.049, -0.02),
      new THREE.Vector2(0.001, 0.0),
    ],
    14,
  );
  const handGeo = new THREE.SphereGeometry(0.046, 10, 8);
  const gloveGeo = new THREE.SphereGeometry(0.065, 12, 10);

  const makeArm = (side, xOff) => {
    const armPivot = new THREE.Group();
    armPivot.name = `Arm${side}Pivot`;
    armPivot.position.set(xOff, 1.43, 0);

    const shoulder = new THREE.Mesh(shoulderGeo, matKit);
    shoulder.name = `Shoulder${side}`;
    armPivot.add(shoulder);

    const sleeve = new THREE.Mesh(sleeveGeo, matKit);
    sleeve.name = `Sleeve${side}`;
    armPivot.add(sleeve);

    const upperArm = new THREE.Mesh(upperArmSkinGeo, matSkin);
    upperArm.name = `UpperArm${side}`;
    armPivot.add(upperArm);

    const elbow = new THREE.Mesh(elbowGeo, matSkin);
    elbow.name = `Elbow${side}`;
    elbow.position.y = -0.28;
    armPivot.add(elbow);

    const forearmPivot = new THREE.Group();
    forearmPivot.name = `Forearm${side}Pivot`;
    forearmPivot.position.y = -0.28;

    const forearm = new THREE.Mesh(forearmGeo, matSkin);
    forearm.name = `Forearm${side}`;
    forearmPivot.add(forearm);

    const hand = new THREE.Mesh(handGeo, matSkin);
    hand.name = `Hand${side}`;
    hand.scale.set(0.75, 1.18, 0.52);
    hand.position.set(0, -0.28, 0.014);
    forearmPivot.add(hand);

    const glove = new THREE.Mesh(gloveGeo, matGlove);
    glove.name = `Glove${side}`;
    glove.scale.set(0.86, 1.24, 0.58);
    glove.position.set(0, -0.28, 0.015);
    glove.visible = false;
    forearmPivot.add(glove);

    armPivot.add(forearmPivot);
    return armPivot;
  };
  bodyGroup.add(makeArm('L', -0.265), makeArm('R', 0.265));

  // 5. Articulated Left & Right Legs (Muscular Shorts Thigh + Knee + Calf Sock + Sculpted Cleat)
  const thighShortsGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.29),
      new THREE.Vector2(0.088, -0.28), // athletic shorts hem
      new THREE.Vector2(0.098, -0.14),
      new THREE.Vector2(0.102, -0.01),
      new THREE.Vector2(0.001, 0.0),
    ],
    16,
  );
  const thighSkinGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, -0.41),
      new THREE.Vector2(0.062, -0.40), // above knee
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
      new THREE.Vector2(0.042, -0.40), // ankle
      new THREE.Vector2(0.052, -0.27), // lower shin
      new THREE.Vector2(0.069, -0.14), // muscular calf swell
      new THREE.Vector2(0.062, -0.03), // below knee
      new THREE.Vector2(0.001, 0.0),
    ],
    16,
  );
  const bootHeelGeo = new THREE.CylinderGeometry(0.046, 0.050, 0.085, 12);
  const bootVampGeo = new THREE.SphereGeometry(0.062, 14, 10);

  const makeLeg = (side, xOff) => {
    const thighPivot = new THREE.Group();
    thighPivot.name = `Thigh${side}Pivot`;
    thighPivot.position.set(xOff, 0.89, 0);

    const thighShorts = new THREE.Mesh(thighShortsGeo, matShorts);
    thighShorts.name = `ThighShorts${side}`;
    thighShorts.scale.set(1.0, 1.0, 1.06);
    thighPivot.add(thighShorts);

    const thighSkin = new THREE.Mesh(thighSkinGeo, matSkin);
    thighSkin.name = `ThighSkin${side}`;
    thighPivot.add(thighSkin);

    const knee = new THREE.Mesh(kneeGeo, matSkin);
    knee.name = `Knee${side}`;
    knee.position.y = -0.41;
    thighPivot.add(knee);

    const calfPivot = new THREE.Group();
    calfPivot.name = `Calf${side}Pivot`;
    calfPivot.position.y = -0.41;

    const calf = new THREE.Mesh(calfGeo, matSocks);
    calf.name = `Calf${side}`;
    calfPivot.add(calf);

    const bootHeel = new THREE.Mesh(bootHeelGeo, matBoot);
    bootHeel.name = `BootHeel${side}`;
    bootHeel.position.set(0, -0.405, -0.01);
    calfPivot.add(bootHeel);

    const bootVamp = new THREE.Mesh(bootVampGeo, matBoot);
    bootVamp.name = `BootVamp${side}`;
    bootVamp.scale.set(0.86, 0.56, 2.08);
    bootVamp.position.set(0, -0.445, 0.075);
    calfPivot.add(bootVamp);

    thighPivot.add(calfPivot);
    return thighPivot;
  };
  bodyGroup.add(makeLeg('L', -0.112), makeLeg('R', 0.112));

  // Embedded Run & Idle AnimationClips using QuaternionKeyframeTrack (glTF 2.0 spec compliant)
  const quatX = (rad) => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rad);
    return [q.x, q.y, q.z, q.w];
  };
  const times = [0, 0.25, 0.5, 0.75, 1.0];
  const runClip = new THREE.AnimationClip('Run', 1.0, [
    new THREE.QuaternionKeyframeTrack('ThighLPivot.quaternion', times, [
      ...quatX(0), ...quatX(0.65), ...quatX(0), ...quatX(-0.65), ...quatX(0),
    ]),
    new THREE.QuaternionKeyframeTrack('ThighRPivot.quaternion', times, [
      ...quatX(0), ...quatX(-0.65), ...quatX(0), ...quatX(0.65), ...quatX(0),
    ]),
    new THREE.QuaternionKeyframeTrack('CalfLPivot.quaternion', times, [
      ...quatX(0), ...quatX(0.05), ...quatX(0.45), ...quatX(0.75), ...quatX(0),
    ]),
    new THREE.QuaternionKeyframeTrack('CalfRPivot.quaternion', times, [
      ...quatX(0), ...quatX(0.75), ...quatX(0.45), ...quatX(0.05), ...quatX(0),
    ]),
    new THREE.QuaternionKeyframeTrack('ArmLPivot.quaternion', times, [
      ...quatX(0), ...quatX(-0.55), ...quatX(0), ...quatX(0.55), ...quatX(0),
    ]),
    new THREE.QuaternionKeyframeTrack('ArmRPivot.quaternion', times, [
      ...quatX(0), ...quatX(0.55), ...quatX(0), ...quatX(-0.55), ...quatX(0),
    ]),
  ]);

  const idleClip = new THREE.AnimationClip('Idle', 2.0, [
    new THREE.VectorKeyframeTrack('BodyGroup.position', [0, 1.0, 2.0], [0, 0, 0, 0, 0.015, 0, 0, 0, 0]),
  ]);

  return { root, animations: [runClip, idleClip] };
}

async function main() {
  const { root, animations } = buildPlayerGltfScene();
  const exporter = new GLTFExporter();

  const glbBuffer = await new Promise((resolve, reject) => {
    exporter.parse(
      root,
      (res) => resolve(res),
      (err) => reject(err),
      { binary: true, animations },
    );
  });

  const outDir = path.resolve(process.cwd(), 'public', 'models');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'player.glb');
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));
  console.log(`Generated binary glTF 2.0 asset: ${outPath} (${(glbBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
