import React, { useMemo, useState } from 'react';
import { AlertCircle, Binoculars, Handshake, Search, SlidersHorizontal, Star, Tag, X } from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import {
  computeAgentFeeAmount,
  evaluateTransferOffer,
  filterTransferMarket,
  formatMoney,
  getClubDisplayName,
  getPlayerDisplayName,
  TransferFilterCriteria,
} from '../../engine/hardcoreRules';
import {
  Club,
  FinanceRecord,
  Language,
  LeagueId,
  LicenseMode,
  ManagerPersonality,
  MarketListing,
  Player,
  PlayerRole,
  TransferNegotiation,
} from '../../engine/types';
import { PlayerAvatarSvg } from '../BrandArt';

interface TransfersScreenProps {
  myClub: Club;
  clubs: Club[];
  leagueId: LeagueId;
  marketPool: MarketListing[];
  shortlistIds: string[];
  managerPersonality: ManagerPersonality;
  licenseMode: LicenseMode;
  language: Language;
  onToggleShortlist: (playerId: string) => void;
  onScoutPlayer: (player: Player, clubName: string, leagueId: LeagueId) => void;
  onCompleteSigning: (listing: MarketListing, fee: number, weeklyWage: number) => void;
  onSellSquadPlayer: (playerId: string, mode: 'SELL' | 'LOAN_OUT', fee: number) => void;
}

