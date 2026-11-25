import React, { useState } from 'react';
import type { MatchAnalysis, PlayerRating, Side } from '../engine/matchAnalysis';

interface Props {
  analysis: MatchAnalysis;
  homeName: string;
  awayName: string;
  /** Kullanıcının takımı: puan listesinde önce gösterilir. */
  mySide: Side;
  language: 'tr' | 'en' | string;
}

const HOME_COLOR = '#00e5ff';
const AWAY_COLOR = '#ffb020';
const W = 68;
const L = 105;

const ratingClass = (r: number) =>
  r >= 8 ? 'bg-[#b7ff4a] text-[#080d11]' : r >= 7 ? 'bg-emerald-500/30 text-emerald-200' : r >= 6 ? 'bg-white/10 text-slate-200' : 'bg-red-500/25 text-red-300';

/** Dikey saha: x genişlik (-34..34), z uzunluk (-52.5..52.5). */
const Pitch: React.FC<{ analysis: MatchAnalysis; tr: boolean }> = ({ analysis, tr }) => {
  const px = (x: number) => x + W / 2;
  const py = (z: number) => z + L / 2;
  const shots = analysis.shots;
  return (
    <svg viewBox={`-2 -2 ${W + 4} ${L + 4}`} className="w-full max-w-[280px] mx-auto rounded-lg bg-[#0e3b25]" role="img" aria-label={tr ? 'Şut haritası' : 'Shot map'}>
      <g fill="none" stroke="#ffffff55" strokeWidth={0.35}>
        <rect x={0} y={0} width={W} height={L} />
        <line x1={0} y1={L / 2} x2={W} y2={L / 2} />
        <circle cx={W / 2} cy={L / 2} r={9.15} />
        <rect x={(W - 40.3) / 2} y={0} width={40.3} height={16.5} />
        <rect x={(W - 18.3) / 2} y={0} width={18.3} height={5.5} />
        <rect x={(W - 40.3) / 2} y={L - 16.5} width={40.3} height={16.5} />
        <rect x={(W - 18.3) / 2} y={L - 5.5} width={18.3} height={5.5} />
      </g>
      {shots.map((s, i) => {
        const c = s.team === 'HOME' ? HOME_COLOR : AWAY_COLOR;
        const r = 1 + s.xg * 5.5;
        return (
          <g key={i}>
            {s.outcome === 'GOAL' ? (
              <>
                <circle cx={px(s.x)} cy={py(s.z)} r={r + 1.1} fill="none" stroke="#ffffff" strokeWidth={0.5} />
                <circle cx={px(s.x)} cy={py(s.z)} r={r} fill={c} />
              </>
            ) : s.outcome === 'WOODWORK' ? (
              <circle cx={px(s.x)} cy={py(s.z)} r={r} fill="none" stroke={c} strokeWidth={0.6} strokeDasharray="1.2 0.8" />
            ) : (
              <circle cx={px(s.x)} cy={py(s.z)} r={r} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={0.4} />
            )}
            <title>{`${s.minute}' ${s.name} · xG ${s.xg.toFixed(2)} · ${s.outcome}`}</title>
          </g>
        );
      })}
    </svg>
  );
};

const RatingRow: React.FC<{ p: PlayerRating; motm: boolean }> = ({ p, motm }) => (
  <div className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 text-xs">
    <span className={`min-w-[34px] text-center rounded px-1.5 py-0.5 font-mono-num font-bold ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</span>
    <span className="flex-1 truncate text-slate-200">{p.name}{motm ? ' ★' : ''}</span>
    <span className="text-slate-500 font-mono-num">{p.role}</span>
    {(p.goals > 0 || p.assists > 0) && (
      <span className="text-[#b7ff4a] font-mono-num">{p.goals > 0 ? `⚽${p.goals}` : ''}{p.assists > 0 ? ` 🅰${p.assists}` : ''}</span>
    )}
  </div>
);

export const MatchAnalysisCard: React.FC<Props> = ({ analysis, homeName, awayName, mySide, language }) => {
  const tr = language === 'tr';
  const [tab, setTab] = useState<'ratings' | 'shots'>('ratings');
  if (analysis.ratings.length === 0) return null;
  const order: Side[] = mySide === 'HOME' ? ['HOME', 'AWAY'] : ['AWAY', 'HOME'];
  const name = (s: Side) => (s === 'HOME' ? homeName : awayName);
  const xg = (s: Side) => analysis.shots.filter((x) => x.team === s).reduce((a, x) => a + x.xg, 0);
  const motm = analysis.motm;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d141b] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-white">{tr ? 'Maç Analizi' : 'Match Analysis'}</h3>
        <div className="flex gap-1.5">
          {(['ratings', 'shots'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${tab === k ? 'bg-[#00e5ff] text-[#080d11] font-bold' : 'bg-white/5 text-slate-300'}`}
            >
              {k === 'ratings' ? (tr ? 'Oyuncu Puanları' : 'Ratings') : tr ? 'Şut Haritası' : 'Shot Map'}
            </button>
          ))}
        </div>
      </div>

      {motm && (
        <div className="flex items-center gap-3 rounded-lg bg-[#b7ff4a]/10 border border-[#b7ff4a]/30 p-3">
          <div className="text-2xl">★</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#b7ff4a]">{tr ? 'Maçın Adamı' : 'Man of the Match'}</div>
            <div className="truncate font-semibold text-white">{motm.name}</div>
            <div className="text-[11px] text-slate-400">{name(motm.team)} · {motm.goals} {tr ? 'gol' : 'g'}, {motm.assists} {tr ? 'asist' : 'a'}</div>
          </div>
          <div className={`rounded px-2.5 py-1 font-mono-num text-lg font-bold ${ratingClass(motm.rating)}`}>{motm.rating.toFixed(1)}</div>
        </div>
      )}

      {tab === 'ratings' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.map((side) => (
            <div key={side}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: side === 'HOME' ? HOME_COLOR : AWAY_COLOR }}>
                {name(side)}
              </div>
              {analysis.ratings.filter((p) => p.team === side).map((p) => (
                <RatingRow key={p.id} p={p} motm={motm?.id === p.id} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <Pitch analysis={analysis} tr={tr} />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span><b style={{ color: HOME_COLOR }}>●</b> {homeName} xG {xg('HOME').toFixed(2)}</span>
            <span><b style={{ color: AWAY_COLOR }}>●</b> {awayName} xG {xg('AWAY').toFixed(2)}</span>
          </div>
          <div className="text-center text-[10px] text-slate-500">
            {tr ? 'Dolu + beyaz halka: gol · Yarı saydam: kurtarılan · Kesikli: direk · Büyüklük: xG' : 'Filled + ring: goal · Faded: saved · Dashed: woodwork · Size: xG'}
          </div>
        </div>
      )}
    </div>
  );
};
