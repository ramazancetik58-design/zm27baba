import * as THREE from 'three';
import {
  GOAL_DEPTH,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  HALF_PITCH_L,
  HALF_PITCH_W,
  PITCH_L,
  PITCH_W,
} from './pitchConstants';
import {
  createGoalNetTexture,
  createLedBoardTexture,
  createNightSkyDomeTexture,
  createRibbonLedTexture,
} from './webglUtils';

export interface CrowdSeatEntry {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  phase: number;
}

export interface CrowdInstanceGroup {
  torsoMesh: THREE.InstancedMesh;
  headMesh: THREE.InstancedMesh;
  entries: CrowdSeatEntry[];
}

export interface StadiumBuildResult {
  goalNetGroups: THREE.Group[];
  cornerFlags: THREE.Mesh[];
  ledTex: THREE.CanvasTexture;
  ribbonTex: THREE.CanvasTexture;
  adMat: THREE.MeshStandardMaterial;
  crowdGroup: CrowdInstanceGroup;
  dispose: () => void;
}

function buildLinearExtrudedStand(shape: THREE.Shape, length: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -length / 2);
  return geo;
}

/**
 * Molded stadium bucket seat geometry (~0.62m wide, 0.40m deep, 0.72m backrest height).
 */
function buildStadiumSeatGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.18, 0.0);
  s.lineTo(0.22, 0.0);
  s.lineTo(0.22, 0.34);
  s.lineTo(-0.08, 0.34);
  s.lineTo(-0.12, 0.72);
  s.lineTo(-0.20, 0.72);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.56,
    bevelEnabled: false,
    steps: 1,
  });
  // Extrusion is along +Z -> rotate so seat width spans X and faces +Z (toward pitch)
  geo.translate(0, 0, -0.28);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

/**
 * Low-poly anatomical seated spectator torso+shoulders (~0.46m tall, ~0.46m wide)
 * calibrated against 1.82m standing footballers on the pitch.
 */
function buildSeatedFanTorsoGeometry(): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.185, 0.02),
    new THREE.Vector2(0.205, 0.22),
    new THREE.Vector2(0.235, 0.36),
    new THREE.Vector2(0.145, 0.45),
    new THREE.Vector2(0.065, 0.48),
    new THREE.Vector2(0.001, 0.48),
  ];
  const geo = new THREE.LatheGeometry(profile, 7);
  geo.scale(1.06, 1.0, 0.68);
  return geo;
}

/**
 * Builds a towering, enclosed 65,000-seat European night arena around the 68x105m FIFA pitch:
 * - Stepped architectural concrete tiers (Lower Bowl + LED Hospitality Ring + Steep Upper Bowl + 4 Corners)
 * - Rising 41.5m perimeter walls + closed overhanging cantilevered roof (castShadow = true onto outer turf)
 * - Individual molded stadium seats + thousands of true-scale 3D seated spectators (InstancedMesh)
 *   aligned neatly along stepped tiers with visible concrete stair aisles
 * - 4x 58m corner floodlight towers + regulation 7.32m x 2.44m goals + perimeter LED boards
 */
