import React from 'react';
import { ArrowLeft, Briefcase, Check, Trophy } from 'lucide-react';
import { getLeagueMeta, LEAGUE_CATALOG } from '../../engine/database';
import { formatMoney, getClubDisplayName, getStadiumDisplayName } from '../../engine/hardcoreRules';
import { Club, Language, LeagueId, LicenseMode, ManagerProfile } from '../../engine/types';
import { ClubCrest, ClubKitSvg } from '../BrandArt';

interface ClubSelectScreenProps {
  clubs: Club[];
  leagueId: LeagueId;
  activeLeagues: LeagueId[];
  activeClubId: string | null;
  manager?: ManagerProfile;
  licenseMode: LicenseMode;
  language: Language;
  onSwitchLeague: (leagueId: LeagueId) => void;
  onSelectClub: (clubId: string) => void;
  onStartUnemployed?: () => void;
  onBack: () => void;
}

export const ClubSelectScreen: React.FC<ClubSelectScreenProps> = ({
  clubs,
  leagueId,
  activeLeagues,
  activeClubId,
  manager,
  licenseMode,
  language,
  onSwitchLeague,
  onSelectClub,
  onStartUnemployed,
  onBack,
}) => {
  const tr = language === 'tr';
  const meta = getLeagueMeta(leagueId);

  return (
    <div className="min-h-full bg-[#080d11] text-slate-100 p-4 sm:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tr ? 'Ana Menüye Dön' : 'Back to Main Menu'}</span>
            </button>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              {meta.name} {tr ? 'Kulüp Seçimi' : 'Club Selection'} ({meta.teams}T · {meta.weeks}H)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {tr
                ? `${meta.countryTr} · ${meta.fixturesCount} maçlık fikstür · Aktif çoklu lig sayısı: ${activeLeagues.length}/${LEAGUE_CATALOG.length}`
                : `${meta.countryEn} · ${meta.fixturesCount} fixtures · Active multi-leagues: ${activeLeagues.length}/${LEAGUE_CATALOG.length}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onStartUnemployed && (
              <button
                type="button"
                onClick={onStartUnemployed}
                className="px-4 py-2.5 rounded-lg bg-[#111b21] hover:bg-[#17242c] border border-[#00e5ff]/50 text-xs font-display font-bold text-[#00e5ff] flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
                <span>{tr ? 'Kulüpsüz (İşsiz) Başla' : 'Start Unemployed'}</span>
              </button>
            )}
            <div className="text-xs text-slate-400">
              {licenseMode === 'FULL_LICENSE'
                ? tr
                  ? 'Mod: Full Lisans'
                  : 'Mode: Full License'
                : tr
                ? 'Mod: No Data'
                : 'Mode: No Data'}
            </div>
          </div>
        </div>

        {!activeClubId && (
          <div className="mb-5 rounded-xl bg-[#111b21] border border-[#00e5ff]/35 px-4 py-3 text-xs text-slate-200 flex items-center justify-between gap-3">
            <span>
              {tr
                ? `Henüz bir kulüp seçilmedi — aşağıdaki ${LEAGUE_CATALOG.length} ligden bir kulübü devralabilir veya kulüpsüz başlayabilirsiniz.`
                : `No club selected yet — pick any club across ${LEAGUE_CATALOG.length} leagues below or start unemployed.`}
            </span>
          </div>
        )}

        {/* 9-League Playable Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-7">
          {LEAGUE_CATALOG.map((item) => {
            const isSelected = leagueId === item.id;
            const isSimActive = activeLeagues.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSwitchLeague(item.id)}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#0a1128] border-[#b7ff4a]'
                    : 'bg-[#111b21] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <Trophy
                      className="w-4 h-4 shrink-0"
                      style={{ color: isSelected ? item.accentColor : '#64748b' }}
                    />
                    {isSimActive && !isSelected && (
                      <span className="text-[9px] font-mono-num text-[#00e5ff] font-bold">
                        {tr ? 'ÇOKLU LİG' : 'ACTIVE'}
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-sm text-white mt-2 truncate">
                    {item.shortName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {tr ? item.countryTr : item.countryEn}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] font-mono-num">
                  <span className="text-slate-300">
                    {item.teams}T · {item.weeks}H
                  </span>
                  <span className={isSelected ? 'text-[#b7ff4a] font-bold' : 'text-slate-500'}>
                    {isSelected ? (tr ? 'AKTİF' : 'ON') : tr ? 'SEÇ' : 'GO'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clubs.map((club) => {
            const avgOvr = Math.round(
              club.players.slice(0, 11).reduce((s, p) => s + p.ovr, 0) / Math.min(11, club.players.length)
            );
            const isActive = club.id === activeClubId;
            const repWarning = manager && club.reputation - manager.reputation > 24;

            return (
              <div
                key={club.id}
                className={`rounded-xl bg-[#111b21] border p-5 flex flex-col justify-between transition-colors ${
                  isActive ? 'border-[#b7ff4a]' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ClubCrest club={club} licenseMode={licenseMode} size={52} />
                      <div className="min-w-0">
                        <h2 className="font-display font-bold text-lg text-white truncate">
                          {getClubDisplayName(club, licenseMode)}
                        </h2>
                        <p className="text-xs text-slate-400 truncate">
                          {club.city} · {getStadiumDisplayName(club, licenseMode)}
                        </p>
                      </div>
                    </div>
                    <ClubKitSvg club={club} size={46} />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-slate-400">{tr ? 'Kadro Ort.' : 'Squad OVR'}</div>
                      <div className="font-mono-num text-base font-bold text-[#b7ff4a] mt-0.5">{avgOvr}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">{tr ? 'Bütçe' : 'Budget'}</div>
                      <div className="font-mono-num text-sm font-semibold text-white mt-0.5">
                        {formatMoney(club.transferBudget)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{tr ? 'Maaş Tavanı' : 'Wage Cap'}</div>
                      <div className="font-mono-num text-sm font-semibold text-slate-200 mt-0.5">
                        {formatMoney(club.wageBudgetWeekly)}/hf
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-300">
                    <span className="text-slate-400">{tr ? 'Hedef: ' : 'Goal: '}</span>
                    {club.boardExpectation}
                  </p>
                  {repWarning && (
                    <p className="mt-1.5 text-[11px] text-amber-300">
                      {tr
                        ? `Zorlu Yönetim: Kulüp prestiji (${club.reputation}) yüksek — baskı ağır olacak.`
                        : `High Pressure: Club reputation (${club.reputation}) demands immediate results.`}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectClub(club.id)}
                  className={`mt-5 w-full py-2.5 px-4 rounded-lg font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#b7ff4a] text-[#080d11]'
                      : 'bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] text-white'
                  }`}
                >
                  {isActive && <Check className="w-4 h-4" />}
                  <span>
                    {isActive
                      ? tr
                        ? 'Seçili Kulüple Devam Et'
                        : 'Continue with Club'
                      : tr
                      ? 'Kulübü Devral'
                      : 'Take Over Club'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
