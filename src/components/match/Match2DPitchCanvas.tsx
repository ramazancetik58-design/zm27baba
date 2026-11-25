import React, { useEffect, useRef } from 'react';
import { Live2DTelemetry } from '../../three/Match3DEngineCanvas';
import { PITCH_L, PITCH_W } from '../../three/pitchConstants';

interface Match2DPitchCanvasProps {
  telemetryRef: React.MutableRefObject<Live2DTelemetry | null>;
}

export const Match2DPitchCanvas: React.FC<Match2DPitchCanvasProps> = ({ telemetryRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    let disposed = false;

    const renderFrame = () => {
      if (disposed) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth || 1000;
        const h = canvas.clientHeight || 620;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          // Stadium dark surround
          ctx.fillStyle = '#07111a';
          ctx.fillRect(0, 0, w, h);

          // Horizontal FM26 2D Pitch (X along vertical axis, Z along horizontal: Home attacks right +Z)
          const padX = Math.max(48, w * 0.08);
          const padY = Math.max(76, h * 0.14);
          const pw = w - padX * 2;
          const ph = h - padY * 2;

          // Mowed stripes across pitch length (14 columns)
          const stripes = 14;
          for (let i = 0; i < stripes; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#145229' : '#186332';
            ctx.fillRect(padX + (i * pw) / stripes, padY, pw / stripes + 1, ph);
          }

          // Crisp field markings
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.88)';
          ctx.lineWidth = 2;
          ctx.strokeRect(padX, padY, pw, ph);

          // Center line & circle
          ctx.beginPath();
          ctx.moveTo(padX + pw / 2, padY);
          ctx.lineTo(padX + pw / 2, padY + ph);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(padX + pw / 2, padY + ph / 2, Math.min(pw, ph) * 0.14, 0, Math.PI * 2);
          ctx.stroke();

          // Left & Right penalty boxes + goals
          const penLen = pw * 0.16;
          const penWid = ph * 0.52;
          const sixLen = pw * 0.06;
          const sixWid = ph * 0.24;
          ctx.strokeRect(padX, padY + (ph - penWid) / 2, penLen, penWid);
          ctx.strokeRect(padX, padY + (ph - sixWid) / 2, sixLen, sixWid);
          ctx.strokeRect(padX + pw - penLen, padY + (ph - penWid) / 2, penLen, penWid);
          ctx.strokeRect(padX + pw - sixLen, padY + (ph - sixWid) / 2, sixLen, sixWid);

          // Goal nets outside endlines
          const goalW = ph * 0.14;
          ctx.strokeStyle = '#94a3b8';
          ctx.strokeRect(padX - 10, padY + (ph - goalW) / 2, 10, goalW);
          ctx.strokeRect(padX + pw, padY + (ph - goalW) / 2, 10, goalW);

          const tel = telemetryRef.current;
          if (tel) {
            const to2D = (wx: number, wz: number) => ({
              px: padX + ((wz + PITCH_L / 2) / PITCH_L) * pw,
              py: padY + ((wx + PITCH_W / 2) / PITCH_W) * ph,
            });

            // Referee token
            const refPos = to2D(tel.referee.x, tel.referee.z);
            ctx.beginPath();
            ctx.arc(refPos.px, refPos.py, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#eab308';
            ctx.fill();
            ctx.strokeStyle = '#080d11';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 22 Player circles with condition ring & carrier halo
            for (const act of tel.actors) {
              const p = to2D(act.x, act.z);
              if (act.hasBall) {
                ctx.beginPath();
                ctx.arc(p.px, p.py, 15, 0, Math.PI * 2);
                ctx.strokeStyle = '#b7ff4a';
                ctx.lineWidth = 2.5;
                ctx.stroke();
              }

              ctx.beginPath();
              ctx.arc(p.px, p.py, 10, 0, Math.PI * 2);
              ctx.fillStyle =
                act.role === 'GK'
                  ? '#f59e0b'
                  : act.team === 'HOME'
                  ? tel.homeColor
                  : tel.awayColor;
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = act.hasBall ? '#ffffff' : '#080d11';
              ctx.stroke();

              // Role micro-tag
              ctx.fillStyle = '#f8fafc';
              ctx.font = '700 8px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(act.role, p.px, p.py + 16);
            }

            // Ball & height-scaled shadow
            const bPos = to2D(tel.ball.x, tel.ball.z);
            const hBoost = Math.max(0, (tel.ball.y - 0.26) * 1.4);
            ctx.beginPath();
            ctx.arc(bPos.px + hBoost, bPos.py + hBoost + 2, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(bPos.px, bPos.py - hBoost, 5.5 + hBoost * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Subtle FM26 2D Mode directional indicator
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = 'bold 11px "Chakra Petch", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${tel.homeShort} KALESİ →`, padX + 8, padY - 12);
            ctx.textAlign = 'right';
            ctx.fillText(`← ${tel.awayShort} KALESİ`, padX + pw - 8, padY - 12);
          }

          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
    };
  }, [telemetryRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="match-2d-canvas"
      className="absolute inset-0 w-full h-full block"
    />
  );
};
