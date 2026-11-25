import React, { useState } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Eye, Play, RefreshCw, ShieldAlert, UserMinus } from 'lucide-react';
import { FORMATION_TEMPLATES, TACTICAL_STYLE_PRESETS } from '../../engine/database';
import {
  calculateTacticalStrength,
  getPlayerDisplayName,
  getRoleCompatibility,
  partitionMatchdaySquad,
  swapPlayerZone,
} from '../../engine/hardcoreRules';
import {
  Club,
  FormationId,
  Language,
  LicenseMode,
  Mentality,
  PlayerRole,
  PressingIntensity,
  TacticsConfig,
  TacticalStyleId,
  Tempo,
  ViewDimensionMode,
} from '../../engine/types';
import { Tactics3DPitchCanvas } from '../../three/Tactics3DPitchCanvas';
import { Tactics2DPitchCanvas } from '../tactics/Tactics2DPitchCanvas';

interface TacticsScreenProps {
  club: Club;
  tactics: TacticsConfig;
  licenseMode: LicenseMode;
  language: Language;
  defaultViewMode?: ViewDimensionMode;
  hasNextMatch: boolean;
  onChangeTactics: (next: TacticsConfig) => void;
  onAutoPick: () => void;
  onLaunchMatch: () => void;
}

export const TacticsScreen: React.FC<TacticsScreenProps> = ({
  club,
  tactics,
  licenseMode,
  language,
  defaultViewMode = '3D',
  hasNextMatch,
  onChangeTactics,
  onAutoPick,
  onLaunchMatch,
}) => {
  const tr = language === 'tr';
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
  const [topDownView, setTopDownView] = useState(false);
  const [viewMode, setViewMode] = useState<ViewDimensionMode>(defaultViewMode);

  const strength = calculateTacticalStrength(club, tactics);
  const activeSlot = selectedSlot !== null ? tactics.slots[selectedSlot] : null;
  const activePlayer = activeSlot ? club.players.find((p) => p.id === activeSlot.playerId) : null;
  const { bench, reserves, injured } = partitionMatchdaySquad(club, tactics);
  const benchIdSet = new Set(bench.map((b) => b.id));

  const handleFormationChange = (formation: FormationId) => {
    if (formation === 'CUSTOM') {
      onChangeTactics({ ...tactics, formation: 'CUSTOM' });
      return;
    }
    const template = FORMATION_TEMPLATES[formation];
    const nextSlots = tactics.slots.map((s, idx) => ({
      ...s,
      role: template[idx].role,
      x: template[idx].x,
      z: template[idx].z,
    }));
    onChangeTactics({ ...tactics, formation, slots: nextSlots });
  };

  const handleStylePresetChange = (styleId: TacticalStyleId) => {
    const preset = TACTICAL_STYLE_PRESETS.find((p) => p.id === styleId);
    if (!preset) return;
    if (styleId === 'CUSTOM') {
      onChangeTactics({ ...tactics, tacticalStyle: 'CUSTOM' });
      return;
    }
    onChangeTactics({
      ...tactics,
      tacticalStyle: styleId,
      mentality: preset.mentality,
      pressing: preset.pressing,
      tempo: preset.tempo,
      defensiveLine: preset.defensiveLine,
    });
  };

  const handleMoveSlot = (slotIdx: number, x: number, z: number, inferredRole: PlayerRole) => {
    const nextSlots = tactics.slots.map((s, idx) =>
      idx === slotIdx ? { ...s, x, z, role: idx === 0 ? 'GK' : inferredRole } : s
    );
    onChangeTactics({ ...tactics, formation: 'CUSTOM', slots: nextSlots });
  };

  const handleCustomRoleChange = (slotIdx: number, role: PlayerRole) => {
    if (slotIdx === 0) return;
    const nextSlots = tactics.slots.map((s, idx) => (idx === slotIdx ? { ...s, role } : s));
    onChangeTactics({ ...tactics, formation: 'CUSTOM', slots: nextSlots });
  };

  const handleAssignPlayer = (targetPlayerId: string) => {
    if (selectedSlot === null) return;
    const existingIdx = tactics.slots.findIndex((s) => s.playerId === targetPlayerId);
    const prevPlayerId = tactics.slots[selectedSlot].playerId;

    const nextSlots = tactics.slots.map((s, idx) => {
      if (idx === selectedSlot) return { ...s, playerId: targetPlayerId };
      if (existingIdx !== -1 && idx === existingIdx) return { ...s, playerId: prevPlayerId };
      return s;
    });

    let nextBench = (tactics.benchPlayerIds ?? []).filter((id) => id !== targetPlayerId);
    if (existingIdx === -1 && prevPlayerId && !nextBench.includes(prevPlayerId)) {
      nextBench = [prevPlayerId, ...nextBench].slice(0, 9);
    }

    onChangeTactics({ ...tactics, slots: nextSlots, benchPlayerIds: nextBench });
  };

  const handleZoneMove = (playerId: string, targetZone: 'STARTER' | 'BENCH' | 'RESERVES') => {
    const next = swapPlayerZone(tactics, club, playerId, targetZone, selectedSlot ?? undefined);
    onChangeTactics(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* 3D Drag-and-Drop Tactical Pitch */}
        <div className="xl:col-span-8 flex flex-col rounded-xl bg-[#111b21] border border-white/10 overflow-hidden min-h-[540px]">
          <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                {tr ? '3D Sürükle-Bırak Taktik Sahası' : '3D Drag-and-Drop Tactics Pitch'}
              </h2>
              <p className="text-xs text-slate-400">
                {tr
                  ? '3D sahadaki oyuncuları tutup sürükleyerek mevkilerini değiştirin; alttan İlk 11, Yedek Kulübesi (9) ve Kadro Dışı planlayın.'
                  : 'Drag players on the 3D pitch and manage Starters, 9-man Bench, and Reserves below.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-[#080d11] border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('3D')}
                  className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                    viewMode === '3D' ? 'bg-[#b7ff4a] text-[#080d11]' : 'text-slate-300'
                  }`}
                >
                  {tr ? '3D Saha' : '3D Pitch'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2D')}
                  className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                    viewMode === '2D' ? 'bg-[#00e5ff] text-[#080d11]' : 'text-slate-300'
                  }`}
                >
                  {tr ? '2D Tahta' : '2D Board'}
                </button>
              </div>
              {viewMode === '3D' && (
                <button
                  type="button"
                  onClick={() => setTopDownView((v) => !v)}
                  className="px-3 py-1.5 rounded-lg bg-[#080d11] border border-white/10 text-xs text-slate-200 hover:border-[#00e5ff] flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>{topDownView ? (tr ? '3D Açı' : '3D Angle') : tr ? 'Kuşbakışı' : 'Top-Down'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onAutoPick}
                className="px-3 py-1.5 rounded-lg bg-[#080d11] border border-white/10 text-xs text-slate-200 hover:border-[#b7ff4a] flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#b7ff4a]" />
                <span>{tr ? 'En İyi 11 & Yedek' : 'Auto Pick'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 relative min-h-[460px]">
            {viewMode === '3D' ? (
              <Tactics3DPitchCanvas
                club={club}
                slots={tactics.slots}
                selectedSlotIndex={selectedSlot}
                defensiveLine={tactics.defensiveLine}
                licenseMode={licenseMode}
                topDownView={topDownView}
                onSelectSlot={setSelectedSlot}
                onMoveSlot={handleMoveSlot}
              />
            ) : (
              <Tactics2DPitchCanvas
                club={club}
                slots={tactics.slots}
                selectedSlotIndex={selectedSlot}
                defensiveLine={tactics.defensiveLine}
                licenseMode={licenseMode}
                onSelectSlot={setSelectedSlot}
                onMoveSlot={handleMoveSlot}
              />
            )}
          </div>
        </div>

        {/* Right Tactical Panel */}
        <div className="xl:col-span-4 rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg bg-[#080d11] border border-white/5">
              <div>
                <div className="text-[11px] text-slate-400">{tr ? 'Hücum' : 'ATK'}</div>
                <div className="font-mono-num font-bold text-lg text-white">{strength.attack}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">{tr ? 'Orta' : 'MID'}</div>
                <div className="font-mono-num font-bold text-lg text-[#00e5ff]">{strength.midfield}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">{tr ? 'Savunma' : 'DEF'}</div>
                <div className="font-mono-num font-bold text-lg text-[#b7ff4a]">{strength.defense}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">{tr ? 'Hazır Taktik Sistemi' : 'Tactical Style Preset'}</label>
                <span className="text-[10px] font-mono-num text-[#00e5ff]">
                  {TACTICAL_STYLE_PRESETS.find((p) => p.id === (tactics.tacticalStyle ?? 'CONTROL_POSSESSION'))?.[
                    tr ? 'labelTr' : 'labelEn'
                  ]}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-1.5">
                {TACTICAL_STYLE_PRESETS.map((preset) => {
                  const active = (tactics.tacticalStyle ?? 'CONTROL_POSSESSION') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={tr ? preset.summaryTr : preset.summaryEn}
                      onClick={() => handleStylePresetChange(preset.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left cursor-pointer transition-colors truncate ${
                        active
                          ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                          : 'bg-[#080d11] text-slate-300 border border-white/10 hover:text-white'
                      }`}
                    >
                      {tr ? preset.labelTr : preset.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {tr ? 'Diziliş (13 Diziliş + Özel)' : 'Formation (13 Presets + Custom)'}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-4 gap-1.5">
                {(Object.keys(FORMATION_TEMPLATES) as FormationId[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleFormationChange(f)}
                    className={`py-1.5 px-1 rounded-lg font-mono-num text-[11px] font-bold cursor-pointer transition-colors truncate ${
                      tactics.formation === f
                        ? 'bg-[#b7ff4a] text-[#080d11]'
                        : 'bg-[#080d11] text-slate-300 border border-white/10 hover:text-white'
                    }`}
                  >
                    {f === 'CUSTOM' ? (tr ? 'Özel' : 'Custom') : f === '4-4-2-DIAMOND' ? '4-4-2 ♦' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{tr ? 'Mentalite' : 'Mentality'}</label>
                <select
                  value={tactics.mentality}
                  onChange={(e) =>
                    onChangeTactics({ ...tactics, tacticalStyle: 'CUSTOM', mentality: e.target.value as Mentality })
                  }
                  className="w-full rounded-lg bg-[#080d11] border border-white/10 px-2.5 py-2 text-xs text-white"
                >
                  <option value="DEFENSIVE">{tr ? 'Katı Savunma' : 'Defensive'}</option>
                  <option value="BALANCED">{tr ? 'Dengeli' : 'Balanced'}</option>
                  <option value="ATTACKING">{tr ? 'Hücum' : 'Attacking'}</option>
                  <option value="ALL_OUT">{tr ? 'Tam Hücum (Riskli)' : 'All-Out Attack'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{tr ? 'Pres Şiddeti' : 'Pressing'}</label>
                <select
                  value={tactics.pressing}
                  onChange={(e) =>
                    onChangeTactics({
                      ...tactics,
                      tacticalStyle: 'CUSTOM',
                      pressing: e.target.value as PressingIntensity,
                    })
                  }
                  className="w-full rounded-lg bg-[#080d11] border border-white/10 px-2.5 py-2 text-xs text-white"
                >
                  <option value="LOW">{tr ? 'Düşük Blok' : 'Low Block'}</option>
                  <option value="MEDIUM">{tr ? 'Orta Baskı' : 'Medium'}</option>
                  <option value="HIGH">{tr ? 'Yüksek Baskı' : 'High Press'}</option>
                  <option value="GEGENPRESS">{tr ? 'Gegenpress (Yüksek Sakatlık)' : 'Gegenpress'}</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{tr ? 'Savunma Hattı Yüksekliği' : 'Defensive Line'}</span>
                <span className="font-mono-num text-[#00e5ff]">{tactics.defensiveLine}m</span>
              </div>
              <input
                type="range"
                min={25}
                max={85}
                value={tactics.defensiveLine}
                onChange={(e) =>
                  onChangeTactics({ ...tactics, tacticalStyle: 'CUSTOM', defensiveLine: Number(e.target.value) })
                }
                className="w-full accent-[#b7ff4a]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">{tr ? 'Oyun Temposu' : 'Tempo'}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['SLOW', 'NORMAL', 'FAST'] as Tempo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeTactics({ ...tactics, tacticalStyle: 'CUSTOM', tempo: t })}
                    className={`py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      tactics.tempo === t
                        ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                        : 'bg-[#080d11] text-slate-300 border border-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Slot Player Swapper (+ Custom Role editor) */}
            {activeSlot && (
              <div className="p-3.5 rounded-lg bg-[#080d11] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#b7ff4a] font-bold">
                    {tr ? 'Seçili Mevki:' : 'Selected Slot:'} {activeSlot.role}
                  </span>
                  {activePlayer && (
                    <span className="font-mono-num text-slate-300">
                      {tr ? 'Uyum:' : 'Fit:'}{' '}
                      {Math.round(getRoleCompatibility(activePlayer.naturalRole, activeSlot.role) * 100)}%
                    </span>
                  )}
                </div>
                {tactics.formation === 'CUSTOM' && activeSlot.slotIndex > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-400">{tr ? 'Özel Mevki Rolü:' : 'Custom Role:'}</span>
                    <select
                      aria-label={tr ? 'Özel Mevki Rolü' : 'Custom Role'}
                      value={activeSlot.role}
                      onChange={(e) => handleCustomRoleChange(activeSlot.slotIndex, e.target.value as PlayerRole)}
                      className="rounded bg-[#111b21] border border-white/10 px-2 py-1 text-xs font-mono-num text-[#00e5ff]"
                    >
                      {(['LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as PlayerRole[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <select
                  aria-label="Oyuncu Değiştir"
                  value={activeSlot.playerId ?? ''}
                  onChange={(e) => handleAssignPlayer(e.target.value)}
                  className="w-full rounded-lg bg-[#111b21] border border-white/10 px-2.5 py-2 text-xs text-white"
                >
                  {club.players
                    .filter((p) => p.injuredWeeks === 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.naturalRole} · {getPlayerDisplayName(p, licenseMode)} (OVR {p.ovr} · {p.condition}%)
                        {benchIdSet.has(p.id) ? ' [YEDEK]' : !tactics.slots.some((s) => s.playerId === p.id) ? ' [KADRO DIŞI]' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {strength.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                {strength.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasNextMatch && (
            <button
              type="button"
              onClick={onLaunchMatch}
              className="w-full py-3 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{tr ? '3D Maçı Başlat' : 'Start 3D Match'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Matchday Squad Management: İlk 11, Yedek Kulübesi (9) & Kadro Dışı / Revir */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              {tr ? 'Maç Günü Kadro Planlaması: İlk 11 · Yedek Kulübesi · Kadro Dışı' : 'Matchday Squad Zoning'}
            </h3>
            <p className="text-xs text-slate-400">
              {tr
                ? 'Yedek kulübesine en fazla 9 oyuncu yazabilirsiniz. Kadro dışı bırakılan oyuncular maç günü değişikliğinde kullanılamaz.'
                : 'Select up to 9 matchday substitutes. Reserves outside the bench are unavailable during live matches.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-num">
            <span className="text-[#b7ff4a]">11 {tr ? 'İlk 11' : 'XI'}</span>
            <span className="text-[#00e5ff]">{bench.length}/9 {tr ? 'Yedek' : 'Bench'}</span>
            <span className="text-slate-400">{reserves.length} {tr ? 'Kadro Dışı' : 'Reserves'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: İlk 11 */}
          <div className="rounded-lg bg-[#080d11] border border-white/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#b7ff4a] pb-1.5 border-b border-white/10">
              <span>{tr ? 'SAHA İÇİ İLK 11 (11)' : 'STARTING XI (11)'}</span>
              <span className="font-mono-num text-[11px] text-slate-400">{strength.overall} OVR</span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {tactics.slots.map((slot) => {
                const p = club.players.find((pl) => pl.id === slot.playerId);
                if (!p) return null;
                const compat = Math.round(getRoleCompatibility(p.naturalRole, slot.role) * 100);
                const isSelected = selectedSlot === slot.slotIndex;
                return (
                  <div
                    key={slot.slotIndex}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                      isSelected ? 'bg-[#0a1128] border-[#b7ff4a]' : 'bg-[#111b21] border-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(slot.slotIndex)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span className="font-mono-num font-bold text-[#00e5ff] w-8 shrink-0">{slot.role}</span>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          {getPlayerDisplayName(p, licenseMode)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-num">
                          OVR {p.ovr} · %{compat} uyum · %{p.condition}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleZoneMove(p.id, 'BENCH')}
                      title={tr ? 'Yedeğe Al' : 'Move to Bench'}
                      className="px-2 py-1 rounded bg-[#080d11] border border-white/10 hover:border-[#00e5ff] text-[10px] text-slate-300 hover:text-[#00e5ff] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowDownCircle className="w-3 h-3" />
                      <span>{tr ? 'Yedek' : 'Bench'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Yedek Kulübesi (Max 9) */}
          <div className="rounded-lg bg-[#080d11] border border-white/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#00e5ff] pb-1.5 border-b border-white/10">
              <span>{tr ? 'YEDEK KULÜBESİ' : 'MATCHDAY BENCH'}</span>
              <span className="font-mono-num text-[11px]">{bench.length} / 9</span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {bench.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  {tr ? 'Yedek kulübesi boş.' : 'Bench is empty.'}
                </div>
              ) : (
                bench.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-lg bg-[#111b21] border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-num font-bold text-slate-300 w-8 shrink-0">{p.naturalRole}</span>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          {getPlayerDisplayName(p, licenseMode)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-num">
                          OVR {p.ovr} · %{p.condition}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleZoneMove(p.id, 'STARTER')}
                        className="px-2 py-1 rounded bg-[#b7ff4a]/15 border border-[#b7ff4a]/40 hover:bg-[#b7ff4a] hover:text-[#080d11] text-[10px] font-bold text-[#b7ff4a] flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUpCircle className="w-3 h-3" />
                        <span>11</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleZoneMove(p.id, 'RESERVES')}
                        title={tr ? 'Kadro Dışı Bırak' : 'Drop to Reserves'}
                        className="px-2 py-1 rounded bg-[#080d11] border border-white/10 hover:border-red-400 text-[10px] text-slate-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>{tr ? 'Dışı' : 'Drop'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Kadro Dışı & Revir */}
          <div className="rounded-lg bg-[#080d11] border border-white/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1.5 border-b border-white/10">
              <span>{tr ? 'KADRO DIŞI & REVİR' : 'RESERVES & INJURED'}</span>
              <span className="font-mono-num text-[11px] text-slate-400">
                {reserves.length + injured.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {reserves.map((p) => (
                <div
                  key={p.id}
                  className="p-2 rounded-lg bg-[#111b21] border border-white/5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-num font-bold text-slate-400 w-8 shrink-0">{p.naturalRole}</span>
                    <div className="min-w-0">
                      <div className="text-slate-200 font-medium truncate">
                        {getPlayerDisplayName(p, licenseMode)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono-num">
                        OVR {p.ovr} · %{p.condition}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleZoneMove(p.id, 'BENCH')}
                      className="px-2 py-1 rounded bg-[#00e5ff]/15 border border-[#00e5ff]/40 hover:bg-[#00e5ff] hover:text-[#080d11] text-[10px] font-bold text-[#00e5ff] cursor-pointer"
                    >
                      {tr ? 'Yedeğe Al' : '+Bench'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleZoneMove(p.id, 'STARTER')}
                      className="px-2 py-1 rounded bg-[#080d11] border border-white/10 hover:border-[#b7ff4a] text-[10px] text-slate-300 hover:text-[#b7ff4a] cursor-pointer"
                    >
                      11
                    </button>
                  </div>
                </div>
              ))}

              {injured.map((p) => (
                <div
                  key={p.id}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-red-200 font-medium truncate">
                        {getPlayerDisplayName(p, licenseMode)}
                      </div>
                      <div className="text-[10px] text-red-300/80 truncate">
                        {p.injuryName ?? 'Sakat'} · {p.injuredWeeks} {tr ? 'hf' : 'wk'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {reserves.length === 0 && injured.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500">
                  {tr ? 'Kadro dışı veya sakat oyuncu yok.' : 'All players in matchday squad.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Duran Top Taktik Paneli & Kaptanlar */}
      <div className="rounded-xl bg-[#0b1322] border border-emerald-500/25 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              {tr ? 'Duran Top Taktikleri & Kaptanlar' : 'Set Pieces & Captains'}
            </h3>
            <p className="text-xs text-slate-400">
              {tr
                ? 'Takım kaptanlarını, duran top kullanan oyuncuları ve korner/frikik organizasyonlarını belirle.'
                : 'Assign club captains, set-piece takers, and attacking/defensive routines.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Kaptanlar */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {tr ? 'Takım Liderliği (Kaptanlar)' : 'Team Captains'}
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {tr ? '1. Kaptan (C)' : 'Club Captain (C)'}
              </label>
              <select
                value={tactics.captainId ?? club.players[0]?.id ?? ''}
                onChange={(e) => onChangeTactics({ ...tactics, captainId: e.target.value })}
                className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {club.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPlayerDisplayName(p, licenseMode)} ({p.naturalRole} · OVR {p.ovr} · Yaş {p.age})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {tr ? '2. Kaptan / Yardımcı Kaptan (VC)' : 'Vice Captain (VC)'}
              </label>
              <select
                value={tactics.viceCaptainId ?? club.players[1]?.id ?? ''}
                onChange={(e) => onChangeTactics({ ...tactics, viceCaptainId: e.target.value })}
                className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {club.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPlayerDisplayName(p, licenseMode)} ({p.naturalRole} · OVR {p.ovr} · Yaş {p.age})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duran Top Kullananlar */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              {tr ? 'Duran Top Görevlileri' : 'Set-Piece Takers'}
            </div>
            {(
              [
                ['penaltyTakerId', tr ? 'Penaltıcı' : 'Penalties'],
                ['freeKickTakerId', tr ? 'Serbest Vuruş (Frikik)' : 'Free Kicks'],
                ['cornerTakerLeftId', tr ? 'Sol Korner' : 'Left Corners'],
                ['cornerTakerRightId', tr ? 'Sağ Korner' : 'Right Corners'],
                ['throwInTakerId', tr ? 'Taç Atışı' : 'Throw-Ins'],
              ] as const
            ).map(([field, label]) => {
              const sp = tactics.setPieces ?? {
                penaltyTakerId: club.players[0]?.id ?? null,
                freeKickTakerId: club.players[1]?.id ?? null,
                cornerTakerLeftId: club.players[2]?.id ?? null,
                cornerTakerRightId: club.players[3]?.id ?? null,
                throwInTakerId: club.players[4]?.id ?? null,
                cornerRoutine: 'MIXED' as const,
                freeKickRoutine: 'DIRECT_SHOT' as const,
                defensiveSetPiece: 'HYBRID' as const,
              };
              return (
                <div key={field} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300 shrink-0">{label}</span>
                  <select
                    value={sp[field] ?? ''}
                    onChange={(e) =>
                      onChangeTactics({
                        ...tactics,
                        setPieces: { ...sp, [field]: e.target.value },
                      })
                    }
                    className="w-44 rounded-lg bg-[#080d11] border border-white/15 px-2 py-1.5 text-[11px] text-white"
                  >
                    {club.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {getPlayerDisplayName(p, licenseMode)} ({p.ovr})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Duran Top Organizasyonları */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              {tr ? 'Hücum & Savunma Organizasyonları' : 'Set-Piece Routines'}
            </div>
            {(() => {
              const sp = tactics.setPieces ?? {
                penaltyTakerId: club.players[0]?.id ?? null,
                freeKickTakerId: club.players[1]?.id ?? null,
                cornerTakerLeftId: club.players[2]?.id ?? null,
                cornerTakerRightId: club.players[3]?.id ?? null,
                throwInTakerId: club.players[4]?.id ?? null,
                cornerRoutine: 'MIXED' as const,
                freeKickRoutine: 'DIRECT_SHOT' as const,
                defensiveSetPiece: 'HYBRID' as const,
              };
              return (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {tr ? 'Korner Organizasyonu' : 'Corner Routine'}
                    </label>
                    <select
                      value={sp.cornerRoutine}
                      onChange={(e) =>
                        onChangeTactics({
                          ...tactics,
                          setPieces: { ...sp, cornerRoutine: e.target.value as typeof sp.cornerRoutine },
                        })
                      }
                      className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="NEAR_POST">{tr ? 'Ön Direk Koşusu' : 'Near Post'}</option>
                      <option value="FAR_POST">{tr ? 'Arka Direk Kafa Vuruşu' : 'Far Post'}</option>
                      <option value="SHORT_PASS">{tr ? 'Kısa Paslı Organizasyon' : 'Short Pass'}</option>
                      <option value="MIXED">{tr ? 'Karma (Esnek)' : 'Mixed'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {tr ? 'Frikik Organizasyonu' : 'Free Kick Routine'}
                    </label>
                    <select
                      value={sp.freeKickRoutine}
                      onChange={(e) =>
                        onChangeTactics({
                          ...tactics,
                          setPieces: { ...sp, freeKickRoutine: e.target.value as typeof sp.freeKickRoutine },
                        })
                      }
                      className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="DIRECT_SHOT">{tr ? 'Doğrudan Kaleye Şut' : 'Direct Shot'}</option>
                      <option value="CROSS_BOX">{tr ? 'Ceza Sahasına Orta' : 'Cross Into Box'}</option>
                      <option value="SHORT_LAYOFF">{tr ? 'Kısa Pas & Şut Açısı' : 'Short Layoff'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {tr ? 'Duran Top Savunması' : 'Defensive Set Pieces'}
                    </label>
                    <select
                      value={sp.defensiveSetPiece}
                      onChange={(e) =>
                        onChangeTactics({
                          ...tactics,
                          setPieces: { ...sp, defensiveSetPiece: e.target.value as typeof sp.defensiveSetPiece },
                        })
                      }
                      className="w-full rounded-lg bg-[#080d11] border border-white/15 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="ZONAL">{tr ? 'Alan Savunması' : 'Zonal Marking'}</option>
                      <option value="MAN_MARKING">{tr ? 'Adam Adama Markaj' : 'Man Marking'}</option>
                      <option value="HYBRID">{tr ? 'Hibrit (Alan + Adam)' : 'Hybrid'}</option>
                    </select>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