export function buildColossalNightStadium(
  scene: THREE.Scene,
  params: {
    homeName: string;
    awayName: string;
    homeShort: string;
    awayShort: string;
    homePrimary: string;
    homeSecondary: string;
    awayPrimary: string;
    awaySecondary: string;
    crowdDensity: 'HIGH' | 'MEDIUM';
    maxAnisotropy: number;
    competitionId?: 'LEAGUE' | 'UCL' | 'UEL' | 'UECL' | 'UNL';
  },
): StadiumBuildResult {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // 1. Midnight Sky Dome & Vast Outer Arena Concourse
  const skyTex = track(createNightSkyDomeTexture());
  const skyGeo = track(new THREE.SphereGeometry(310, 32, 20));
  const skyMat = track(
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    }),
  );
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const outerGroundGeo = track(new THREE.PlaneGeometry(520, 520));
  outerGroundGeo.rotateX(-Math.PI / 2);
  const outerGroundMat = track(new THREE.MeshStandardMaterial({ color: '#040910', roughness: 0.96 }));
  const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGround.position.y = -0.14;
  scene.add(outerGround);

  // Dark slate perimeter track apron around the grass
  const apronGeo = track(new THREE.PlaneGeometry(92, 132));
  apronGeo.rotateX(-Math.PI / 2);
  const apronMat = track(new THREE.MeshStandardMaterial({ color: '#0c1824', roughness: 0.92 }));
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.y = -0.05;
  apronMesh.receiveShadow = true;
  scene.add(apronMesh);

  // 2. Regulation 7.32m x 2.44m Goals & Corner Flags
  const postMat = track(new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.45, roughness: 0.22 }));
  const goalNetTex = track(createGoalNetTexture(params.maxAnisotropy));
  const goalNetMat = track(
    new THREE.MeshBasicMaterial({
      map: goalNetTex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );

  const halfGW = GOAL_WIDTH / 2;
  const goalPostGeo = track(new THREE.CylinderGeometry(0.065, 0.065, GOAL_HEIGHT, 12));
  const goalCrossGeo = track(new THREE.CylinderGeometry(0.065, 0.065, GOAL_WIDTH, 12));
  goalCrossGeo.rotateZ(Math.PI / 2);
  const goalBaseBarGeo = track(new THREE.CylinderGeometry(0.045, 0.045, GOAL_WIDTH, 10));
  goalBaseBarGeo.rotateZ(Math.PI / 2);
  const goalDepthBarGeo = track(new THREE.CylinderGeometry(0.045, 0.045, GOAL_DEPTH, 8));
  goalDepthBarGeo.rotateX(Math.PI / 2);

  const netBackGeo = track(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT));
  const netSideGeo = track(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT));
  const netRoofGeo = track(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH));
  const goalNetGroups: THREE.Group[] = [];

  [-1, 1].forEach((dir) => {
    const gz = dir * HALF_PITCH_L;
    const goalGroup = new THREE.Group();

    const leftP = new THREE.Mesh(goalPostGeo, postMat);
    leftP.position.set(-halfGW, GOAL_HEIGHT / 2, gz);
    leftP.castShadow = true;
    const rightP = new THREE.Mesh(goalPostGeo, postMat);
    rightP.position.set(halfGW, GOAL_HEIGHT / 2, gz);
    rightP.castShadow = true;
    const cross = new THREE.Mesh(goalCrossGeo, postMat);
    cross.position.set(0, GOAL_HEIGHT, gz);
    cross.castShadow = true;

    const backGround = new THREE.Mesh(goalBaseBarGeo, postMat);
    backGround.position.set(0, 0.045, gz + dir * GOAL_DEPTH);
    const sideGroundL = new THREE.Mesh(goalDepthBarGeo, postMat);
    sideGroundL.position.set(-halfGW, 0.045, gz + dir * (GOAL_DEPTH / 2));
    const sideGroundR = new THREE.Mesh(goalDepthBarGeo, postMat);
    sideGroundR.position.set(halfGW, 0.045, gz + dir * (GOAL_DEPTH / 2));

    const netGroup = new THREE.Group();
    netGroup.position.set(0, 0, gz);

    const netBack = new THREE.Mesh(netBackGeo, goalNetMat);
    netBack.position.set(0, GOAL_HEIGHT / 2, dir * GOAL_DEPTH);
    const netSideL = new THREE.Mesh(netSideGeo, goalNetMat);
    netSideL.rotation.y = Math.PI / 2;
    netSideL.position.set(-halfGW, GOAL_HEIGHT / 2, dir * (GOAL_DEPTH / 2));
    const netSideR = new THREE.Mesh(netSideGeo, goalNetMat);
    netSideR.rotation.y = Math.PI / 2;
    netSideR.position.set(halfGW, GOAL_HEIGHT / 2, dir * (GOAL_DEPTH / 2));
    const netRoof = new THREE.Mesh(netRoofGeo, goalNetMat);
    netRoof.rotation.x = Math.PI / 2;
    netRoof.position.set(0, GOAL_HEIGHT, dir * (GOAL_DEPTH / 2));

    netGroup.add(netBack, netSideL, netSideR, netRoof);
    goalNetGroups.push(netGroup);
    goalGroup.add(leftP, rightP, cross, backGround, sideGroundL, sideGroundR, netGroup);
    scene.add(goalGroup);
  });

  // Animated Corner Flags placed on the exact 4 pitch corners
  const compAccentHex =
    params.competitionId === 'UCL'
      ? '#60a5fa'
      : params.competitionId === 'UEL'
        ? '#f97316'
        : params.competitionId === 'UECL'
          ? '#10b981'
          : params.competitionId === 'UNL'
            ? '#22d3ee'
            : '#b7ff4a';
  const flagPoleGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8));
  const flagClothGeo = track(new THREE.PlaneGeometry(0.42, 0.28));
  const flagClothMat = track(
    new THREE.MeshStandardMaterial({ color: compAccentHex, roughness: 0.55, side: THREE.DoubleSide }),
  );
  const cornerFlags: THREE.Mesh[] = [];
  [
    [-HALF_PITCH_W, -HALF_PITCH_L],
    [HALF_PITCH_W, -HALF_PITCH_L],
    [-HALF_PITCH_W, HALF_PITCH_L],
    [HALF_PITCH_W, HALF_PITCH_L],
  ].forEach(([cx, cz]) => {
    const pole = new THREE.Mesh(flagPoleGeo, postMat);
    pole.position.set(cx, 0.75, cz);
    const cloth = new THREE.Mesh(flagClothGeo, flagClothMat);
    cloth.position.set(cx + (cx < 0 ? 0.21 : -0.21), 1.32, cz);
    cornerFlags.push(cloth);
    scene.add(pole, cloth);
  });

  // 3. 360-Degree Perimeter LED Ad Boards + Glass Dugouts + Player Tunnel
  const ledTex = track(createLedBoardTexture(params.homeShort, params.awayShort, params.competitionId));
  const adMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: ledTex,
      emissive: compAccentHex,
      emissiveMap: ledTex,
      emissiveIntensity: 0.52,
      roughness: 0.35,
    }),
  );

  const sideAdGeo = track(new THREE.PlaneGeometry(PITCH_L + 6, 1.0));
  [-1, 1].forEach((dir) => {
    const ad = new THREE.Mesh(sideAdGeo, adMat);
    ad.position.set(dir * (HALF_PITCH_W + 3.8), 0.5, 0);
    ad.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(ad);
  });

  const endAdGeo = track(new THREE.PlaneGeometry(PITCH_W + 4, 1.0));
  [-1, 1].forEach((dir) => {
    const ad = new THREE.Mesh(endAdGeo, adMat);
    ad.position.set(0, 0.5, dir * (HALF_PITCH_L + 4.8));
    ad.rotation.y = dir === 1 ? Math.PI : 0;
    scene.add(ad);
  });

  // Modern Glass-Canopied Team Dugouts along East Touchline
  const dugoutBaseGeo = track(new THREE.BoxGeometry(1.7, 1.15, 8.2));
  const dugoutMat = track(new THREE.MeshStandardMaterial({ color: '#131f2e', roughness: 0.45, metalness: 0.35 }));
  const canopyGeo = track(new THREE.BoxGeometry(2.1, 0.08, 8.5));
  const canopyMat = track(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.36,
      roughness: 0.12,
      metalness: 0.3,
    }),
  );
  [-11.5, 11.5].forEach((dz) => {
    const bench = new THREE.Mesh(dugoutBaseGeo, dugoutMat);
    bench.position.set(HALF_PITCH_W + 4.9, 0.58, dz);
    bench.castShadow = true;
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(HALF_PITCH_W + 4.65, 1.78, dz);
    canopy.rotation.z = 0.14;
    scene.add(bench, canopy);
  });

  // Illuminated Player Tunnel on West Side
  const tunnelArchGeo = track(new THREE.CylinderGeometry(2.6, 2.6, 5.5, 16, 1, false, 0, Math.PI));
  tunnelArchGeo.rotateZ(Math.PI / 2);
  const tunnelMat = track(new THREE.MeshStandardMaterial({ color: '#09111a', roughness: 0.8 }));
  const tunnel = new THREE.Mesh(tunnelArchGeo, tunnelMat);
  tunnel.position.set(-HALF_PITCH_W - 6.8, 0.05, 0);
  scene.add(tunnel);

  // 4. Monumental Stepped Two-Tier Bowl + Towering Exterior Walls + Closed Overhanging Roof
  // Corner centers at (±27, ±45.5), inner bowl radius = 14m -> side inner edge |x| = 41m, end inner edge |z| = 59.5m
  const SIDE_HALF_LEN = 45.5;
  const END_HALF_LEN = 27.0;
  const CORNER_R_IN = 14.0;

  const LOWER_STEPS = 8;
  const LOWER_D = 1.9;
  const LOWER_H = 1.15; // Lower bowl rOff 0..15.2m, y 2.2..10.25m

  const UPPER_STEPS = 10;
  const UPPER_D = 2.05;
  const UPPER_H = 1.95; // Upper steep bowl rOff 17.2..37.7m, y 14.2..31.75m

  const concreteMat = track(
    new THREE.MeshStandardMaterial({
      color: '#223244',
      roughness: 0.9,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({
      color: '#172330',
      roughness: 0.5,
      metalness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  const trussMat = track(
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.42, metalness: 0.72 }),
  );
  const ribbonTex = track(
    createRibbonLedTexture(params.homeName, params.awayName, params.homePrimary, params.competitionId)
  );
  const ribbonMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: ribbonTex,
      emissive: '#ffffff',
      emissiveMap: ribbonTex,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  const roofHaloMat = track(new THREE.MeshBasicMaterial({ color: '#e0f2fe', side: THREE.DoubleSide }));

  // Build stepped concrete cross-section coordinates (shared between straight Extrude & corner Lathe!)
  const bowlProfilePts: Array<[number, number]> = [[0, 0], [0, 2.2]];
  const tierCenters: Array<{ rOff: number; y: number; isUpper: boolean }> = [];

  for (let k = 0; k < LOWER_STEPS; k++) {
    const r0 = k * LOWER_D;
    const r1 = (k + 1) * LOWER_D;
    const yFloor = 2.2 + k * LOWER_H;
    bowlProfilePts.push([r0, yFloor], [r1, yFloor]);
    tierCenters.push({ rOff: r0 + LOWER_D * 0.52, y: yFloor, isUpper: false });
  }
  const lowerTopY = 2.2 + (LOWER_STEPS - 1) * LOWER_H; // 10.25m
  const lowerEndR = LOWER_STEPS * LOWER_D; // 15.2m
  const upperStartY = 14.2;
  const upperStartR = lowerEndR + 2.0; // 17.2m walkway

  bowlProfilePts.push([lowerEndR, lowerTopY], [lowerEndR, upperStartY], [upperStartR, upperStartY]);

  for (let k = 0; k < UPPER_STEPS; k++) {
    const r0 = upperStartR + k * UPPER_D;
    const r1 = upperStartR + (k + 1) * UPPER_D;
    const yFloor = upperStartY + k * UPPER_H;
    bowlProfilePts.push([r0, yFloor], [r1, yFloor]);
    tierCenters.push({ rOff: r0 + UPPER_D * 0.52, y: yFloor, isUpper: true });
  }
  const upperEndR = upperStartR + UPPER_STEPS * UPPER_D; // 37.7m
  const upperTopY = upperStartY + (UPPER_STEPS - 1) * UPPER_H; // 31.75m
  const wallHeight = 39.2;
  bowlProfilePts.push([upperEndR, upperTopY], [upperEndR, wallHeight], [upperEndR + 2.2, wallHeight], [upperEndR + 2.2, 0], [0, 0]);

  const standShape = new THREE.Shape();
  standShape.moveTo(bowlProfilePts[0][0], bowlProfilePts[0][1]);
  for (let i = 1; i < bowlProfilePts.length; i++) {
    standShape.lineTo(bowlProfilePts[i][0], bowlProfilePts[i][1]);
  }
  standShape.closePath();

  const sideStandGeo = track(buildLinearExtrudedStand(standShape, SIDE_HALF_LEN * 2));
  const endStandGeo = track(buildLinearExtrudedStand(standShape, END_HALF_LEN * 2));

  const eastStand = new THREE.Mesh(sideStandGeo, concreteMat);
  eastStand.position.set(END_HALF_LEN + CORNER_R_IN, 0, 0);
  eastStand.receiveShadow = true;
  eastStand.castShadow = true;

  const westStand = new THREE.Mesh(sideStandGeo, concreteMat);
  westStand.rotation.y = Math.PI;
  westStand.position.set(-(END_HALF_LEN + CORNER_R_IN), 0, 0);
  westStand.receiveShadow = true;
  westStand.castShadow = true;

  const northStand = new THREE.Mesh(endStandGeo, concreteMat);
  northStand.rotation.y = -Math.PI / 2;
  northStand.position.set(0, 0, SIDE_HALF_LEN + CORNER_R_IN);
  northStand.receiveShadow = true;
  northStand.castShadow = true;

  const southStand = new THREE.Mesh(endStandGeo, concreteMat);
  southStand.rotation.y = Math.PI / 2;
  southStand.position.set(0, 0, -(SIDE_HALF_LEN + CORNER_R_IN));
  southStand.receiveShadow = true;
  southStand.castShadow = true;

  scene.add(eastStand, westStand, northStand, southStand);

  const cornerProfile = bowlProfilePts.map(([rOff, y]) => new THREE.Vector2(CORNER_R_IN + rOff, y));
  const cornerBowlGeo = track(new THREE.LatheGeometry(cornerProfile, 16, 0, Math.PI / 2));

  // Corner LED Ribbon Arc
  const ribbonR = CORNER_R_IN + lowerEndR - 0.14;
  const ribbonCenterY = (lowerTopY + upperStartY) / 2;
  const cornerRibbonGeo = track(new THREE.CylinderGeometry(ribbonR, ribbonR, 2.3, 16, 1, true, 0, Math.PI / 2));

  // Closed Cantilevered Overhanging Stadium Roof Canopy (rOff -5.5m..+40.2m, y = 39.2m..41.2m)
  // Inner edge extends 5.5m inward past stand wall -> sits at |x| = 35.5m and |z| = 54.0m
  // Casting dramatic directional roof shadows onto the stands and outer turf!
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-5.5, 40.6);
  roofShape.lineTo(40.2, 39.0);
  roofShape.lineTo(40.2, 40.2);
  roofShape.lineTo(-5.5, 41.4);
  roofShape.closePath();
  const sideRoofGeo = track(buildLinearExtrudedStand(roofShape, SIDE_HALF_LEN * 2));
  const endRoofGeo = track(buildLinearExtrudedStand(roofShape, END_HALF_LEN * 2));

  const eastRoof = new THREE.Mesh(sideRoofGeo, roofMat);
  eastRoof.position.set(END_HALF_LEN + CORNER_R_IN, 0, 0);
  eastRoof.castShadow = true;
  const westRoof = new THREE.Mesh(sideRoofGeo, roofMat);
  westRoof.rotation.y = Math.PI;
  westRoof.position.set(-(END_HALF_LEN + CORNER_R_IN), 0, 0);
  westRoof.castShadow = true;
  const northRoof = new THREE.Mesh(endRoofGeo, roofMat);
  northRoof.rotation.y = -Math.PI / 2;
  northRoof.position.set(0, 0, SIDE_HALF_LEN + CORNER_R_IN);
  northRoof.castShadow = true;
  const southRoof = new THREE.Mesh(endRoofGeo, roofMat);
  southRoof.rotation.y = Math.PI / 2;
  southRoof.position.set(0, 0, -(SIDE_HALF_LEN + CORNER_R_IN));
  southRoof.castShadow = true;
  scene.add(eastRoof, westRoof, northRoof, southRoof);

  const cornerRoofProfile = [
    new THREE.Vector2(CORNER_R_IN - 5.5, 40.6),
    new THREE.Vector2(CORNER_R_IN + 40.2, 39.0),
    new THREE.Vector2(CORNER_R_IN + 40.2, 40.2),
    new THREE.Vector2(CORNER_R_IN - 5.5, 41.4),
    new THREE.Vector2(CORNER_R_IN - 5.5, 40.6),
  ];
  const cornerRoofGeo = track(new THREE.LatheGeometry(cornerRoofProfile, 16, 0, Math.PI / 2));

  const corners: Array<{ x: number; z: number; rotY: number }> = [
    { x: END_HALF_LEN, z: SIDE_HALF_LEN, rotY: 0 },
    { x: END_HALF_LEN, z: -SIDE_HALF_LEN, rotY: Math.PI / 2 },
    { x: -END_HALF_LEN, z: -SIDE_HALF_LEN, rotY: Math.PI },
    { x: -END_HALF_LEN, z: SIDE_HALF_LEN, rotY: -Math.PI / 2 },
  ];
  corners.forEach((c) => {
    const bowl = new THREE.Mesh(cornerBowlGeo, concreteMat);
    bowl.position.set(c.x, 0, c.z);
    bowl.rotation.y = c.rotY;
    bowl.receiveShadow = true;
    bowl.castShadow = true;

    const cRoof = new THREE.Mesh(cornerRoofGeo, roofMat);
    cRoof.position.set(c.x, 0, c.z);
    cRoof.rotation.y = c.rotY;
    cRoof.castShadow = true;

    const cRibbon = new THREE.Mesh(cornerRibbonGeo, ribbonMat);
    cRibbon.position.set(c.x, ribbonCenterY, c.z);
    cRibbon.rotation.y = c.rotY;

    scene.add(bowl, cRoof, cRibbon);
  });

  // Straight 360-degree LED Hospitality Ribbons + Under-Roof Floodlight Halo Strips
  const sideRibbonGeo = track(new THREE.PlaneGeometry(SIDE_HALF_LEN * 2, 2.3));
  const endRibbonGeo = track(new THREE.PlaneGeometry(END_HALF_LEN * 2, 2.3));
  [-1, 1].forEach((dir) => {
    const sr = new THREE.Mesh(sideRibbonGeo, ribbonMat);
    sr.position.set(dir * (END_HALF_LEN + CORNER_R_IN + lowerEndR - 0.14), ribbonCenterY, 0);
    sr.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;

    const er = new THREE.Mesh(endRibbonGeo, ribbonMat);
    er.position.set(0, ribbonCenterY, dir * (SIDE_HALF_LEN + CORNER_R_IN + lowerEndR - 0.14));
    er.rotation.y = dir === 1 ? Math.PI : 0;

    scene.add(sr, er);
  });

  // Under-roof cyan-white / competition LED canopy rim strip tucked flush underneath the overhanging lip
  const roofHaloSoftMat = track(
    new THREE.MeshBasicMaterial({
      color: params.competitionId && params.competitionId !== 'LEAGUE' ? compAccentHex : '#bae6fd',
    }),
  );
  void roofHaloMat;
  const sideHaloGeo = track(new THREE.BoxGeometry(0.38, 0.22, SIDE_HALF_LEN * 2));
  const endHaloGeo = track(new THREE.BoxGeometry(END_HALF_LEN * 2, 0.22, 0.38));
  [-1, 1].forEach((dir) => {
    const sh = new THREE.Mesh(sideHaloGeo, roofHaloSoftMat);
    sh.position.set(dir * (END_HALF_LEN + CORNER_R_IN - 4.9), 40.45, 0);

    const eh = new THREE.Mesh(endHaloGeo, roofHaloSoftMat);
    eh.position.set(0, 40.45, dir * (SIDE_HALF_LEN + CORNER_R_IN - 4.9));
    scene.add(sh, eh);
  });

  const trussBeamGeo = track(new THREE.BoxGeometry(44.5, 0.9, 0.55));
  for (let tz = -40; tz <= 40; tz += 16) {
    [-1, 1].forEach((dir) => {
      const tb = new THREE.Mesh(trussBeamGeo, trussMat);
      tb.position.set(dir * (END_HALF_LEN + CORNER_R_IN + 17.5), 39.6, tz);
      tb.rotation.z = dir * -0.036;
      tb.castShadow = true;
      scene.add(tb);
    });
  }
  const endTrussGeo = track(new THREE.BoxGeometry(0.55, 0.9, 44.5));
  for (let tx = -20; tx <= 20; tx += 13.3) {
    [-1, 1].forEach((dir) => {
      const tb = new THREE.Mesh(endTrussGeo, trussMat);
      tb.position.set(tx, 39.6, dir * (SIDE_HALF_LEN + CORNER_R_IN + 17.5));
      tb.rotation.x = dir * 0.036;
      tb.castShadow = true;
      scene.add(tb);
    });
  }

  // 5. Four 58m Corner Floodlight Towers + Volumetric Night Light Cones
  const pylonGeo = track(new THREE.CylinderGeometry(0.65, 1.35, 58, 10));
  const crossArmGeo = track(new THREE.BoxGeometry(10.0, 4.6, 0.9));
  const lampHeadMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#fef9c3',
      emissiveIntensity: 3.2,
    }),
  );
  const beamConeGeo = track(new THREE.ConeGeometry(28, 78, 20, 1, true));
  beamConeGeo.translate(0, -39, 0);
  beamConeGeo.rotateX(-Math.PI / 2);
  const beamConeMat = track(
    new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  [
    [-64, -84],
    [64, -84],
    [-64, 84],
    [64, 84],
  ].forEach(([px, pz]) => {
    const tower = new THREE.Group();
    tower.position.set(px, 0, pz);

    const mast = new THREE.Mesh(pylonGeo, trussMat);
    mast.position.y = 29;
    tower.add(mast);

    const head = new THREE.Mesh(crossArmGeo, lampHeadMat);
    head.position.y = 56.5;
    head.lookAt(0, 0, 0);
    tower.add(head);

    const beam = new THREE.Mesh(beamConeGeo, beamConeMat);
    beam.position.y = 56.5;
    beam.lookAt(0, 2, 0);
    tower.add(beam);

    scene.add(tower);
  });

  // 6. Molded Stadium Bucket Seats + True-Scale Seated 3D Spectators (InstancedMesh)
  // Calibrated cleanly against 1.82m standing players: seated torso + head rises ~0.94m above tier floor!
  const seatGeo = track(buildStadiumSeatGeometry());
  const fanTorsoGeo = track(buildSeatedFanTorsoGeometry());
  const fanHeadGeo = track(new THREE.SphereGeometry(0.112, 7, 5));
  fanHeadGeo.scale(0.88, 1.08, 0.94);

  const seatMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.68, metalness: 0.08 }));
  const fanTorsoMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.04 }));
  const fanHeadMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.02 }));

  const sideInnerX = END_HALF_LEN + CORNER_R_IN; // 41.0m
  const endInnerZ = SIDE_HALF_LEN + CORNER_R_IN; // 59.5m
  const seatSpacing = 1.08;
  const sideLen = SIDE_HALF_LEN * 2 - 2.0;
  const endLen = END_HALF_LEN * 2 - 2.0;
  const sideCols = Math.max(24, Math.round(sideLen / seatSpacing));
  const endCols = Math.max(16, Math.round(endLen / seatSpacing));

  interface SeatSlot {
    x: number;
    y: number;
    z: number;
    rotY: number;
    isAwayZone: boolean;
    idx: number;
    occupied: boolean;
    scale: number;
    phase: number;
  }
  const allSeatSlots: SeatSlot[] = [];
  let seq = 0;

  const pushSeatSlot = (x: number, y: number, z: number, colIdx: number, isAwayZone: boolean) => {
    // Concrete vertical stair aisles every 13 seats so stands have clean UEFA radial gangways!
    if (colIdx % 13 === 6) return;
    const id = seq++;
    const occThreshold = params.crowdDensity === 'HIGH' ? 89 : 74;
    const occupied = ((id * 37 + colIdx * 13) % 100) < occThreshold;
    allSeatSlots.push({
      x,
      y,
      z,
      rotY: Math.atan2(-x, -z),
      isAwayZone,
      idx: id,
      occupied,
      scale: 0.93 + ((id * 19) % 15) / 100,
      phase: (id * 0.71) % (Math.PI * 2),
    });
  };

  for (let row = 0; row < tierCenters.length; row++) {
    const tier = tierCenters[row];

    // East & West stands
    for (let c = 0; c < sideCols; c++) {
      const z = ((c + 0.5) / sideCols - 0.5) * sideLen;
      pushSeatSlot(sideInnerX + tier.rOff, tier.y, z, c, false);
      pushSeatSlot(-(sideInnerX + tier.rOff), tier.y, z, c, false);
    }

    // North (+Z Away section) & South (-Z Home end)
    for (let c = 0; c < endCols; c++) {
      const x = ((c + 0.5) / endCols - 0.5) * endLen;
      pushSeatSlot(x, tier.y, endInnerZ + tier.rOff, c, true);
      pushSeatSlot(x, tier.y, -(endInnerZ + tier.rOff), c, false);
    }

    // 4 Curved Corners computed from physical quarter-circle arc length
    const rCorner = CORNER_R_IN + tier.rOff;
    const cornerCols = Math.max(10, Math.round(((Math.PI / 2) * rCorner) / seatSpacing));
    for (let c = 0; c < cornerCols; c++) {
      const angle = ((c + 0.5) / cornerCols) * (Math.PI / 2);
      const dx = Math.cos(angle) * rCorner;
      const dz = Math.sin(angle) * rCorner;
      pushSeatSlot(END_HALF_LEN + dx, tier.y, SIDE_HALF_LEN + dz, c, true);
      pushSeatSlot(END_HALF_LEN + dx, tier.y, -SIDE_HALF_LEN - dz, c, false);
      pushSeatSlot(-END_HALF_LEN - dx, tier.y, SIDE_HALF_LEN + dz, c, false);
      pushSeatSlot(-END_HALF_LEN - dx, tier.y, -SIDE_HALF_LEN - dz, c, false);
    }
  }

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const homePri = new THREE.Color(params.homePrimary);
  const homeSec = new THREE.Color(params.homeSecondary);
  const awayPri = new THREE.Color(params.awayPrimary);
  const awaySec = new THREE.Color(params.awaySecondary);
  const seatHomeCol = homePri.clone().lerp(new THREE.Color('#0f172a'), 0.62);
  const seatSecCol = homeSec.clone().lerp(new THREE.Color('#1e293b'), 0.65);
  const neutralJackets = [
    new THREE.Color('#1e293b'),
    new THREE.Color('#334155'),
    new THREE.Color('#cbd5e1'),
    new THREE.Color('#0f172a'),
  ];
  const headPalette = [
    new THREE.Color('#dca47c'),
    new THREE.Color('#c88b61'),
    new THREE.Color('#9e643b'),
    new THREE.Color('#5a3926'),
    new THREE.Color('#231812'),
  ];

  // Instanced Mesh 1: Stadium Bucket Seats
  const seatMesh = new THREE.InstancedMesh(seatGeo, seatMat, allSeatSlots.length);
  seatMesh.frustumCulled = false;
  for (let i = 0; i < allSeatSlots.length; i++) {
    const s = allSeatSlots[i];
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, s.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    seatMesh.setMatrixAt(i, dummy.matrix);
    seatMesh.setColorAt(i, i % 9 === 0 ? seatSecCol : seatHomeCol);
  }
  seatMesh.instanceMatrix.needsUpdate = true;
  if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
  seatMesh.computeBoundingSphere();
  scene.add(seatMesh);

  // Instanced Meshes 2 & 3: Individual Seated 3D Spectators (Torso + Head)
  const occupiedSlots = allSeatSlots.filter((s) => s.occupied);
  const entries: CrowdSeatEntry[] = [];
  const torsoMesh = new THREE.InstancedMesh(fanTorsoGeo, fanTorsoMat, occupiedSlots.length);
  const headMesh = new THREE.InstancedMesh(fanHeadGeo, fanHeadMat, occupiedSlots.length);
  torsoMesh.frustumCulled = false;
  headMesh.frustumCulled = false;

  for (let i = 0; i < occupiedSlots.length; i++) {
    const s = occupiedSlots[i];
    const entry: CrowdSeatEntry = {
      x: s.x,
      y: s.y + 0.32,
      z: s.z,
      rotY: s.rotY,
      scale: s.scale,
      phase: s.phase,
    };
    entries.push(entry);

    dummy.position.set(entry.x, entry.y, entry.z);
    dummy.rotation.set(0, entry.rotY, 0);
    dummy.scale.setScalar(entry.scale);
    dummy.updateMatrix();
    torsoMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(entry.x, entry.y + 0.58 * entry.scale, entry.z);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);

    // Randomized team shirt distribution with natural brightness variance
    const r = (s.idx * 73 + i * 29) % 100;
    if (s.isAwayZone) {
      if (r < 68) col.copy(awayPri);
      else if (r < 85) col.copy(awaySec);
      else col.copy(neutralJackets[i % neutralJackets.length]);
    } else {
      if (r < 56) col.copy(homePri);
      else if (r < 78) col.copy(homeSec);
      else col.copy(neutralJackets[i % neutralJackets.length]);
    }
    const lum = 0.8 + ((i * 17) % 28) / 100;
    col.multiplyScalar(lum);
    torsoMesh.setColorAt(i, col);

    const hCol = headPalette[(i + s.idx) % headPalette.length];
    headMesh.setColorAt(i, hCol);
  }

  torsoMesh.instanceMatrix.needsUpdate = true;
  if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;
  torsoMesh.computeBoundingSphere();

  headMesh.instanceMatrix.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;
  headMesh.computeBoundingSphere();

  scene.add(torsoMesh, headMesh);

  return {
    goalNetGroups,
    cornerFlags,
    ledTex,
    ribbonTex,
    adMat,
    crowdGroup: {
      torsoMesh,
      headMesh,
      entries,
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
