import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getPlayerDisplayName } from '../engine/hardcoreRules';
import { Club, LicenseMode, PlayerRole, TacticalSlot } from '../engine/types';
import {
  afterDraw,
  applyStudioEnvironment,
  createGoalNetTexture,
  createPitchTextures,
  createStudioRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

interface Tactics3DPitchCanvasProps {
  club: Club;
  slots: TacticalSlot[];
  selectedSlotIndex: number | null;
  defensiveLine: number;
  licenseMode: LicenseMode;
  topDownView: boolean;
  onSelectSlot: (slotIndex: number) => void;
  onMoveSlot: (slotIndex: number, x: number, z: number, inferredRole: PlayerRole) => void;
}

const PITCH_HALF_W = 13.5; // X span: [-13.5, 13.5]
const PITCH_HALF_L = 19.5; // Z span: [-19.5, 19.5] (-Z = own goal, +Z = opponent goal)

function inferRoleFromCoords(x: number, z: number, currentRole: PlayerRole): PlayerRole {
  if (z < -0.78 && Math.abs(x) < 0.35) return 'GK';
  if (currentRole === 'GK' && z < -0.68) return 'GK';
  if (z < -0.32) {
    if (x < -0.45) return 'LB';
    if (x > 0.45) return 'RB';
    return 'CB';
  }
  if (z < -0.08) return 'CDM';
  if (z < 0.16) return 'CM';
  if (z < 0.38) {
    if (x < -0.42) return 'LW';
    if (x > 0.42) return 'RW';
    return 'CAM';
  }
  if (x < -0.42) return 'LW';
  if (x > 0.42) return 'RW';
  return 'ST';
}

function makeBadgeTexture(shirtNumber: number, label: string, selected: boolean, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 96);

  ctx.fillStyle = selected ? 'rgba(183, 255, 74, 0.96)' : 'rgba(8, 13, 17, 0.88)';
  ctx.beginPath();
  ctx.roundRect(8, 12, 240, 72, 14);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = selected ? '#ffffff' : accentHex;
  ctx.stroke();

  ctx.fillStyle = selected ? '#080d11' : '#b7ff4a';
  ctx.font = 'bold 30px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${shirtNumber}`, 22, 48);

  ctx.fillStyle = selected ? '#080d11' : '#f8fafc';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(label.slice(0, 11), 84, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Tactics3DPitchCanvas: React.FC<Tactics3DPitchCanvasProps> = ({
  club,
  slots,
  selectedSlotIndex,
  defensiveLine,
  licenseMode,
  topDownView,
  onSelectSlot,
  onMoveSlot,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    club,
    slots,
    selectedSlotIndex,
    defensiveLine,
    licenseMode,
    topDownView,
    onSelectSlot,
    onMoveSlot,
  });
  propsRef.current = {
    club,
    slots,
    selectedSlotIndex,
    defensiveLine,
    licenseMode,
    topDownView,
    onSelectSlot,
    onMoveSlot,
  };

  const dirtyRef = useRef(true);
  useEffect(() => {
    dirtyRef.current = true;
  }, [club, slots, selectedSlotIndex, defensiveLine, licenseMode, topDownView]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(container, isSoftwareGl);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d11');
    scene.fog = new THREE.FogExp2('#080d11', 0.013);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      44,
      (container.clientWidth || 900) / (container.clientHeight || 600),
      0.1,
      150
    );
    camera.position.set(0, 26, 28);
    camera.lookAt(0, 0, -1);

    const hemi = new THREE.HemisphereLight('#7dd3fc', '#0b1610', 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#fff8eb', 2.0);
    key.position.set(16, 32, 18);
    key.castShadow = !isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -22;
    key.shadow.camera.right = 22;
    key.shadow.camera.top = 24;
    key.shadow.camera.bottom = -24;
    key.shadow.bias = -0.0005;
    scene.add(key);

    // Pitch surface
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { map: pitchMap, bumpMap: pitchBump } = createPitchTextures(maxAniso);
    const pitchGeo = new THREE.PlaneGeometry(PITCH_HALF_W * 2, PITCH_HALF_L * 2);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: pitchMap,
      bumpMap: pitchBump,
      bumpScale: 0.04,
      roughness: 0.86,
      metalness: 0.02,
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    // Surrounding stadium apron
    const apronGeo = new THREE.PlaneGeometry(PITCH_HALF_W * 2.55, PITCH_HALF_L * 2.4);
    apronGeo.rotateX(-Math.PI / 2);
    const apronMat = new THREE.MeshStandardMaterial({ color: '#0e1820', roughness: 0.92, metalness: 0.05 });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.position.y = -0.03;
    scene.add(apronMesh);

    // 3D Goalposts + Woven Nylon Nets at both ends
    const postMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.45, roughness: 0.25 });
    const goalNetTex = createGoalNetTexture(maxAniso);
    const goalNetMat = new THREE.MeshBasicMaterial({
      map: goalNetTex,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.2, 12);
    const crossGeo = new THREE.CylinderGeometry(0.1, 0.1, 6.2, 12);
    crossGeo.rotateZ(Math.PI / 2);
    const netBackGeo = new THREE.PlaneGeometry(6.0, 2.2);
    const netSideGeo = new THREE.PlaneGeometry(1.5, 2.2);
    const netRoofGeo = new THREE.PlaneGeometry(6.0, 1.5);
    [-1, 1].forEach((dir) => {
      const gz = dir * (PITCH_HALF_L - 1.15);
      const g = new THREE.Group();
      const l = new THREE.Mesh(postGeo, postMat);
      l.position.set(-3.0, 1.1, gz);
      const r = new THREE.Mesh(postGeo, postMat);
      r.position.set(3.0, 1.1, gz);
      const c = new THREE.Mesh(crossGeo, postMat);
      c.position.set(0, 2.2, gz);

      const back = new THREE.Mesh(netBackGeo, goalNetMat);
      back.position.set(0, 1.1, gz + dir * 1.45);
      const sideL = new THREE.Mesh(netSideGeo, goalNetMat);
      sideL.rotation.y = Math.PI / 2;
      sideL.position.set(-3.0, 1.1, gz + dir * 0.72);
      const sideR = new THREE.Mesh(netSideGeo, goalNetMat);
      sideR.rotation.y = Math.PI / 2;
      sideR.position.set(3.0, 1.1, gz + dir * 0.72);
      const roof = new THREE.Mesh(netRoofGeo, goalNetMat);
      roof.rotation.x = Math.PI / 2;
      roof.position.set(0, 2.2, gz + dir * 0.72);

      g.add(l, r, c, back, sideL, sideR, roof);
      scene.add(g);
    });

    // Defensive line tactical laser strip
    const defLineGeo = new THREE.BoxGeometry(PITCH_HALF_W * 1.88, 0.04, 0.16);
    const defLineMat = new THREE.MeshBasicMaterial({ color: '#00e5ff', transparent: true, opacity: 0.65 });
    const defLineMesh = new THREE.Mesh(defLineGeo, defLineMat);
    defLineMesh.position.y = 0.04;
    scene.add(defLineMesh);

    // Tactical formation connecting lines (glowing line segments between adjacent lines)
    const maxLinkPairs = 24;
    const linkPositions = new Float32Array(maxLinkPairs * 2 * 3);
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
    const linkMat = new THREE.LineBasicMaterial({
      color: '#00e5ff',
      transparent: true,
      opacity: 0.34,
    });
    const linkLines = new THREE.LineSegments(linkGeo, linkMat);
    linkLines.position.y = 0.06;
    scene.add(linkLines);

    // 11 Draggable Articulated 3D Player Tokens
    const tokenGroups: THREE.Group[] = [];
    const hitTargets: THREE.Mesh[] = [];
    const hitGeo = new THREE.CylinderGeometry(1.15, 1.15, 2.7, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const ringGeo = new THREE.RingGeometry(0.85, 1.14, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const shadowGeo = new THREE.CircleGeometry(0.95, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shortsGeo = new THREE.CapsuleGeometry(0.24, 0.14, 8, 14);
    const legGeo = new THREE.CapsuleGeometry(0.095, 0.36, 8, 12);
    const torsoGeo = new THREE.CapsuleGeometry(0.29, 0.36, 10, 16);
    const armGeo = new THREE.CapsuleGeometry(0.072, 0.36, 8, 10);
    const headGeo = new THREE.SphereGeometry(0.24, 16, 14);
    const hairGeo = new THREE.SphereGeometry(0.255, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const bootGeo = new THREE.CapsuleGeometry(0.08, 0.14, 6, 10);
    bootGeo.rotateX(Math.PI / 2);

    const shadowMat = new THREE.MeshBasicMaterial({ color: '#020406', transparent: true, opacity: 0.5, depthWrite: false });
    const bootMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45 });
    const extraTokenMats: THREE.Material[] = [];

    for (let i = 0; i < 11; i++) {
      const group = new THREE.Group();

      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = 0.025;
      group.add(shadow);

      const ringMat = new THREE.MeshBasicMaterial({ color: '#b7ff4a', side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.035;
      ring.name = 'ring';
      group.add(ring);

      const body = new THREE.Group();
      body.name = 'body';

      const legL = new THREE.Mesh(legGeo, bootMat);
      legL.position.set(-0.14, 0.3, 0);
      const legR = new THREE.Mesh(legGeo, bootMat);
      legR.position.set(0.14, 0.3, 0);
      const bootL = new THREE.Mesh(bootGeo, bootMat);
      bootL.position.set(-0.14, 0.06, 0.05);
      const bootR = new THREE.Mesh(bootGeo, bootMat);
      bootR.position.set(0.14, 0.06, 0.05);
      body.add(legL, legR, bootL, bootR);

      const shortsMat = new THREE.MeshStandardMaterial({ color: club.secondaryColor, roughness: 0.65 });
      const shorts = new THREE.Mesh(shortsGeo, shortsMat);
      shorts.position.y = 0.64;
      shorts.name = 'shorts';
      body.add(shorts);

      const torsoMat = new THREE.MeshStandardMaterial({ color: club.primaryColor, roughness: 0.5, metalness: 0.08 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 1.06;
      torso.castShadow = true;
      torso.name = 'torso';
      body.add(torso);

      const skinMat = new THREE.MeshStandardMaterial({ color: '#eab696', roughness: 0.6 });
      const hairMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.75 });
      extraTokenMats.push(shortsMat, skinMat, hairMat);

      const armL = new THREE.Mesh(armGeo, torsoMat);
      armL.position.set(-0.42, 1.08, 0);
      armL.rotation.z = 0.18;
      armL.name = 'armL';
      const armR = new THREE.Mesh(armGeo, torsoMat);
      armR.position.set(0.42, 1.08, 0);
      armR.rotation.z = -0.18;
      armR.name = 'armR';
      body.add(armL, armR);

      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.62;
      head.castShadow = true;
      head.name = 'head';
      body.add(head);

      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.63;
      hair.name = 'hair';
      body.add(hair);

      group.add(body);

      const badgeMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
      const badge = new THREE.Sprite(badgeMat);
      badge.position.set(0, 2.58, 0);
      badge.scale.set(3.8, 1.38, 1);
      badge.name = 'badge';
      group.add(badge);

      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.y = 1.2;
      hit.userData.slotIndex = i;
      group.add(hit);
      hitTargets.push(hit);

      scene.add(group);
      tokenGroups.push(group);
    }

    const syncTokens = () => {
      const { club: c, slots: sl, selectedSlotIndex: sel, defensiveLine: dl, licenseMode: lm } = propsRef.current;

      // Position defensive line marker (-Z = own goal, +Z = opp goal)
      const defNorm = -0.72 + (dl / 100) * 0.56;
      defLineMesh.position.z = defNorm * PITCH_HALF_L;

      const worldCoords: Array<{ x: number; z: number }> = [];

      for (let i = 0; i < 11; i++) {
        const slot = sl[i];
        const grp = tokenGroups[i];
        if (!slot || !grp) continue;

        const targetX = slot.x * (PITCH_HALF_W - 1.6);
        const targetZ = slot.z * (PITCH_HALF_L - 1.8);
        worldCoords.push({ x: targetX, z: targetZ });
        grp.position.set(targetX, 0, targetZ);

        const isSelected = sel === i;
        const player = c.players.find((p) => p.id === slot.playerId);
        const isGK = slot.role === 'GK';

        const ring = grp.getObjectByName('ring') as THREE.Mesh;
        (ring.material as THREE.MeshBasicMaterial).color.set(
          isSelected ? '#b7ff4a' : isGK ? '#f59e0b' : '#00e5ff'
        );
        ring.scale.setScalar(isSelected ? 1.32 : 1.0);

        const body = grp.getObjectByName('body') as THREE.Group;
        body.position.y = isSelected ? 0.16 : 0;

        const torso = grp.getObjectByName('torso') as THREE.Mesh;
        (torso.material as THREE.MeshStandardMaterial).color.set(isGK ? '#f59e0b' : c.primaryColor);
        const shorts = grp.getObjectByName('shorts') as THREE.Mesh;
        (shorts.material as THREE.MeshStandardMaterial).color.set(c.secondaryColor);

        if (player) {
          const head = grp.getObjectByName('head') as THREE.Mesh;
          (head.material as THREE.MeshStandardMaterial).color.set(player.appearance.skinTone);
          const hair = grp.getObjectByName('hair') as THREE.Mesh;
          hair.visible = player.appearance.hairStyle !== 'BALD';
          (hair.material as THREE.MeshStandardMaterial).color.set(player.appearance.hairColor);
        }

        const badge = grp.getObjectByName('badge') as THREE.Sprite;
        const badgeKey = `${player?.id ?? 'empty'}_${sel === i}_${lm}_${slot.role}`;
        if (badge.userData.badgeKey !== badgeKey) {
          badge.userData.badgeKey = badgeKey;
          const oldTex = (badge.material as THREE.SpriteMaterial).map;
          if (oldTex) oldTex.dispose();
          const label = player ? getPlayerDisplayName(player, lm) : slot.role;
          const tex = makeBadgeTexture(player?.shirtNumber ?? i + 1, label, isSelected, c.primaryColor);
          (badge.material as THREE.SpriteMaterial).map = tex;
          (badge.material as THREE.SpriteMaterial).needsUpdate = true;
        }
      }

      // Connect tactical shape links (nearest neighbors sorted by Z)
      let segIdx = 0;
      const sorted = worldCoords
        .map((pt, idx) => ({ ...pt, idx }))
        .sort((a, b) => a.z - b.z);
      for (let i = 0; i < sorted.length && segIdx < maxLinkPairs; i++) {
        for (let j = i + 1; j < Math.min(sorted.length, i + 4) && segIdx < maxLinkPairs; j++) {
          const dz = Math.abs(sorted[i].z - sorted[j].z);
          const dx = Math.abs(sorted[i].x - sorted[j].x);
          if (dz < 14 && dx < 16) {
            const base = segIdx * 6;
            linkPositions[base] = sorted[i].x;
            linkPositions[base + 1] = 0;
            linkPositions[base + 2] = sorted[i].z;
            linkPositions[base + 3] = sorted[j].x;
            linkPositions[base + 4] = 0;
            linkPositions[base + 5] = sorted[j].z;
            segIdx++;
          }
        }
      }
      for (let k = segIdx * 6; k < linkPositions.length; k++) {
        linkPositions[k] = 0;
      }
      linkGeo.attributes.position.needsUpdate = true;
      linkGeo.setDrawRange(0, segIdx * 2);
    };

    syncTokens();

    // Raycast Drag-and-Drop on pitch plane
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPt = new THREE.Vector3();
    let draggingSlot: number | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.slotIndex as number;
        draggingSlot = idx;
        propsRef.current.onSelectSlot(idx);
        renderer.domElement.style.cursor = 'grabbing';
        dirtyRef.current = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (draggingSlot === null) {
        updatePointer(e);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hitTargets, false);
        renderer.domElement.style.cursor = hits.length > 0 ? 'grab' : 'default';
        return;
      }

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
        const nx = THREE.MathUtils.clamp(intersectPt.x / (PITCH_HALF_W - 1.6), -0.92, 0.92);
        const nz = THREE.MathUtils.clamp(intersectPt.z / (PITCH_HALF_L - 1.8), -0.92, 0.88);
        const curSlot = propsRef.current.slots[draggingSlot];
        const inferred = inferRoleFromCoords(nx, nz, curSlot?.role ?? 'CM');
        propsRef.current.onMoveSlot(draggingSlot, Math.round(nx * 100) / 100, Math.round(nz * 100) / 100, inferred);
        dirtyRef.current = true;
      }
    };

    const onPointerUp = () => {
      if (draggingSlot !== null) {
        draggingSlot = null;
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      dirtyRef.current = true;
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    const targetCamPos = new THREE.Vector3();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);

      syncTokens();

      if (propsRef.current.topDownView) {
        targetCamPos.set(0, 44, 2.5);
      } else {
        targetCamPos.set(0, 26, 28);
      }

      const camDist = camera.position.distanceTo(targetCamPos);
      if (camDist > 0.05) {
        camera.position.lerp(targetCamPos, 1 - Math.exp(-6 * dt));
        camera.lookAt(0, 0, -1);
        dirtyRef.current = true;
      }

      if (dirtyRef.current || draggingSlot !== null) {
        dirtyRef.current = false;
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);

      pitchMap.dispose();
      pitchBump.dispose();
      pitchGeo.dispose();
      pitchMat.dispose();
      apronGeo.dispose();
      apronMat.dispose();
      postGeo.dispose();
      crossGeo.dispose();
      postMat.dispose();
      goalNetTex.dispose();
      goalNetMat.dispose();
      netBackGeo.dispose();
      netSideGeo.dispose();
      netRoofGeo.dispose();
      defLineGeo.dispose();
      defLineMat.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      ringGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shortsGeo.dispose();
      legGeo.dispose();
      torsoGeo.dispose();
      armGeo.dispose();
      headGeo.dispose();
      hairGeo.dispose();
      bootGeo.dispose();
      bootMat.dispose();
      extraTokenMats.forEach((m) => m.dispose());
      tokenGroups.forEach((g) => {
        const badge = g.getObjectByName('badge') as THREE.Sprite;
        if (badge) {
          const mat = badge.material as THREE.SpriteMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
        const ring = g.getObjectByName('ring') as THREE.Mesh;
        (ring?.material as THREE.Material)?.dispose();
        const torso = g.getObjectByName('torso') as THREE.Mesh;
        (torso?.material as THREE.Material)?.dispose();
      });
      envTex.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="tactics-3d-canvas"
      className="w-full h-full relative rounded-lg overflow-hidden"
    />
  );
};
