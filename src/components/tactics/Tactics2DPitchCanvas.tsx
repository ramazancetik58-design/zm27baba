import React, { useEffect, useRef } from 'react';
import { getPlayerDisplayName } from '../../engine/hardcoreRules';
import { Club, LicenseMode, PlayerRole, TacticalSlot } from '../../engine/types';

interface Tactics2DPitchCanvasProps {
  club: Club;
  slots: TacticalSlot[];
  selectedSlotIndex: number | null;
  defensiveLine: number;
  licenseMode: LicenseMode;
  onSelectSlot: (slotIndex: number) => void;
  onMoveSlot: (slotIndex: number, x: number, z: number, inferredRole: PlayerRole) => void;
}

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

export const Tactics2DPitchCanvas: React.FC<Tactics2DPitchCanvasProps> = ({
  club,
  slots,
  selectedSlotIndex,
  defensiveLine,
  licenseMode,
  onSelectSlot,
  onMoveSlot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const propsRef = useRef({ club, slots, selectedSlotIndex, defensiveLine, licenseMode, onSelectSlot, onMoveSlot });
  propsRef.current = { club, slots, selectedSlotIndex, defensiveLine, licenseMode, onSelectSlot, onMoveSlot };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 720;
    const h = canvas.clientHeight || 540;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background & Stadium border
    ctx.fillStyle = '#09141d';
    ctx.fillRect(0, 0, w, h);

    const padX = Math.max(36, w * 0.08);
    const padY = Math.max(24, h * 0.055);
    const pw = w - padX * 2;
    const ph = h - padY * 2;

    // Alternating mowed grass bands
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#144d26' : '#195f2f';
      ctx.fillRect(padX, padY + (i * ph) / stripes, pw, ph / stripes + 1);
    }

    // Crisp pitch lines
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, padY, pw, ph);

    // Halfway line & circle
    ctx.beginPath();
    ctx.moveTo(padX, padY + ph / 2);
    ctx.lineTo(padX + pw, padY + ph / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(pw, ph) * 0.13, 0, Math.PI * 2);
    ctx.stroke();

    // Penalty boxes (Top = opponent +z, Bottom = own goal -z)
    const penW = pw * 0.52;
    const penH = ph * 0.16;
    const sixW = pw * 0.25;
    const sixH = ph * 0.06;
    ctx.strokeRect((w - penW) / 2, padY, penW, penH);
    ctx.strokeRect((w - sixW) / 2, padY, sixW, sixH);
    ctx.strokeRect((w - penW) / 2, padY + ph - penH, penW, penH);
    ctx.strokeRect((w - sixW) / 2, padY + ph - sixH, sixW, sixH);

    // Defensive line tactical guide
    const defNorm = -0.72 + (defensiveLine / 100) * 0.56;
    const defScreenY = padY + ((1 - defNorm) / 2) * ph;
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, defScreenY);
    ctx.lineTo(padX + pw, defScreenY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SAVUNMA HATTI (${defensiveLine})`, padX + pw - 6, defScreenY - 6);

    const toScreen = (sx: number, sz: number) => ({
      px: padX + ((sx + 1) / 2) * pw,
      py: padY + ((1 - sz) / 2) * ph,
    });

    // Formation links between nearest neighbors
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
    ctx.lineWidth = 1.5;
    const sorted = slots.map((s) => ({ ...s, ...toScreen(s.x, s.z) })).sort((a, b) => a.z - b.z);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < Math.min(sorted.length, i + 4); j++) {
        if (Math.abs(sorted[i].z - sorted[j].z) < 0.45 && Math.abs(sorted[i].x - sorted[j].x) < 0.85) {
          ctx.beginPath();
          ctx.moveTo(sorted[i].px, sorted[i].py);
          ctx.lineTo(sorted[j].px, sorted[j].py);
          ctx.stroke();
        }
      }
    }

    // Draw 11 interactive tokens
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const { px, py } = toScreen(slot.x, slot.z);
      const player = club.players.find((p) => p.id === slot.playerId);
      const isSelected = selectedSlotIndex === i;
      const isGK = slot.role === 'GK';

      const tokenBg = isSelected ? '#b7ff4a' : isGK ? '#f59e0b' : club.primaryColor;
      const isLightToken = (() => {
        const hex = tokenBg.replace('#', '');
        if (hex.length !== 6) return isSelected;
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) > 175;
      })();

      // Outer selection ring
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 22 : 18, 0, Math.PI * 2);
      ctx.fillStyle = tokenBg;
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#ffffff' : isLightToken ? '#0f172a' : '#00e5ff';
      ctx.stroke();

      // Shirt number (high contrast against light kits like Real Madrid white)
      ctx.fillStyle = isLightToken ? '#080d11' : '#ffffff';
      ctx.font = '800 13px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${player?.shirtNumber ?? i + 1}`, px, py);

      // Name & role label pill
      const label = `${slot.role} · ${player ? getPlayerDisplayName(player, licenseMode).split(' ').pop() : 'Boş'}`;
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = isSelected ? '#b7ff4a' : 'rgba(8, 13, 17, 0.88)';
      ctx.beginPath();
      ctx.roundRect(px - tw / 2, py + 22, tw, 18, 5);
      ctx.fill();
      ctx.fillStyle = isSelected ? '#080d11' : '#f8fafc';
      ctx.fillText(label, px, py + 31);
    }
  }, [club, slots, selectedSlotIndex, defensiveLine, licenseMode]);

  const getPitchCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const padX = Math.max(36, w * 0.08);
    const padY = Math.max(24, h * 0.055);
    const pw = w - padX * 2;
    const ph = h - padY * 2;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    return {
      cx,
      cy,
      nx: Math.max(-0.92, Math.min(0.92, ((cx - padX) / pw) * 2 - 1)),
      nz: Math.max(-0.92, Math.min(0.88, 1 - ((cy - padY) / ph) * 2)),
      padX,
      padY,
      pw,
      ph,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="tactics-2d-canvas"
      className="w-full h-full rounded-lg cursor-grab active:cursor-grabbing block"
      onPointerDown={(e) => {
        const { cx, cy, padX, padY, pw, ph } = getPitchCoords(e);
        let hitIdx: number | null = null;
        let bestDist = 28;
        propsRef.current.slots.forEach((s, idx) => {
          const sx = padX + ((s.x + 1) / 2) * pw;
          const sy = padY + ((1 - s.z) / 2) * ph;
          const d = Math.hypot(cx - sx, cy - sy);
          if (d < bestDist) {
            bestDist = d;
            hitIdx = idx;
          }
        });
        if (hitIdx !== null) {
          draggingRef.current = hitIdx;
          propsRef.current.onSelectSlot(hitIdx);
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }
      }}
      onPointerMove={(e) => {
        if (draggingRef.current === null) return;
        const { nx, nz } = getPitchCoords(e);
        const slotIdx = draggingRef.current;
        const cur = propsRef.current.slots[slotIdx];
        propsRef.current.onMoveSlot(
          slotIdx,
          Math.round(nx * 100) / 100,
          Math.round(nz * 100) / 100,
          inferRoleFromCoords(nx, nz, cur?.role ?? 'CM')
        );
      }}
      onPointerUp={(e) => {
        if (draggingRef.current !== null) {
          draggingRef.current = null;
          try {
            (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
      }}
    />
  );
};
