import React, { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { formatMoney, getPlayerDisplayName } from '../../engine/hardcoreRules';
import { Club, Language, LicenseMode, Player, PositionGroup } from '../../engine/types';
import { PlayerAvatarSvg } from '../BrandArt';

interface SquadScreenProps {
  club: Club;
  licenseMode: LicenseMode;
  language: Language;
  recoveryUsedThisWeek: boolean;
  onUpdateTraining: (playerId: string, focus: Player['trainingFocus']) => void;
  onTeamRecoverySession: () => void;
}

export const SquadScreen: React.FC<SquadScreenProps> = ({
  club,
  licenseMode,
  language,
  recoveryUsedThisWeek,
  onUpdateTraining,
  onTeamRecoverySession,
}) => {
  const tr = language === 'tr';
  const [filter, setFilter] = useState<'ALL' | PositionGroup>('ALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const filtered = club.players.filter((p) => filter === 'ALL' || p.positionGroup === filter);
  const selectedPlayer = club.players.find((p) => p.id === selectedPlayerId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">
            {tr ? 'Kadro & Oyuncu Detayları' : 'Squad & Player Profiles'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? 'Her oyuncunun kendine özgü tipi, morali ve antrenman odağı vardır.'
              : 'Every player has distinct appearance, morale, and training focus.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={recoveryUsedThisWeek}
            onClick={() => {
              soundEngine.playSuccess();
              onTeamRecoverySession();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#111b21] hover:bg-[#b7ff4a] hover:text-[#080d11] disabled:opacity-45 border border-[#b7ff4a]/40 text-xs font-display font-bold text-[#b7ff4a] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              {recoveryUsedThisWeek
                ? tr
                  ? 'Bu Hafta Yenilenme Yapıldı'
                  : 'Recovery Completed'
                : tr
                ? 'Haftalık Kondisyon & Moral Kampı (+6)'
                : 'Team Recovery Session (+6)'}
            </span>
          </button>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#111b21] border border-white/10">
            {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setFilter(pos)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filter === pos ? 'bg-[#b7ff4a] text-[#080d11] font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {pos === 'ALL' ? (tr ? 'Tümü' : 'All') : pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
              <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
              <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Yaş' : 'Age'}</th>
              <th className="py-3 px-3 text-right font-mono-num">OVR / POT</th>
              <th className="py-3 px-4">{tr ? 'Kondisyon / Moral' : 'Cond / Morale'}</th>
              <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Değer' : 'Value'}</th>
              <th className="py-3 px-4 text-right font-mono-num">{tr ? 'Maaş' : 'Wage'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className="hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono-num text-slate-400">{p.shirtNumber}</td>
                <td className="py-3 px-3 font-mono-num font-bold text-[#00e5ff]">{p.naturalRole}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <PlayerAvatarSvg
                      appearance={p.appearance}
                      shirtColor={club.primaryColor}
                      accentColor={club.accentColor}
                      size={36}
                    />
                    <div>
                      <div className="font-medium text-white flex items-center gap-2">
                        <span>{getPlayerDisplayName(p, licenseMode)}</span>
                        {p.isOnLoan && (
                          <span className="text-[10px] font-bold text-[#00e5ff]">[KİRALIK]</span>
                        )}
                      </div>
                      {p.injuredWeeks > 0 ? (
                        <div className="text-xs text-red-400">
                          {p.injuryName} ({p.injuredWeeks} {tr ? 'hafta' : 'wks'})
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          {p.nationality} · {p.goals}G {p.assists}A
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono-num text-slate-300">{p.age}</td>
                <td className="py-3 px-3 text-right font-mono-num">
                  <span className="font-bold text-[#b7ff4a]">{p.ovr}</span>
                  <span className="text-slate-500"> / {p.potential}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded bg-[#080d11] overflow-hidden">
                      <div
                        className={`h-full ${
                          p.condition < 60
                            ? 'bg-red-500'
                            : p.condition < 78
                            ? 'bg-amber-400'
                            : 'bg-[#b7ff4a]'
                        }`}
                        style={{ width: `${p.condition}%` }}
                      />
                    </div>
                    <span className="font-mono-num text-xs text-slate-300">{p.condition}%</span>
                    <span className="font-mono-num text-[11px] text-[#00e5ff]">M:{p.morale}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono-num text-slate-200">{formatMoney(p.marketValue)}</td>
                <td className="py-3 px-4 text-right font-mono-num text-slate-400">{formatMoney(p.weeklyWage)}/hf</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#111b21] border border-white/15 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <PlayerAvatarSvg
                  appearance={selectedPlayer.appearance}
                  shirtColor={club.primaryColor}
                  accentColor={club.accentColor}
                  size={68}
                />
                <div>
                  <div className="text-xs font-mono-num text-[#00e5ff]">
                    #{selectedPlayer.shirtNumber} · {selectedPlayer.naturalRole} · {selectedPlayer.nationality}
                  </div>
                  <h3 className="font-display font-bold text-2xl text-white mt-0.5">
                    {getPlayerDisplayName(selectedPlayer, licenseMode)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr ? 'Yaş' : 'Age'} {selectedPlayer.age} · OVR {selectedPlayer.ovr} / POT {selectedPlayer.potential} ·{' '}
                    {tr ? 'Moral' : 'Morale'} {selectedPlayer.morale}% · {tr ? 'Gelişim' : 'Growth'}:{' '}
                    {Math.round(selectedPlayer.growthProgress * 100)}%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                aria-label="Kapat"
                className="p-2 rounded-lg bg-[#080d11] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {(
                [
                  ['Hız', 'Pace', selectedPlayer.attributes.pace],
                  ['Şut', 'Shot', selectedPlayer.attributes.shooting],
                  ['Pas', 'Pass', selectedPlayer.attributes.passing],
                  ['Dribling', 'Drib', selectedPlayer.attributes.dribbling],
                  ['Defans', 'Def', selectedPlayer.attributes.defending],
                  ['Fizik', 'Phys', selectedPlayer.attributes.physical],
                  ['Dayanıklılık', 'Stam', selectedPlayer.attributes.stamina],
                  ['Kalecilik', 'GK', selectedPlayer.attributes.goalkeeping],
                ] as const
              ).map(([trLabel, enLabel, val]) => (
                <div key={enLabel} className="p-2.5 rounded-lg bg-[#080d11] border border-white/5">
                  <div className="text-slate-400">{tr ? trLabel : enLabel}</div>
                  <div className="font-mono-num text-lg font-bold text-white mt-0.5">{val}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400 mb-2">
                {tr ? 'Antrenman Odağı (Hardcore Yavaş Gelişim)' : 'Training Focus (Hardcore Slow Growth)'}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['BALANCED', 'PHYSICAL', 'ATTACK', 'DEFENSE', 'RECOVERY'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onUpdateTraining(selectedPlayer.id, f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      selectedPlayer.trainingFocus === f
                        ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                        : 'bg-[#080d11] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