const ROLES: Array<'ALL' | PlayerRole> = ['ALL', 'GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

export const TransfersScreen: React.FC<TransfersScreenProps> = ({
  myClub,
  clubs,
  leagueId,
  marketPool,
  shortlistIds,
  managerPersonality,
  licenseMode,
  language,
  onToggleShortlist,
  onScoutPlayer,
  onCompleteSigning,
  onSellSquadPlayer,
}) => {
  const tr = language === 'tr';
  const [activeTab, setActiveTab] = useState<'ALL' | 'TRANSFER' | 'FREE_AGENT' | 'LOAN' | 'MY_SQUAD'>('ALL');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'ALL' | PlayerRole>('ALL');
  const [minOvr, setMinOvr] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [minPotential, setMinPotential] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sortBy, setSortBy] = useState<TransferFilterCriteria['sortBy']>('OVR_DESC');

  const [negotiation, setNegotiation] = useState<TransferNegotiation | null>(null);
  const [activeListing, setActiveListing] = useState<MarketListing | null>(null);
  const [offerInput, setOfferInput] = useState(0);
  const [wageInput, setWageInput] = useState(0);
  const [signingBonusInput, setSigningBonusInput] = useState(0);
  const [agentFeePctInput, setAgentFeePctInput] = useState(5);

  const currentWeeklyWages = myClub.players.reduce((s, p) => s + p.weeklyWage, 0);

  const filteredMarket = useMemo(() => {
    if (activeTab === 'MY_SQUAD') return [];
    return filterTransferMarket(
      marketPool,
      {
        listingType: activeTab,
        query,
        role,
        minOvr,
        maxAge,
        maxPrice,
        minPotential,
        sortBy,
      },
      clubs,
      licenseMode
    );
  }, [marketPool, activeTab, query, role, minOvr, maxAge, maxPrice, minPotential, sortBy, clubs, licenseMode]);

  const startNegotiation = (listing: MarketListing) => {
    const target = listing.player;
    const isFree = listing.listingType === 'FREE_AGENT';
    const isLoan = listing.listingType === 'LOAN';
    const baseFee = isFree ? 0 : isLoan ? listing.loanFee ?? 250_000 : target.marketValue;
    const initialAsk = isFree ? 0 : Math.round(baseFee * 1.36);
    const defaultBonus = isFree ? Math.round(Math.max(45_000, target.weeklyWage * 3.5)) : 0;
    const defaultAgentPct = isFree ? 10 : 5;

    setActiveListing(listing);
    setNegotiation({
      targetPlayer: target,
      sellingClubId: listing.clubId,
      listingType: listing.listingType,
      round: 1,
      maxRounds: 4,
      askingPrice: initialAsk,
      currentOffer: baseFee,
      offeredWage: Math.round(target.weeklyWage * (isLoan ? 0.8 : 1.15)),
      signingBonus: defaultBonus,
      agentFeePct: defaultAgentPct,
      agentFeeAmount: computeAgentFeeAmount(baseFee, Math.round(target.weeklyWage * (isLoan ? 0.8 : 1.15)), defaultBonus, defaultAgentPct),
      status: 'OPEN',
      clubMessage: isFree
        ? tr
          ? `Serbest oyuncu masası! Menajeri kulüp prestijini, haftalık maaşı, imza parasını ve % temsilci payını değerlendirecek.`
          : `Free agent talks! Agent evaluates club prestige, weekly wage, signing bonus, and % agent fee.`
        : isLoan
        ? tr
          ? `Kiralık görüşmesi: Kulüp sezonluk ${formatMoney(initialAsk)} kiralama ücreti ve menajer payı talep ediyor.`
          : `Loan talks: Club requests ${formatMoney(initialAsk)} loan fee.`
        : tr
        ? `Satıcı kulüp tok satıcı: ${formatMoney(initialAsk)} bonservis talep ediyor. İlk teklifte asla kabul etmeyecekler!`
        : `Stubborn club demands ${formatMoney(initialAsk)}. They never accept on round 1.`,
    });
    setOfferInput(baseFee);
    setWageInput(Math.round(target.weeklyWage * (isLoan ? 0.8 : 1.15)));
    setSigningBonusInput(defaultBonus);
    setAgentFeePctInput(defaultAgentPct);
  };

  const submitOffer = () => {
    if (!negotiation) return;
    const next = evaluateTransferOffer(
      negotiation,
      offerInput,
      wageInput,
      myClub.transferBudget,
      myClub.wageBudgetWeekly,
      currentWeeklyWages,
      managerPersonality,
      {
        targetClub: myClub,
        targetLeagueId: leagueId,
        signingBonus: signingBonusInput,
        agentFeePct: agentFeePctInput,
      }
    );
    setNegotiation(next);
    if (next.status === 'ACCEPTED') {
      soundEngine.playSuccess();
    } else if (next.status === 'REJECTED_WALKED' || next.status === 'COUNTERED') {
      soundEngine.playReject();
    }
  };

  const counts = useMemo(
    () => ({
      ALL: marketPool.length,
      TRANSFER: marketPool.filter((m) => m.listingType === 'TRANSFER').length,
      FREE_AGENT: marketPool.filter((m) => m.listingType === 'FREE_AGENT').length,
      LOAN: marketPool.filter((m) => m.listingType === 'LOAN').length,
    }),
    [marketPool]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">
            {tr ? 'Gelişmiş Transfer Merkezi' : 'Advanced Transfer Center'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `${marketPool.length} oyuncu havuzu · Bonservisli, Serbest (€0) ve Kiralık pazarlık masası.`
              : `${marketPool.length} scouting targets · Transfers, Free Agents, and Loans.`}
          </p>
        </div>
        <div className="flex items-center gap-6 text-right text-xs">
          <div>
            <div className="text-slate-400">{tr ? 'Kalan Maaş Boşluğu' : 'Wage Room'}</div>
            <div className="font-mono-num font-bold text-sm text-[#00e5ff]">
              {formatMoney(Math.max(0, myClub.wageBudgetWeekly - currentWeeklyWages))}/hf
            </div>
          </div>
          <div>
            <div className="text-slate-400">{tr ? 'Transfer Bütçesi' : 'Transfer Budget'}</div>
            <div className="font-mono-num font-bold text-lg text-[#b7ff4a]">
              {formatMoney(myClub.transferBudget)}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['ALL', tr ? `Tümü (${counts.ALL})` : `All (${counts.ALL})`],
            ['TRANSFER', tr ? `Bonservisli (${counts.TRANSFER})` : `Transfers (${counts.TRANSFER})`],
            ['FREE_AGENT', tr ? `Serbest €0 (${counts.FREE_AGENT})` : `Free Agents (${counts.FREE_AGENT})`],
            ['LOAN', tr ? `Kiralık (${counts.LOAN})` : `Loans (${counts.LOAN})`],
            ['MY_SQUAD', tr ? `Kadromdan Sat / Kirala (${myClub.players.length})` : `Sell / Loan Out (${myClub.players.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-display font-bold cursor-pointer transition-colors ${
              activeTab === id
                ? 'bg-[#b7ff4a] text-[#080d11]'
                : 'bg-[#111b21] text-slate-300 border border-white/10 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Advanced Multi-Criteria Search Panel */}
      {activeTab !== 'MY_SQUAD' && (
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00e5ff]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{tr ? 'Gelişmiş Oyuncu Arama & Scout Filtreleri' : 'Advanced Scouting Search'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="lg:col-span-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr ? 'Oyuncu, kulüp veya ülke ara...' : 'Search player, club, or nation...'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080d11] border border-white/15 text-white focus:outline-none focus:border-[#b7ff4a]"
              />
            </div>

            <select
              aria-label="Mevki Filtresi"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ALL' | PlayerRole)}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'ALL' ? (tr ? 'Mevki: Tümü' : 'Role: All') : r}
                </option>
              ))}
            </select>

            <select
              aria-label="Min OVR"
              value={minOvr}
              onChange={(e) => setMinOvr(Number(e.target.value))}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              <option value={0}>{tr ? 'Min OVR: Tümü' : 'Min OVR: Any'}</option>
              <option value={72}>OVR 72+</option>
              <option value={76}>OVR 76+</option>
              <option value={80}>OVR 80+</option>
              <option value={84}>OVR 84+</option>
            </select>

            <select
              aria-label="Max Yaş"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              <option value={40}>{tr ? 'Max Yaş: Tümü' : 'Max Age: Any'}</option>
              <option value={21}>{tr ? '21 Yaş Altı (Wonderkid)' : 'U21 Wonderkids'}</option>
              <option value={24}>{tr ? '24 Yaş ve Altı' : '24 and under'}</option>
              <option value={28}>{tr ? '28 Yaş ve Altı' : '28 and under'}</option>
            </select>

            <select
              aria-label="Sıralama"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TransferFilterCriteria['sortBy'])}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
            >
              <option value="OVR_DESC">{tr ? 'Sırala: En Yüksek OVR' : 'Sort: OVR High-Low'}</option>
              <option value="POT_DESC">{tr ? 'Sırala: En Yüksek Potansiyel' : 'Sort: Potential'}</option>
              <option value="VAL_ASC">{tr ? 'Sırala: En Ucuz Bedel' : 'Sort: Cheapest'}</option>
              <option value="AGE_ASC">{tr ? 'Sırala: En Genç' : 'Sort: Youngest'}</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span>{tr ? 'Min Potansiyel:' : 'Min POT:'}</span>
                <select
                  value={minPotential}
                  onChange={(e) => setMinPotential(Number(e.target.value))}
                  className="rounded bg-[#080d11] border border-white/10 px-2 py-1 text-white"
                >
                  <option value={0}>-</option>
                  <option value={78}>78+</option>
                  <option value={83}>83+</option>
                  <option value={87}>87+</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span>{tr ? 'Max Bedel:' : 'Max Fee:'}</span>
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="rounded bg-[#080d11] border border-white/10 px-2 py-1 text-white"
                >
                  <option value={0}>{tr ? 'Limitsiz' : 'No Limit'}</option>
                  <option value={2_000_000}>€2M</option>
                  <option value={5_000_000}>€5M</option>
                  <option value={15_000_000}>€15M</option>
                  <option value={35_000_000}>€35M</option>
                </select>
              </label>
            </div>
            <span className="font-mono-num text-[#b7ff4a]">
              {filteredMarket.length} {tr ? 'oyuncu listelendi' : 'players matched'}
            </span>
          </div>
        </div>
      )}

      {/* Market Table OR My Squad Sell/Loan-Out */}
      {activeTab !== 'MY_SQUAD' ? (
        <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
                <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
                <th className="py-3 px-3">{tr ? 'Tür / Kulüp' : 'Type / Club'}</th>
                <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Yaş' : 'Age'}</th>
                <th className="py-3 px-3 text-right font-mono-num">OVR / POT</th>
                <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Bedel / Maaş' : 'Fee / Wage'}</th>
                <th className="py-3 px-4 text-right">{tr ? 'İşlem' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMarket.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    {tr ? 'Arama kriterlerinize uygun oyuncu bulunamadı.' : 'No players match your search filters.'}
                  </td>
                </tr>
              ) : (
                filteredMarket.map((listing) => {
                  const { player, clubId, listingType, loanFee } = listing;
                  const seller = clubId ? clubs.find((c) => c.id === clubId) : null;
                  const alreadyMine = myClub.players.some((p) => p.id === player.id);

                  return (
                    <tr key={player.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <PlayerAvatarSvg
                            appearance={player.appearance}
                            shirtColor={seller?.primaryColor ?? '#1e293b'}
                            accentColor={seller?.accentColor ?? '#00e5ff'}
                            size={38}
                          />
                          <div>
                            <div className="font-medium text-white">
                              {getPlayerDisplayName(player, licenseMode)}
                            </div>
                            <div className="text-[11px] text-slate-400">{player.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-num font-bold text-[#00e5ff]">{player.naturalRole}</td>
                      <td className="py-3 px-3 text-xs">
                        {listingType === 'FREE_AGENT' ? (
                          <span className="text-[#b7ff4a] font-semibold">
                            {tr ? 'Serbest Oyuncu' : 'Free Agent'}
                          </span>
                        ) : listingType === 'LOAN' ? (
                          <div>
                            <span className="text-[#00e5ff] font-semibold">{tr ? 'Kiralık' : 'Loan'}</span>
                            <div className="text-slate-400">
                              {seller ? getClubDisplayName(seller, licenseMode) : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">
                            {seller ? getClubDisplayName(seller, licenseMode) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-slate-300">{player.age}</td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        <span className="font-bold text-[#b7ff4a]">{player.ovr}</span>
                        <span className="text-slate-500"> / {player.potential}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        <div className="text-white font-semibold">
                          {listingType === 'FREE_AGENT'
                            ? '€0'
                            : listingType === 'LOAN'
                            ? formatMoney(loanFee ?? 250_000)
                            : formatMoney(player.marketValue)}
                        </div>
                        <div className="text-[11px] text-slate-400">{formatMoney(player.weeklyWage)}/hf</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onToggleShortlist(player.id);
                            }}
                            title={tr ? 'Takip Listesi' : 'Shortlist'}
                            aria-label={`${getPlayerDisplayName(player, licenseMode)} Takip Listesi`}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              shortlistIds.includes(player.id)
                                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                                : 'bg-[#080d11] border-white/10 text-slate-400 hover:text-amber-300'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${shortlistIds.includes(player.id) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onScoutPlayer(
                                player,
                                seller ? getClubDisplayName(seller, licenseMode) : tr ? 'Serbest Oyuncu' : 'Free Agent',
                                leagueId
                              );
                            }}
                            title={tr ? 'Gözlemci Raporu' : 'Scout Report'}
                            aria-label={`${getPlayerDisplayName(player, licenseMode)} Gözlemci Raporu`}
                            className="p-1.5 rounded-lg bg-[#080d11] border border-white/10 text-[#00e5ff] hover:border-[#00e5ff] cursor-pointer"
                          >
                            <Binoculars className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={alreadyMine}
                            onClick={() => startNegotiation(listing)}
                            className="px-3 py-1.5 rounded-lg bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {alreadyMine
                              ? tr
                                ? 'Kadronuzda'
                                : 'Signed'
                              : listingType === 'FREE_AGENT'
                              ? tr
                                ? 'İmza Öner'
                                : 'Offer Contract'
                              : listingType === 'LOAN'
                              ? tr
                                ? 'Kirala'
                                : 'Loan Bid'
                              : tr
                              ? 'Teklif Yap'
                              : 'Negotiate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
          <div className="px-4 py-3 border-b border-white/10 text-xs text-slate-400 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#b7ff4a]" />
            <span>
              {tr
                ? 'Kadro derinliğini korumak için en az 14 oyuncunun kulüpte kalması gerekir.'
                : 'You must retain at least 14 players in your squad.'}
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
                <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
                <th className="py-3 px-3 text-right font-mono-num">OVR</th>
                <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Satış Değeri' : 'Sale Value'}</th>
                <th className="py-3 px-4 text-right">{tr ? 'İşlem' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {myClub.players.map((p) => {
                const canRelease = myClub.players.length > 14;
                const salePrice = Math.round(p.marketValue * 0.85);
                const loanOutFee = Math.max(80_000, Math.round(p.marketValue * 0.1));
                return (
                  <tr key={p.id} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <PlayerAvatarSvg
                          appearance={p.appearance}
                          shirtColor={myClub.primaryColor}
                          accentColor={myClub.accentColor}
                          size={36}
                        />
                        <div>
                          <div className="font-medium text-white">{getPlayerDisplayName(p, licenseMode)}</div>
                          <div className="text-[11px] text-slate-400">
                            {p.age} {tr ? 'Yaş' : 'yrs'} · {formatMoney(p.weeklyWage)}/hf
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono-num font-bold text-[#00e5ff]">{p.naturalRole}</td>
                    <td className="py-3 px-3 text-right font-mono-num font-bold text-[#b7ff4a]">{p.ovr}</td>
                    <td className="py-3 px-3 text-right font-mono-num text-white">{formatMoney(salePrice)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        disabled={!canRelease}
                        onClick={() => {
                          soundEngine.playSuccess();
                          onSellSquadPlayer(p.id, 'LOAN_OUT', loanOutFee);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#080d11] border border-white/15 hover:border-[#00e5ff] disabled:opacity-35 text-xs text-[#00e5ff] cursor-pointer"
                      >
                        {tr ? `Kirala (+${formatMoney(loanOutFee)})` : `Loan (+${formatMoney(loanOutFee)})`}
                      </button>
                      <button
                        type="button"
                        disabled={!canRelease}
                        onClick={() => {
                          soundEngine.playSuccess();
                          onSellSquadPlayer(p.id, 'SELL', salePrice);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#17242c] hover:bg-red-500 hover:text-white disabled:opacity-35 text-xs font-semibold text-white cursor-pointer"
                      >
                        {tr ? 'Sat' : 'Sell'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stubborn AI Negotiation Modal */}
      {negotiation && activeListing && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#111b21] border border-white/15 p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <PlayerAvatarSvg appearance={negotiation.targetPlayer.appearance} size={56} />
                <div>
                  <div className="text-xs font-mono-num text-[#00e5ff]">
                    {negotiation.listingType === 'FREE_AGENT'
                      ? tr
                        ? `Serbest Oyuncu Görüşmesi · Tur ${negotiation.round}/${negotiation.maxRounds}`
                        : `Free Agent Talks · Round ${negotiation.round}/${negotiation.maxRounds}`
                      : negotiation.listingType === 'LOAN'
                      ? tr
                        ? `Kiralama Pazarlığı · Tur ${negotiation.round}/${negotiation.maxRounds}`
                        : `Loan Talks · Round ${negotiation.round}/${negotiation.maxRounds}`
                      : tr
                      ? `Pazarlık Turu ${negotiation.round}/${negotiation.maxRounds}`
                      : `Round ${negotiation.round}/${negotiation.maxRounds}`}
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mt-0.5">
                    {getPlayerDisplayName(negotiation.targetPlayer, licenseMode)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {negotiation.targetPlayer.naturalRole} · OVR {negotiation.targetPlayer.ovr} / POT{' '}
                    {negotiation.targetPlayer.potential}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNegotiation(null)}
                aria-label="Kapat"
                className="p-2 rounded-lg bg-[#080d11] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#080d11] border border-white/10 text-xs text-slate-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#00e5ff] shrink-0 mt-0.5" />
              <span>{negotiation.clubMessage}</span>
            </div>

            {negotiation.status !== 'ACCEPTED' && negotiation.status !== 'REJECTED_WALKED' ? (
              <div className="space-y-4">
                {negotiation.listingType !== 'FREE_AGENT' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">
                        {negotiation.listingType === 'LOAN'
                          ? tr
                            ? 'Kiralama Bedeli Teklifi'
                            : 'Loan Fee Offer'
                          : tr
                          ? 'Bonservis Teklifiniz'
                          : 'Transfer Fee Offer'}
                      </span>
                      <span className="font-mono-num font-bold text-[#b7ff4a]">{formatMoney(offerInput)}</span>
                    </div>
                    <input
                      type="range"
                      min={
                        negotiation.listingType === 'LOAN'
                          ? 60_000
                          : Math.round(negotiation.targetPlayer.marketValue * 0.6)
                      }
                      max={Math.max(
                        negotiation.askingPrice * 1.25,
                        myClub.transferBudget,
                        negotiation.listingType === 'LOAN' ? 2_000_000 : 1_000_000
                      )}
                      step={negotiation.listingType === 'LOAN' ? 25_000 : 50_000}
                      value={offerInput}
                      onChange={(e) => setOfferInput(Number(e.target.value))}
                      className="w-full accent-[#b7ff4a]"
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{tr ? 'Haftalık Maaş Teklifi' : 'Weekly Wage Offer'}</span>
                    <span className="font-mono-num font-bold text-white">{formatMoney(wageInput)}/hf</span>
                  </div>
                  <input
                    type="range"
                    min={Math.round(negotiation.targetPlayer.weeklyWage * 0.65)}
                    max={Math.round(negotiation.targetPlayer.weeklyWage * 2.2)}
                    step={500}
                    value={wageInput}
                    onChange={(e) => setWageInput(Number(e.target.value))}
                    className="w-full accent-[#00e5ff]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{tr ? 'İmza Parası (Signing Bonus)' : 'Signing Bonus'}</span>
                    <span className="font-mono-num font-bold text-amber-300">{formatMoney(signingBonusInput)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(300_000, Math.round(negotiation.targetPlayer.weeklyWage * 12))}
                    step={5_000}
                    value={signingBonusInput}
                    onChange={(e) => setSigningBonusInput(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{tr ? 'Temsilci / Menajer Payı (%)' : 'Agent Fee (%)'}</span>
                    <span className="font-mono-num font-bold text-[#00e5ff]">
                      %{agentFeePctInput} (
                      {formatMoney(
                        computeAgentFeeAmount(
                          negotiation.listingType === 'FREE_AGENT' ? 0 : offerInput,
                          wageInput,
                          signingBonusInput,
                          agentFeePctInput
                        )
                      )}
                      )
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={agentFeePctInput}
                    onChange={(e) => setAgentFeePctInput(Number(e.target.value))}
                    className="w-full accent-[#00e5ff]"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-[#080d11] border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{tr ? 'Toplam Peşin Bütçe Etkisi' : 'Total Upfront Cost'}</span>
                  <span className="font-mono-num font-bold text-[#b7ff4a]">
                    {formatMoney(
                      (negotiation.listingType === 'FREE_AGENT' ? 0 : offerInput) +
                        signingBonusInput +
                        computeAgentFeeAmount(
                          negotiation.listingType === 'FREE_AGENT' ? 0 : offerInput,
                          wageInput,
                          signingBonusInput,
                          agentFeePctInput
                        )
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={submitOffer}
                  className="w-full py-3 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Handshake className="w-4 h-4" />
                  <span>{tr ? 'Resmi Teklifi Gönder' : 'Submit Official Bid'}</span>
                </button>
              </div>
            ) : negotiation.status === 'ACCEPTED' ? (
              <button
                type="button"
                onClick={() => {
                  const baseFee = negotiation.listingType === 'FREE_AGENT' ? 0 : offerInput;
                  const agentAmt =
                    negotiation.agentFeeAmount ??
                    computeAgentFeeAmount(baseFee, wageInput, signingBonusInput, agentFeePctInput);
                  const totalUpfront = baseFee + signingBonusInput + agentAmt;
                  onCompleteSigning(activeListing, totalUpfront, wageInput);
                  setNegotiation(null);
                  setActiveListing(null);
                }}
                className="w-full py-3 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-sm cursor-pointer"
              >
                {tr ? 'Sözleşmeyi İmzala & Kadroya Kat' : 'Finalize Signing'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNegotiation(null)}
                className="w-full py-3 rounded-lg bg-[#17242c] text-white font-medium text-sm cursor-pointer"
              >
                {tr ? 'Masadan Ayrıl' : 'Close'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FinanceScreenProps {
  club: Club;
  records: FinanceRecord[];
  language: Language;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ club, records, language }) => {
  const tr = language === 'tr';
  const weeklyWages = club.players.reduce((s, p) => s + p.weeklyWage, 0);
  const wagePct = Math.min(100, Math.round((weeklyWages / club.wageBudgetWeekly) * 100));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5">
          <div className="text-xs text-slate-400">{tr ? 'Kasa Nakit Dengesi' : 'Cash Balance'}</div>
          <div className="font-mono-num font-bold text-2xl text-white mt-1">
            {formatMoney(club.cashBalance)}
          </div>
        </div>
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5">
          <div className="text-xs text-slate-400">{tr ? 'Transfer Bütçesi (Sınırlı)' : 'Transfer Budget'}</div>
          <div className="font-mono-num font-bold text-2xl text-[#b7ff4a] mt-1">
            {formatMoney(club.transferBudget)}
          </div>
        </div>
        <div className="rounded-xl bg-[#111b21] border border-white/10 p-5">
          <div className="text-xs text-slate-400">{tr ? 'Haftalık Maaş Yükü / Tavan' : 'Weekly Wages / Cap'}</div>
          <div className="font-mono-num font-bold text-xl text-[#00e5ff] mt-1">
            {formatMoney(weeklyWages)} / {formatMoney(club.wageBudgetWeekly)}
          </div>
          <div className="mt-2 h-1.5 rounded bg-[#080d11] overflow-hidden">
            <div
              className={`h-full ${wagePct > 90 ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
              style={{ width: `${wagePct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 font-display font-bold text-lg text-white">
          {tr ? 'Kulüp Finans Hareketleri' : 'Club Financial Ledger'}
        </div>
        <div className="divide-y divide-white/5">
          {records.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              {tr ? 'Henüz haftalık mali hareket kaydedilmedi. Maç oynadıkça gişe ve maaş kalemleri işlenir.' : 'No financial transactions yet.'}
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="px-6 py-3.5 flex items-center justify-between text-sm">
                <div>
                  <div className="text-white font-medium">{r.description}</div>
                  <div className="text-xs text-slate-400">
                    {tr ? `Hafta ${r.week}` : `Week ${r.week}`} · {r.category}
                  </div>
                </div>
                <div
                  className={`font-mono-num font-bold ${
                    r.amount >= 0 ? 'text-[#b7ff4a]' : 'text-red-400'
                  }`}
                >
                  {r.amount >= 0 ? `+${formatMoney(r.amount)}` : formatMoney(r.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
