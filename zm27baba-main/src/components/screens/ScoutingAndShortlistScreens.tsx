import React, { useMemo, useState } from 'react';
import {
  Binoculars,
  FileSearch,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { generateAllLeagueScoutPool, getLeagueLabel, LEAGUE_CATALOG } from '../../engine/database';
import { formatMoney, getClubDisplayName, getPlayerDisplayName } from '../../engine/hardcoreRules';
import {
  Club,
  Language,
  LeagueId,
  LicenseMode,
  Player,
  PlayerRole,
  ScoutReport,
} from '../../engine/types';
import { PlayerAvatarSvg } from '../BrandArt';

const ROLES: Array<'ALL' | PlayerRole> = ['ALL', 'GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

interface ScoutingScreenProps {
  clubs: Club[];
  myClubId: string | null;
  activeLeagueId: LeagueId;
  scoutReports: ScoutReport[];
  shortlistIds: string[];
  chiefScoutRating: number;
  licenseMode: LicenseMode;
  language: Language;
  onToggleShortlist: (playerId: string) => void;
  onScoutPlayer: (player: Player, clubName: string, leagueId: LeagueId) => void;
  onGoTransfersWithQuery: (query: string) => void;
}

export const ScoutingScreen: React.FC<ScoutingScreenProps> = ({
  clubs,
  myClubId,
  activeLeagueId,
  scoutReports,
  shortlistIds,
  chiefScoutRating,
  licenseMode,
  language,
  onToggleShortlist,
  onScoutPlayer,
  onGoTransfersWithQuery,
}) => {
  const tr = language === 'tr';
  const [tab, setTab] = useState<'SEARCH' | 'REPORTS'>('SEARCH');
  const [leagueFilter, setLeagueFilter] = useState<'ALL' | LeagueId>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [minOvr, setMinOvr] = useState(72);
  const [maxAge, setMaxAge] = useState(35);
  const [query, setQuery] = useState('');

  const globalPool = useMemo(() => {
    const raw = generateAllLeagueScoutPool(clubs, activeLeagueId);
    const activeClubMap = new Map(clubs.map((c) => [c.id, c]));
    return raw.map((item) => {
      const localClub = activeClubMap.get(item.clubId);
      const safeClubName =
        licenseMode === 'FULL_LICENSE'
          ? item.clubName
          : localClub
          ? getClubDisplayName(localClub, 'NO_DATA')
          : `${getLeagueLabel(item.leagueId)} Kulübü`;
      return {
        ...item,
        displayClubName: safeClubName,
      };
    });
  }, [clubs, activeLeagueId, licenseMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return globalPool
      .filter((item) => {
        if (item.clubId === myClubId) return false;
        if (leagueFilter !== 'ALL' && item.leagueId !== leagueFilter) return false;
        if (roleFilter !== 'ALL' && item.player.naturalRole !== roleFilter) return false;
        if (item.player.ovr < minOvr) return false;
        if (item.player.age > maxAge) return false;
        if (q) {
          const pName = getPlayerDisplayName(item.player, licenseMode).toLowerCase();
          const cName = item.displayClubName.toLowerCase();
          const nat = item.player.nationality.toLowerCase();
          if (!pName.includes(q) && !cName.includes(q) && !nat.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.player.ovr - a.player.ovr || b.player.potential - a.player.potential)
      .slice(0, 80);
  }, [globalPool, myClubId, leagueFilter, roleFilter, minOvr, maxAge, query, licenseMode]);

  const scoutedIdSet = useMemo(() => new Set(scoutReports.map((r) => r.playerId)), [scoutReports]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Binoculars className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'Küresel Oyuncu Arama & Gözlemci Merkezi' : 'Global Player Search & Scouting'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `${LEAGUE_CATALOG.length} Lig veritabanından ${globalPool.length} oyuncu (Süper Lig, 1. Lig, 2. Lig, Premier League, Championship, La Liga, Serie A, Bundesliga) · Baş Gözlemci: ${chiefScoutRating}`
              : `${globalPool.length} players across ${LEAGUE_CATALOG.length} leagues · Chief Scout Rating: ${chiefScoutRating}`}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#111b21] border border-white/10">
          <button
            type="button"
            onClick={() => setTab('SEARCH')}
            className={`px-3.5 py-2 rounded-lg text-xs font-display font-bold cursor-pointer transition-colors ${
              tab === 'SEARCH' ? 'bg-[#b7ff4a] text-[#080d11]' : 'text-slate-300'
            }`}
          >
            {tr ? `Oyuncu Arama (${filtered.length})` : `Player Search (${filtered.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('REPORTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-display font-bold cursor-pointer transition-colors ${
              tab === 'REPORTS' ? 'bg-[#00e5ff] text-[#080d11]' : 'text-slate-300'
            }`}
          >
            {tr ? `Gözlemci Sonuçları (${scoutReports.length})` : `Scout Reports (${scoutReports.length})`}
          </button>
        </div>
      </div>

      {tab === 'SEARCH' ? (
        <>
          <div className="rounded-xl bg-[#111b21] border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="lg:col-span-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr ? 'Oyuncu, kulüp veya uyruk ara (örn: Arda, Madrid)...' : 'Search player, club, nationality...'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080d11] border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#b7ff4a]"
              />
            </div>

            <select
              aria-label="Lig Filtresi"
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value as 'ALL' | LeagueId)}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              <option value="ALL">{tr ? `Tüm Ligler (${LEAGUE_CATALOG.length} Lig)` : `All ${LEAGUE_CATALOG.length} Leagues`}</option>
              {LEAGUE_CATALOG.map((lm) => (
                <option key={lm.id} value={lm.id}>
                  {lm.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Mevki"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | PlayerRole)}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'ALL' ? (tr ? 'Mevki: Tümü' : 'Role: All') : r}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Min OVR"
                value={minOvr}
                onChange={(e) => setMinOvr(Number(e.target.value))}
                className="rounded-lg bg-[#080d11] border border-white/15 px-2.5 py-2 text-white"
              >
                <option value={65}>OVR 65+</option>
                <option value={72}>OVR 72+</option>
                <option value={78}>OVR 78+</option>
                <option value={83}>OVR 83+</option>
              </select>
              <select
                aria-label="Max Yaş"
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="rounded-lg bg-[#080d11] border border-white/15 px-2.5 py-2 text-white"
              >
                <option value={35}>{tr ? 'Yaş: Tümü' : 'Any Age'}</option>
                <option value={21}>U21</option>
                <option value={24}>U24</option>
                <option value={28}>U28</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
                  <th className="py-3 px-3">{tr ? 'Lig / Kulüp' : 'League / Club'}</th>
                  <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
                  <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Yaş' : 'Age'}</th>
                  <th className="py-3 px-3 text-right font-mono-num">OVR / POT</th>
                  <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Piyasa Değeri' : 'Value'}</th>
                  <th className="py-3 px-4 text-right">{tr ? 'Aksiyon' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(({ player, displayClubName, leagueId }) => {
                  const isShortlisted = shortlistIds.includes(player.id);
                  const alreadyScouted = scoutedIdSet.has(player.id);
                  return (
                    <tr key={player.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <PlayerAvatarSvg appearance={player.appearance} size={36} />
                          <div>
                            <div className="font-medium text-white">
                              {getPlayerDisplayName(player, licenseMode)}
                            </div>
                            <div className="text-[11px] text-slate-400">{player.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <div className="text-white font-medium">{displayClubName}</div>
                        <div className="text-[11px] text-[#00e5ff]">{getLeagueLabel(leagueId)}</div>
                      </td>
                      <td className="py-3 px-3 font-mono-num font-bold text-[#00e5ff]">{player.naturalRole}</td>
                      <td className="py-3 px-3 text-right font-mono-num text-slate-300">{player.age}</td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        <span className="font-bold text-[#b7ff4a]">{player.ovr}</span>
                        <span className="text-slate-500"> / {alreadyScouted ? player.potential : '??'}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-white">
                        {formatMoney(player.marketValue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onToggleShortlist(player.id);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                              isShortlisted
                                ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                                : 'bg-[#080d11] border-white/10 text-slate-300 hover:border-amber-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-current' : ''}`} />
                            <span>{isShortlisted ? (tr ? 'Takipte' : 'Tracked') : tr ? 'Takibe Al' : 'Follow'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playSuccess();
                              onScoutPlayer(player, displayClubName, leagueId);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              alreadyScouted
                                ? 'bg-[#080d11] border border-[#00e5ff]/40 text-[#00e5ff]'
                                : 'bg-[#17242c] hover:bg-[#00e5ff] hover:text-[#080d11] text-white'
                            }`}
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                            <span>{alreadyScouted ? (tr ? 'Rapor Hazır' : 'Scouted') : tr ? 'Rapor Hazırla' : 'Scout'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scoutReports.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-xl bg-[#111b21] border border-white/10 p-10 text-center space-y-3">
              <FileSearch className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-display font-bold text-base text-white">
                {tr ? 'Henüz Gözlemci Raporu Hazırlanmadı' : 'No Scout Reports Yet'}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {tr
                  ? 'Oyuncu Arama veya Transfer Merkezinde oyuncuların yanındaki "Rapor Hazırla" butonuna basarak potansiyel, artı/eksi analiz ve tahmini bonservis raporu oluşturabilirsiniz.'
                  : 'Click Scout on any player in Global Search or Transfers to generate an analytical scouting report.'}
              </p>
            </div>
          ) : (
            scoutReports.map((rep) => (
              <div key={rep.id} className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-mono-num text-[#00e5ff]">
                        {getLeagueLabel(rep.leagueId)} · {rep.clubName}
                      </div>
                      <h3 className="font-display font-bold text-lg text-white mt-0.5">{rep.playerName}</h3>
                      <div className="text-xs text-slate-400">
                        {rep.role} · {rep.age} {tr ? 'Yaş' : 'yrs'} · OVR <strong className="text-white">{rep.ovr}</strong> · POT{' '}
                        <strong className="text-[#b7ff4a]">{rep.potentialRange}</strong>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-lg font-display font-bold text-base flex items-center justify-center shrink-0 ${
                        rep.grade.startsWith('A')
                          ? 'bg-[#b7ff4a] text-[#080d11]'
                          : 'bg-[#080d11] border border-[#00e5ff]/40 text-[#00e5ff]'
                      }`}
                    >
                      {rep.grade}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#080d11] border border-white/5 space-y-1">
                      <div className="text-[#b7ff4a] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{tr ? 'Güçlü Yönler' : 'Pros'}</span>
                      </div>
                      {rep.pros.map((pro, i) => (
                        <div key={i} className="text-slate-200">
                          + {pro}
                        </div>
                      ))}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#080d11] border border-white/5 space-y-1">
                      <div className="text-amber-300 font-semibold">{tr ? 'Riskler / Zayıflıklar' : 'Cons'}</div>
                      {rep.cons.map((con, i) => (
                        <div key={i} className="text-slate-400">
                          - {con}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">{tr ? 'Tahmini Bonservis' : 'Est. Fee'}</div>
                    <div className="font-mono-num font-bold text-white">{formatMoney(rep.estimatedFee)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoTransfersWithQuery(rep.playerName)}
                    className="px-3 py-2 rounded-lg bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] text-white font-bold cursor-pointer transition-colors"
                  >
                    {tr ? 'Transferde Gör' : 'View in Transfers'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface ShortlistScreenProps {
  clubs: Club[];
  activeLeagueId: LeagueId;
  shortlistIds: string[];
  scoutReports: ScoutReport[];
  licenseMode: LicenseMode;
  language: Language;
  onToggleShortlist: (playerId: string) => void;
  onScoutPlayer: (player: Player, clubName: string, leagueId: LeagueId) => void;
  onGoScouting: () => void;
  onGoTransfers: () => void;
}

export const ShortlistScreen: React.FC<ShortlistScreenProps> = ({
  clubs,
  activeLeagueId,
  shortlistIds,
  scoutReports,
  licenseMode,
  language,
  onToggleShortlist,
  onScoutPlayer,
  onGoScouting,
  onGoTransfers,
}) => {
  const tr = language === 'tr';

  const entries = useMemo(() => {
    const pool = generateAllLeagueScoutPool(clubs, activeLeagueId);
    const activeClubMap = new Map(clubs.map((c) => [c.id, c]));
    const set = new Set(shortlistIds);
    return pool
      .filter((item) => set.has(item.player.id))
      .map((item) => {
        const localClub = activeClubMap.get(item.clubId);
        const safeClubName =
          licenseMode === 'FULL_LICENSE'
            ? item.clubName
            : localClub
            ? getClubDisplayName(localClub, 'NO_DATA')
            : `${getLeagueLabel(item.leagueId)} Kulübü`;
        const report = scoutReports.find((r) => r.playerId === item.player.id);
        return { ...item, displayClubName: safeClubName, report };
      });
  }, [clubs, activeLeagueId, shortlistIds, scoutReports, licenseMode]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-400 fill-current" />
            <span>{tr ? 'Transfer Takip Listesi' : 'Transfer Shortlist'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `${entries.length} takip edilen oyuncu — sözleşme, form ve gözlemci raporlarını tek ekranda izleyin.`
              : `${entries.length} tracked targets across all ${LEAGUE_CATALOG.length} leagues.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoScouting}
            className="px-4 py-2 rounded-lg bg-[#111b21] hover:bg-[#17242c] border border-white/15 text-xs font-bold text-[#00e5ff] cursor-pointer"
          >
            {tr ? 'Oyuncu Arama & Gözlemci →' : 'Global Search →'}
          </button>
          <button
            type="button"
            onClick={onGoTransfers}
            className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] text-xs font-display font-bold cursor-pointer"
          >
            {tr ? 'Transfer Masası →' : 'Transfers →'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-10 text-center space-y-3">
          <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-display font-bold text-lg text-white">
            {tr ? 'Takip Listeniz Henüz Boş' : 'Shortlist is Empty'}
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {tr
              ? 'Transfer Merkezinden veya Oyuncu Arama ekranından beğendiğiniz oyuncuların yanındaki ★ yıldız butonuna basarak takip listesine ekleyebilirsiniz.'
              : 'Star any player in Transfers or Scouting to track them here.'}
          </p>
          <button
            type="button"
            onClick={onGoScouting}
            className="px-5 py-2.5 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs cursor-pointer"
          >
            {tr ? `${LEAGUE_CATALOG.length} Lig Havuzunda Oyuncu Bul` : `Explore ${LEAGUE_CATALOG.length}-League Database`}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(({ player, displayClubName, leagueId, report }) => (
            <div key={player.id} className="rounded-xl bg-[#111b21] border border-white/10 p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatarSvg appearance={player.appearance} size={46} />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-base text-white truncate">
                      {getPlayerDisplayName(player, licenseMode)}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {displayClubName} · {getLeagueLabel(leagueId)}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num font-bold text-sm px-2 py-0.5 rounded bg-[#080d11] text-[#b7ff4a]">
                  {player.ovr}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#080d11] border border-white/5 text-center text-xs">
                <div>
                  <div className="text-slate-400">{tr ? 'Mevki' : 'Pos'}</div>
                  <div className="font-mono-num font-bold text-[#00e5ff]">{player.naturalRole}</div>
                </div>
                <div>
                  <div className="text-slate-400">{tr ? 'Yaş' : 'Age'}</div>
                  <div className="font-mono-num font-bold text-white">{player.age}</div>
                </div>
                <div>
                  <div className="text-slate-400">{tr ? 'Değer' : 'Value'}</div>
                  <div className="font-mono-num font-bold text-white">{formatMoney(player.marketValue)}</div>
                </div>
              </div>

              {report && (
                <div className="text-[11px] text-[#00e5ff] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {tr
                      ? `Gözlemci Notu: ${report.grade} · Potansiyel ${report.potentialRange}`
                      : `Scout Grade ${report.grade} · POT ${report.potentialRange}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {!report && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSuccess();
                      onScoutPlayer(player, displayClubName, leagueId);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#17242c] hover:bg-[#00e5ff] hover:text-[#080d11] text-xs font-bold text-white cursor-pointer transition-colors"
                  >
                    {tr ? 'Gözlemci Raporu Al' : 'Scout Player'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onToggleShortlist(player.id);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#080d11] border border-white/15 hover:border-red-400 text-xs text-slate-300 hover:text-red-300 cursor-pointer transition-colors"
                >
                  {tr ? 'Listeden Çıkar' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
