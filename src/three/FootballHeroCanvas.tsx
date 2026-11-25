import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  afterDraw,
  applyStudioEnvironment,
  createFootballTextures,
  createStudioRenderer,
  detectSoftwareWebGL,
} from './webglUtils';

interface FootballHeroCanvasProps {
  onInteractSpin?: () => void;
}

const _vec3 = new THREE.Vector3();

export const FootballHeroCanvas: React.FC<FootballHeroCanvasProps> = ({ onInteractSpin }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const spinCallbackRef = useRef(onInteractSpin);
  spinCallbackRef.current = onInteractSpin;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(container, isSoftwareGl);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d11');
    scene.fog = new THREE.FogExp2('#080d11', 0.042);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.1,
      120
    );
    camera.position.set(-1.6, 1.4, 7.2);
    camera.lookAt(1.3, 0.25, 0);

    // 3-point stadium showcase lighting
    const hemi = new THREE.HemisphereLight('#38bdf8', '#091118', 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 2.4);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#00e5ff', 1.8);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Composite Hero Group placed on right side so left third stays calm negative space for title lockup
    const heroAnchor = new THREE.Group();
    heroAnchor.position.set(1.85, 0.1, 0);
    scene.add(heroAnchor);

    // Pedestal & Turf Disc (composite 5-part base)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -1.65;
    heroAnchor.add(pedestalGroup);

    const outerRingGeo = new THREE.CylinderGeometry(2.3, 2.45, 0.16, 48);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: '#111b21',
      metalness: 0.78,
      roughness: 0.25,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.receiveShadow = true;
    pedestalGroup.add(outerRing);

    const accentRingGeo = new THREE.TorusGeometry(2.22, 0.035, 16, 64);
    accentRingGeo.rotateX(Math.PI / 2);
    const accentRingMat = new THREE.MeshStandardMaterial({
      color: '#00e5ff',
      emissive: '#00e5ff',
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.2,
    });
    const accentRing = new THREE.Mesh(accentRingGeo, accentRingMat);
    accentRing.position.y = 0.09;
    pedestalGroup.add(accentRing);

    const innerTurfGeo = new THREE.CylinderGeometry(2.05, 2.05, 0.18, 48);
    const innerTurfMat = new THREE.MeshStandardMaterial({
      color: '#144d27',
      roughness: 0.9,
      metalness: 0.02,
    });
    const innerTurf = new THREE.Mesh(innerTurfGeo, innerTurfMat);
    innerTurf.position.y = 0.01;
    innerTurf.receiveShadow = true;
    pedestalGroup.add(innerTurf);

    // Grounded contact shadow disc beneath ball
    const shadowDiscGeo = new THREE.CircleGeometry(1.15, 32);
    shadowDiscGeo.rotateX(-Math.PI / 2);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: '#020508',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    shadowDisc.position.y = 0.115;
    pedestalGroup.add(shadowDisc);

    // Composite 3D Football (layered sphere + recessed icosahedron seam cage + valve detail + orbiting telemetry ring)
    const ballGroup = new THREE.Group();
    ballGroup.position.set(0, 0.22, 0);
    heroAnchor.add(ballGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { map: ballMap, bumpMap: ballBump } = createFootballTextures(maxAniso);

    const ballCoreGeo = new THREE.SphereGeometry(1.22, 64, 48);
    const ballCoreMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: ballMap,
      bumpMap: ballBump,
      bumpScale: 0.032,
      roughness: 0.34,
      metalness: 0.05,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
    });
    const ballMesh = new THREE.Mesh(ballCoreGeo, ballCoreMat);
    ballMesh.castShadow = true;
    ballGroup.add(ballMesh);

    // Orbiting tactical halo ring
    const haloGeo = new THREE.TorusGeometry(1.72, 0.02, 12, 72);
    const haloMat = new THREE.MeshStandardMaterial({
      color: '#b7ff4a',
      emissive: '#b7ff4a',
      emissiveIntensity: 0.65,
      metalness: 0.85,
      roughness: 0.2,
    });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = Math.PI * 0.36;
    haloRing.rotation.y = Math.PI * 0.15;
    heroAnchor.add(haloRing);

    // Distant stadium floodlight pylons (silhouette landmarks)
    const pylonMat = new THREE.MeshStandardMaterial({ color: '#1b2833', metalness: 0.6, roughness: 0.45 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#e0f2fe',
      emissiveIntensity: 1.6,
    });
    const pylonGroup = new THREE.Group();
    const pylonGeo = new THREE.BoxGeometry(0.32, 9.5, 0.32);
    const headGeo = new THREE.BoxGeometry(1.8, 0.85, 0.25);
    [
      [-9, 3.2, -16],
      [11, 3.2, -15],
      [14, 3.2, -9],
    ].forEach(([px, py, pz]) => {
      const p = new THREE.Group();
      p.position.set(px, py, pz);
      const mast = new THREE.Mesh(pylonGeo, pylonMat);
      const head = new THREE.Mesh(headGeo, bulbMat);
      head.position.y = 4.6;
      head.lookAt(0, 0, 0);
      p.add(mast, head);
      pylonGroup.add(p);
    });
    scene.add(pylonGroup);

    // Instanced floating stadium light motes (atmospheric depth)
    const moteCount = 90;
    const moteGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    const moteMat = new THREE.MeshBasicMaterial({ color: '#b7ff4a', transparent: true, opacity: 0.45 });
    const motes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < moteCount; i++) {
      dummy.position.set(
        ((i * 17) % 18) - 8,
        ((i * 11) % 7) - 1.5,
        ((i * 23) % 14) - 10
      );
      dummy.updateMatrix();
      motes.setMatrixAt(i, dummy.matrix);
    }
    motes.computeBoundingSphere();
    scene.add(motes);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Interactive drag-to-spin & cursor parallax
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let velX = 0.0;
    let velY = 0.55;
    let pointerNormX = 0;
    let pointerNormY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNormX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerNormY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velY = dx * 0.055;
      velX = dy * 0.045;
      ballGroup.rotation.y += dx * 0.01;
      ballGroup.rotation.x += dy * 0.01;
      spinCallbackRef.current?.();
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (!isDragging) {
        velY = THREE.MathUtils.damp(velY, 0.55, 2.5, dt);
        velX = THREE.MathUtils.damp(velX, 0.14, 2.5, dt);
        ballGroup.rotation.y += velY * dt;
        ballGroup.rotation.x += velX * dt;
      }

      // Gentle float & contact shadow scale coupling
      const hoverY = Math.sin(elapsed * 1.6) * 0.12;
      ballGroup.position.y = 0.25 + hoverY;
      const s = 1 - hoverY * 0.35;
      shadowDisc.scale.set(s, s, 1);

      haloRing.rotation.z = elapsed * 0.35;

      // Subtle camera parallax
      _vec3.set(-1.6 + pointerNormX * 0.45, 1.35 - pointerNormY * 0.25, 7.2);
      camera.position.lerp(_vec3, 1 - Math.exp(-3.5 * dt));
      camera.lookAt(1.3, 0.15, 0);

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

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);

      ballMap.dispose();
      ballBump.dispose();
      ballCoreGeo.dispose();
      ballCoreMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      accentRingGeo.dispose();
      accentRingMat.dispose();
      innerTurfGeo.dispose();
      innerTurfMat.dispose();
      shadowDiscGeo.dispose();
      shadowDiscMat.dispose();
      pylonGeo.dispose();
      headGeo.dispose();
      pylonMat.dispose();
      bulbMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
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
      data-testid="hero-3d-canvas"
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};
