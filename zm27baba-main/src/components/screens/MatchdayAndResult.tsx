import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Camera,
  ChevronDown,
  ChevronUp,
  FastForward,
  Flame,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sliders,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { FORMATION_TEMPLATES } from '../../engine/database';
import {
  evaluateTeamTalk,
  formatMoney,
  getClubDisplayName,
  getClubShortName,
  getPlayerDisplayName,
  getStadiumDisplayName,
  getTeamTalkOptions,
  partitionMatchdaySquad,
} from '../../engine/hardcoreRules';
import {
  CameraAngle,
  Club,
  CompetitionId,
  Fixture,
  FormationId,
  Language,
  LicenseMode,
  ManagerProfile,
  Mentality,
  PressingIntensity,
  TacticsConfig,
  TeamTalkPhase,
  TeamTalkResult,
  TeamTalkTone,
  Tempo,
  ViewDimensionMode,
} from '../../engine/types';
import { getCupTitle } from '../../engine/tournamentEngine';
import { Live2DTelemetry, LiveMatchSnapshot, Match3DEngineCanvas } from '../../three/Match3DEngineCanvas';
import { suggestSubOut } from '../../engine/matchEngine';
import { ClubCrest, ManagerPortraitSvg, PlayerAvatarSvg, TournamentEmblemSvg } from '../BrandArt';
import { Match2DPitchCanvas } from '../match/Match2DPitchCanvas';

interface MatchdayScreenProps {
  homeClub: Club;
  awayClub: Club;
  myClubId: string;
  manager: ManagerProfile;
  homeTactics: TacticsConfig;
  awayTactics: TacticsConfig;
  licenseMode: LicenseMode;
  language: Language;
  defaultCamera: CameraAngle;
  defaultViewMode?: ViewDimensionMode;
  crowdDensity: 'HIGH' | 'MEDIUM';
  showPlayerNamesIn3D: boolean;
  muted: boolean;
  competitionId?: CompetitionId;
  matchSeed?: string;
  stageLabel?: string;
  onToggleMute: () => void;
  onUpdateMyTactics: (next: TacticsConfig) => void;
  onApplyTeamTalkMorale: (delta: number) => void;
  onMatchCompleted: (snap: LiveMatchSnapshot) => void;
}

export const MatchdayScreen: React.FC<MatchdayScreenProps> = ({
  homeClub,
  awayClub,
  myClubId,
  manager,
  homeTactics,
  awayTactics,
  licenseMode,
  language,
  defaultCamera,
  defaultViewMode = '3D',
  crowdDensity,
  showPlayerNamesIn3D,
  muted,
  competitionId,
  matchSeed,
  stageLabel,
  onToggleMute,
  onUpdateMyTactics,
  onApplyTeamTalkMorale,
  onMatchCompleted,
}) => {
  const tr = language === 'tr';
  const [viewMode, setViewMode] = useState<ViewDimensionMode>(defaultViewMode);
  const liveTelemetryRef = useRef<Live2DTelemetry | null>(null);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(defaultCamera);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [paused, setPaused] = useState(true); // Pause on launch for Pre-Match Team Talk!
  const [dockOpen, setDockOpen] = useState(true);

  const [teamTalkPhase, setTeamTalkPhase] = useState<'PRE_MATCH' | 'HALF_TIME' | null>('PRE_MATCH');
  const [preMatchBoost, setPreMatchBoost] = useState(0);
  const [halfTimeBoost, setHalfTimeBoost] = useState(0);
  const [selectedTalkId, setSelectedTalkId] = useState<string | null>(null);
  const [talkFeedback, setTalkFeedback] = useState<TeamTalkResult | null>(null);

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [tacticsPanelOpen, setTacticsPanelOpen] = useState(false);
  const [subsUsed, setSubsUsed] = useState(0);
  const [subOutSlotIndex, setSubOutSlotIndex] = useState<number | null>(null);
  const [subbedOutIds, setSubbedOutIds] = useState<string[]>([]);

  const [snapshot, setSnapshot] = useState<LiveMatchSnapshot>({
    minute: 1,
    homeGoals: 0,
    awayGoals: 0,
    homeXg: 0,
    awayXg: 0,
    homeShots: 0,
    awayShots: 0,
    homePossession: 50,
    phase: 'FIRST_HALF',
    bannerText: null,
    events: [],
    playerConditions: {},
    injuredIds: [],
    yellowCardIds: [],
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setDockOpen((v) => !v);
      if ((e.key === 'p' || e.key === 'P') && !teamTalkPhase && !subModalOpen) {
        setPaused((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [teamTalkPhase, subModalOpen]);

  const myClub = myClubId === homeClub.id ? homeClub : awayClub;
  const myTactics = myClubId === homeClub.id ? homeTactics : awayTactics;
  const myGoals = myClubId === homeClub.id ? snapshot.homeGoals : snapshot.awayGoals;
  const oppGoals = myClubId === homeClub.id ? snapshot.awayGoals : snapshot.homeGoals;

  const squadPartition = partitionMatchdaySquad(myClub, myTactics);
  const benchPlayers = squadPartition.bench.filter((p) => !subbedOutIds.includes(p.id));
  const suggestedOutId = suggestSubOut(
    myTactics.slots.flatMap((slot) => {
      const pl = myClub.players.find((x) => x.id === slot.playerId);
      return pl
        ? [{
            id: pl.id,
            positionGroup: pl.positionGroup,
            condition: snapshot.playerConditions[pl.id] ?? pl.condition,
            injured: snapshot.injuredIds.includes(pl.id),
          }]
        : [];
    })
  );

  const handleSelectTeamTalk = (optionId: string, tone: TeamTalkTone) => {
    if (!teamTalkPhase) return;
    soundEngine.playClick();
    const res = evaluateTeamTalk(teamTalkPhase, tone, manager.personality, myGoals - oppGoals);
    setSelectedTalkId(optionId);
    setTalkFeedback(res);
    onApplyTeamTalkMorale(res.moraleDelta);
    if (teamTalkPhase === 'PRE_MATCH') {
      setPreMatchBoost(res.tacticalBoost);
    } else {
      setHalfTimeBoost(res.tacticalBoost);
    }
  };

  const handleCloseTeamTalkAndResume = () => {
    soundEngine.playSuccess();
    setSnapshot((s) => ({
      ...s,
      bannerText: teamTalkPhase === 'PRE_MATCH' ? (tr ? 'MAÇ BAŞLADI' : 'KICK OFF') : null,
    }));
    setTeamTalkPhase(null);
    setSelectedTalkId(null);
    setTalkFeedback(null);
    setPaused(false);
  };

  const handleExecuteSub = (benchPlayerId: string) => {
    if (subOutSlotIndex === null || subsUsed >= 5) return;
    const outgoingSlot = myTactics.slots.find((s) => s.slotIndex === subOutSlotIndex);
    if (!outgoingSlot || !outgoingSlot.playerId) return;

    const outgoingId = outgoingSlot.playerId;
    const nextSlots = myTactics.slots.map((s) =>
      s.slotIndex === subOutSlotIndex ? { ...s, playerId: benchPlayerId } : s
    );

    const nextBenchIds = myTactics.benchPlayerIds.filter((id) => id !== benchPlayerId);

    soundEngine.playSubWhistle();
    onUpdateMyTactics({ ...myTactics, slots: nextSlots, benchPlayerIds: nextBenchIds });
    setSubbedOutIds((prev) => [...prev, outgoingId]);
    setSubsUsed((c) => c + 1);
    setSubOutSlotIndex(null);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#080d11] overflow-hidden select-none">
      {/* Isolated Full-Bleed 3D Match Stadium Canvas (kept mounted so 2D/3D stay 100% synced) */}
      <div className={viewMode === '2D' ? 'absolute inset-0 opacity-0 pointer-events-none' : 'absolute inset-0'}>
        <Match3DEngineCanvas
          homeClub={homeClub}
          awayClub={awayClub}
          myClubId={myClubId}
          homeTactics={homeTactics}
          awayTactics={awayTactics}
          licenseMode={licenseMode}
          cameraAngle={cameraAngle}
          speedMultiplier={speed}
          paused={paused || Boolean(teamTalkPhase) || subModalOpen || tacticsPanelOpen}
          crowdDensity={crowdDensity}
          showPlayerNamesIn3D={showPlayerNamesIn3D}
          preMatchBoost={preMatchBoost}
          halfTimeBoost={halfTimeBoost}
          competitionId={competitionId}
          matchSeed={matchSeed}
          liveTelemetryRef={liveTelemetryRef}
          onHalfTimeReached={() => {
            setPaused(true);
            setSelectedTalkId(null);
            setTalkFeedback(null);
            setTeamTalkPhase('HALF_TIME');
          }}
          onUpdateSnapshot={setSnapshot}
          onFinishMatch={onMatchCompleted}
        />
      </div>

      {viewMode === '2D' && <Match2DPitchCanvas telemetryRef={liveTelemetryRef} />}

      {/* Pointer-transparent HUD Overlay (No backdrop-blur over WebGL!) */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-5">
        {/* Top Row: Broadcast Scoreboard + Utility Controls */}
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#080d11]/92 border border-white/15 shadow-lg">
            {competitionId && competitionId !== 'LEAGUE' && (
              <div className="pr-2 border-r border-white/15 flex items-center gap-1.5">
                <TournamentEmblemSvg cupId={competitionId} size={24} />
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ClubCrest club={homeClub} licenseMode={licenseMode} size={24} />
              <span className="font-display font-bold text-xs sm:text-sm text-white">
                {getClubShortName(homeClub, licenseMode)}
              </span>
            </div>

            <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded bg-[#111b21] font-mono-num font-bold text-base sm:text-lg text-[#b7ff4a]">
              {snapshot.homeGoals} - {snapshot.awayGoals}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-bold text-xs sm:text-sm text-white">
                {getClubShortName(awayClub, licenseMode)}
              </span>
              <ClubCrest club={awayClub} licenseMode={licenseMode} size={24} />
            </div>

            <div className="pl-2 sm:pl-3 border-l border-white/15 font-mono-num text-xs sm:text-sm font-bold text-[#00e5ff]">
              {snapshot.minute}&apos;
            </div>

            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/15 text-xs text-slate-300 font-mono-num">
              <span>
                xG {snapshot.homeXg.toFixed(2)} - {snapshot.awayXg.toFixed(2)}
              </span>
              <span>
                {snapshot.homePossession}% / {100 - snapshot.homePossession}%
              </span>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-[#080d11]/92 border border-white/15 h-9">
              <button
                type="button"
                onClick={() => setViewMode('3D')}
                className={`px-2.5 h-full rounded text-xs font-bold cursor-pointer ${
                  viewMode === '3D' ? 'bg-[#b7ff4a] text-[#080d11]' : 'text-slate-300'
                }`}
              >
                3D
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2D')}
                className={`px-2.5 h-full rounded text-xs font-bold cursor-pointer ${
                  viewMode === '2D' ? 'bg-[#00e5ff] text-[#080d11]' : 'text-slate-300'
                }`}
              >
                2D Mod
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSubModalOpen(true)}
              className="h-9 px-3 rounded-lg bg-[#080d11]/92 border border-[#00e5ff]/50 text-xs font-display font-bold text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#080d11] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{tr ? `Değişiklik (${5 - subsUsed})` : `Subs (${5 - subsUsed})`}</span>
            </button>
            <button
              type="button"
              onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
              className="h-9 px-3 rounded-lg bg-[#080d11]/92 border border-white/15 text-xs font-mono-num font-bold text-white hover:border-[#b7ff4a] flex items-center gap-1.5 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5 text-[#b7ff4a]" />
              <span>{speed}x</span>
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Devam Et' : 'Duraklat'}
              className="w-9 h-9 rounded-lg bg-[#080d11]/92 border border-white/15 text-white hover:border-[#b7ff4a] flex items-center justify-center cursor-pointer"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="w-9 h-9 rounded-lg bg-[#080d11]/92 border border-white/15 text-white hover:border-[#b7ff4a] flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center-top Event Callout */}
        {snapshot.bannerText && !teamTalkPhase && (
          <div className="self-center px-6 py-2.5 rounded-lg bg-[#0a1128]/95 border border-[#00e5ff] text-center shadow-xl">
            <div className="font-display font-bold text-lg tracking-wider text-[#b7ff4a]">
              {snapshot.bannerText}
            </div>
          </div>
        )}

        {/* Collapsible Bottom Control Dock */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            className="pointer-events-auto mb-1.5 px-3 py-1 rounded-t-lg bg-[#111b21]/95 border border-b-0 border-white/15 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{dockOpen ? (tr ? 'Paneli Gizle (H)' : 'Hide HUD (H)') : tr ? 'Taktik & Kamera (H)' : 'Tactics & Cam (H)'}</span>
          </button>

          {dockOpen && (
            <div className="pointer-events-auto w-full max-w-4xl rounded-xl bg-[#080d11]/92 border border-white/15 p-3.5 shadow-2xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Camera Angle Selector */}
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#00e5ff] mr-1" />
                  {(
                    [
                      ['broadcast', tr ? 'Yayın' : 'TV'],
                      ['tactical', tr ? 'Taktik' : 'Tactical'],
                      ['behind_goal', tr ? 'Kale Arkası' : 'Goal'],
                      ['dynamic', tr ? 'Dinamik' : 'Dynamic'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCameraAngle(id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                        cameraAngle === id
                          ? 'bg-[#00e5ff] text-[#080d11] font-bold'
                          : 'bg-[#111b21] text-slate-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Live Tactical Shouts */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateMyTactics({ ...myTactics, mentality: 'ATTACKING', pressing: 'HIGH' })}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      myTactics.mentality === 'ATTACKING'
                        ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                        : 'bg-[#111b21] text-slate-200 hover:border-white/30'
                    }`}
                  >
                    {tr ? 'Baskıyı Artır' : 'Push Forward'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMyTactics({ ...myTactics, mentality: 'BALANCED', pressing: 'MEDIUM' })}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      myTactics.mentality === 'BALANCED'
                        ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                        : 'bg-[#111b21] text-slate-200'
                    }`}
                  >
                    {tr ? 'Dengeli' : 'Balanced'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMyTactics({ ...myTactics, mentality: 'DEFENSIVE', pressing: 'LOW' })}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      myTactics.mentality === 'DEFENSIVE'
                        ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                        : 'bg-[#111b21] text-slate-200'
                    }`}
                  >
                    {tr ? 'Skoru Koru' : 'Park Bus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTacticsPanelOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{tr ? 'Taktik Paneli' : 'Tactics Panel'}</span>
                  </button>
                </div>
              </div>

              {/* Latest Commentary Line */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10 text-xs">
                <div className="text-slate-200 truncate">
                  {snapshot.events[0] ? (
                    <>
                      <span className="font-mono-num text-[#b7ff4a] mr-2">{snapshot.events[0].minute}&apos;</span>
                      <span>{snapshot.events[0].detail}</span>
                    </>
                  ) : (
                    <span>{getStadiumDisplayName(homeClub, licenseMode)}</span>
                  )}
                </div>
                {snapshot.injuredIds.length > 0 && (
                  <span className="text-red-400 font-medium shrink-0">
                    {snapshot.injuredIds.length} {tr ? 'Sakatlık!' : 'Injury!'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sleek Live In-Match Tactical Panel Slide-Over */}
      {tacticsPanelOpen && !teamTalkPhase && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex justify-end"
          onClick={() => setTacticsPanelOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[#09111d] border-l border-emerald-400/25 p-5 overflow-y-auto text-slate-100 shadow-2xl flex flex-col justify-between gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      {tr ? 'Canlı Maç Taktik Paneli' : 'Live Match Tactics'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {snapshot.minute}&apos; · {myTactics.formation} · {myTactics.mentality}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTacticsPanelOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formation */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {tr ? 'Diziliş (Anlık Geçiş)' : 'Formation'}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['4-3-3', '4-2-3-1', '3-5-2', '5-4-1', '4-4-2', '3-4-2-1', '4-1-4-1', '4-2-4'] as FormationId[]).map(
                    (form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => {
                          const tpl = FORMATION_TEMPLATES[form];
                          const nextSlots = myTactics.slots.map((slot, idx) => ({
                            ...slot,
                            role: tpl[idx]?.role ?? slot.role,
                            x: tpl[idx]?.x ?? slot.x,
                            z: tpl[idx]?.z ?? slot.z,
                          }));
                          soundEngine.playClick();
                          onUpdateMyTactics({ ...myTactics, formation: form, slots: nextSlots });
                        }}
                        className={`py-2 rounded-lg text-xs font-mono-num font-bold border transition cursor-pointer ${
                          myTactics.formation === form
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {form}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Mentality */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {tr ? 'Oyun Zihniyeti' : 'Mentality'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['DEFENSIVE', tr ? 'Savunma' : 'Defensive'],
                      ['BALANCED', tr ? 'Dengeli' : 'Balanced'],
                      ['ATTACKING', tr ? 'Hücum' : 'Attacking'],
                      ['ALL_OUT', tr ? 'Tam Hücum' : 'All-Out Attack'],
                    ] as Array<[Mentality, string]>
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateMyTactics({ ...myTactics, mentality: val })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        myTactics.mentality === val
                          ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a] font-bold'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pressing */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {tr ? 'Pres Şiddeti' : 'Pressing Intensity'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['LOW', tr ? 'Düşük Blok' : 'Low Block'],
                      ['MEDIUM', tr ? 'Orta Pres' : 'Medium'],
                      ['HIGH', tr ? 'Yüksek Pres' : 'High Press'],
                      ['GEGENPRESS', 'Gegenpress'],
                    ] as Array<[PressingIntensity, string]>
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateMyTactics({ ...myTactics, pressing: val })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        myTactics.pressing === val
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {tr ? 'Oyun Temposu' : 'Tempo'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['SLOW', tr ? 'Sabırlı' : 'Slow'],
                      ['NORMAL', tr ? 'Normal' : 'Normal'],
                      ['FAST', tr ? 'Yüksek' : 'Fast'],
                    ] as Array<[Tempo, string]>
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateMyTactics({ ...myTactics, tempo: val })}
                      className={`py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        myTactics.tempo === val
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Defensive Line */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">
                    {tr ? 'Savunma Çizgisi' : 'Defensive Line'}
                  </span>
                  <span className="font-mono-num font-bold text-emerald-400">{myTactics.defensiveLine}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={myTactics.defensiveLine}
                  onChange={(e) =>
                    onUpdateMyTactics({ ...myTactics, defensiveLine: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTacticsPanelOpen(false);
                  setSubModalOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#00e5ff]" />
                <span>{tr ? `Değişiklik (${5 - subsUsed})` : `Subs (${5 - subsUsed})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setTacticsPanelOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 cursor-pointer"
              >
                {tr ? 'Maça Devam Et' : 'Resume Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Match & Half-Time Locker Room Team Talk Modal */}
      {teamTalkPhase && !subModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#111b21] border border-white/15 p-6 space-y-5 shadow-2xl">
            {competitionId && competitionId !== 'LEAGUE' && (
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#071124] border border-blue-400/35">
                <div className="flex items-center gap-3.5">
                  <TournamentEmblemSvg cupId={competitionId} size={58} />
                  <div>
                    <div className="text-[11px] font-mono-num uppercase tracking-widest text-[#00e5ff] font-bold">
                      {getCupTitle(competitionId, language)}
                    </div>
                    <div className="font-display font-bold text-base text-white">
                      {stageLabel ?? (tr ? 'Resmi Turnuva Maçı' : 'Official Tournament Night')}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      {getStadiumDisplayName(homeClub, licenseMode)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ClubCrest club={homeClub} licenseMode={licenseMode} size={36} />
                  <span className="font-mono-num text-xs text-slate-400">vs</span>
                  <ClubCrest club={awayClub} licenseMode={licenseMode} size={36} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3.5">
                <ManagerPortraitSvg appearance={manager.appearance} photoUrl={manager.customPhotoDataUrl} size={62} />
                <div>
                  <div className="text-xs font-mono-num text-[#00e5ff] uppercase tracking-wider">
                    {teamTalkPhase === 'PRE_MATCH'
                      ? tr
                        ? 'Maç Öncesi Takım Konuşması'
                        : 'Pre-Match Dressing Room Talk'
                      : tr
                      ? `Devre Arası Takım Konuşması (${snapshot.homeGoals}-${snapshot.awayGoals})`
                      : `Half-Time Team Talk (${snapshot.homeGoals}-${snapshot.awayGoals})`}
                  </div>
                  <h2 className="font-display font-bold text-xl text-white mt-0.5">
                    {manager.firstName} {manager.lastName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {getClubDisplayName(homeClub, licenseMode)} vs {getClubDisplayName(awayClub, licenseMode)}
                  </p>
                </div>
              </div>

              {teamTalkPhase === 'HALF_TIME' && (
                <button
                  type="button"
                  onClick={() => setSubModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#080d11] border border-[#00e5ff]/50 text-xs font-bold text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#080d11] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{tr ? 'Oyuncu Değiştir' : 'Make Subs'}</span>
                </button>
              )}
            </div>

            {teamTalkPhase === 'HALF_TIME' && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#080d11] border border-white/5 text-center text-xs">
                <div>
                  <div className="text-slate-400">xG</div>
                  <div className="font-mono-num font-bold text-white mt-0.5">
                    {snapshot.homeXg.toFixed(2)} - {snapshot.awayXg.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{tr ? 'Şutlar' : 'Shots'}</div>
                  <div className="font-mono-num font-bold text-white mt-0.5">
                    {snapshot.homeShots} - {snapshot.awayShots}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{tr ? 'Topla Oynama' : 'Possession'}</div>
                  <div className="font-mono-num font-bold text-[#00e5ff] mt-0.5">
                    {snapshot.homePossession}% - {100 - snapshot.homePossession}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">PPDA</div>
                  <div className="font-mono-num font-bold text-white mt-0.5">
                    {(snapshot.homePpda ?? 0).toFixed(1)} - {(snapshot.awayPpda ?? 0).toFixed(1)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-400">Momentum</div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded bg-white/10">
                    <div
                      className="absolute top-0 bottom-0 bg-[#b7ff4a]"
                      style={{
                        left: `${50 + Math.min(0, snapshot.momentum ?? 0) * 50}%`,
                        width: `${Math.abs(snapshot.momentum ?? 0) * 50}%`,
                      }}
                    />
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[58vh] overflow-y-auto pr-1">
              {getTeamTalkOptions(teamTalkPhase, myGoals - oppGoals, manager.personality).map((opt) => {
                const isChosen = selectedTalkId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTeamTalk(opt.id, opt.tone)}
                    className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      isChosen
                        ? 'bg-[#0a1128] border-[#b7ff4a]'
                        : 'bg-[#080d11] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="font-display font-bold text-xs text-[#00e5ff]">{opt.labelTr}</div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed italic">{opt.speechTr}</p>
                  </button>
                );
              })}
            </div>

            {talkFeedback && (
              <div className="p-4 rounded-xl bg-[#0a1128] border border-[#00e5ff]/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00e5ff]">
                  <Flame className="w-4 h-4 text-[#b7ff4a]" />
                  <span>{tr ? 'Soyunma Odası Tepkisi' : 'Squad Reaction'}</span>
                </div>
                <p className="text-sm text-white">{talkFeedback.reactionText}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseTeamTalkAndResume}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {teamTalkPhase === 'PRE_MATCH'
                    ? talkFeedback
                      ? tr
                        ? 'Sahaya Çık & Maçı Başlat'
                        : 'Kick Off Match'
                      : tr
                      ? 'Konuşma Yapmadan Başla'
                      : 'Skip & Kick Off'
                    : tr
                    ? 'İkinci Yarıyı Başlat'
                    : 'Start Second Half'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live In-Match Substitution Modal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111b21] border border-white/15 p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-white">
                  {tr ? 'Canlı Oyuncu Değişikliği' : 'Live In-Match Substitutions'}
                </h3>
                <p className="text-xs text-slate-400">
                  {tr
                    ? `Önce sahadan çıkacak oyuncuyu seçin, ardından yedek kulübesinden girecek ismi tıklayın. Kalan hak: ${5 - subsUsed}/5`
                    : `Select a player on the pitch, then click a bench substitute. Remaining: ${5 - subsUsed}/5`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubModalOpen(false);
                  setSubOutSlotIndex(null);
                }}
                className="p-2 rounded-lg bg-[#080d11] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* On-Pitch 11 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#00e5ff] uppercase tracking-wider">
                  {tr ? 'Sahadaki İlk 11 (Çıkacak Oyuncuyu Seç)' : 'On Pitch (Select Outgoing)'}
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {myTactics.slots.map((slot) => {
                    const p = myClub.players.find((pl) => pl.id === slot.playerId);
                    if (!p) return null;
                    const liveCond = Math.round(snapshot.playerConditions[p.id] ?? p.condition);
                    const isInjured = snapshot.injuredIds.includes(p.id);
                    const isSelected = subOutSlotIndex === slot.slotIndex;
                    return (
                      <button
                        key={slot.slotIndex}
                        type="button"
                        disabled={subsUsed >= 5}
                        onClick={() => setSubOutSlotIndex(slot.slotIndex)}
                        className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0a1128] border-[#b7ff4a]'
                            : 'bg-[#080d11] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatarSvg
                            appearance={p.appearance}
                            shirtColor={myClub.primaryColor}
                            accentColor={myClub.accentColor}
                            size={34}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {getPlayerDisplayName(p, licenseMode)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {slot.role} ({p.naturalRole}) · OVR {p.ovr}
                              {isInjured && <span className="text-red-400 ml-1">· SAKAT</span>}
                              {suggestedOutId === p.id && (
                                <span className="text-amber-300 ml-1">· {tr ? 'ÖNERİLEN ÇIKIŞ' : 'SUGGESTED'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`font-mono-num font-bold ${
                            liveCond < 55 ? 'text-red-400' : liveCond < 72 ? 'text-amber-300' : 'text-[#b7ff4a]'
                          }`}
                        >
                          {liveCond}%
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bench */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#b7ff4a] uppercase tracking-wider">
                    {tr
                      ? `Yedek Kulübesi (${benchPlayers.length}/9)`
                      : `Matchday Bench (${benchPlayers.length}/9)`}
                  </div>
                  {squadPartition.reserves.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      {tr
                        ? `${squadPartition.reserves.length} kadro dışı`
                        : `${squadPartition.reserves.length} reserves excluded`}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {benchPlayers.length === 0 && (
                    <div className="p-3 rounded-lg bg-[#080d11] border border-white/10 text-xs text-slate-400">
                      {tr
                        ? 'Maç günü yedek kulübesinde uygun oyuncu kalmadı.'
                        : 'No eligible substitutes remaining on matchday bench.'}
                    </div>
                  )}
                  {benchPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={subOutSlotIndex === null || subsUsed >= 5}
                      onClick={() => handleExecuteSub(p.id)}
                      className="w-full p-2.5 rounded-lg bg-[#080d11] border border-white/10 hover:border-[#b7ff4a] disabled:opacity-45 flex items-center justify-between text-left text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatarSvg
                          appearance={p.appearance}
                          shirtColor={myClub.primaryColor}
                          accentColor={myClub.accentColor}
                          size={34}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {getPlayerDisplayName(p, licenseMode)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {p.naturalRole} · OVR {p.ovr} / POT {p.potential}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-num text-[#b7ff4a] font-bold">{p.condition}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSubModalOpen(false);
                  setSubOutSlotIndex(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs cursor-pointer"
              >
                {tr ? 'Maça Dön' : 'Return to Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MatchResultScreenProps {
  fixture: Fixture;
  homeClub: Club;
  awayClub: Club;
  myClubId: string;
  manager: ManagerProfile;
  gateRevenue: number;
  uefaPrizeBonus?: number;
  travelFatigueNote?: string | null;
  newInjuries: string[];
  licenseMode: LicenseMode;
  language: Language;
  onApplyPostMatchTalk: (result: TeamTalkResult) => void;
  onContinue: () => void;
}

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  fixture,
  homeClub,
  awayClub,
  myClubId,
  manager,
  gateRevenue,
  uefaPrizeBonus = 0,
  travelFatigueNote = null,
  newInjuries,
  licenseMode,
  language,
  onApplyPostMatchTalk,
  onContinue,
}) => {
  const tr = language === 'tr';
  const [postTalkDone, setPostTalkDone] = useState<TeamTalkResult | null>(null);

  const isHome = fixture.homeClubId === myClubId;
  const scoreDiff = isHome ? fixture.homeGoals - fixture.awayGoals : fixture.awayGoals - fixture.homeGoals;
  const compId = fixture.competitionId ?? 'LEAGUE';

  const handlePostTalk = (tone: TeamTalkTone) => {
    if (postTalkDone) return;
    soundEngine.playClick();
    const res = evaluateTeamTalk('POST_MATCH' as TeamTalkPhase, tone, manager.personality, scoreDiff);
    setPostTalkDone(res);
    onApplyPostMatchTalk(res);
  };

  return (
    <div className="max-w-3xl mx-auto rounded-xl bg-[#111b21] border border-white/10 p-6 sm:p-8 space-y-6">
      <div className="text-center">
        {compId !== 'LEAGUE' && (
          <div className="flex justify-center mb-3">
            <TournamentEmblemSvg cupId={compId} size={52} />
          </div>
        )}
        <div className="text-xs text-slate-400">
          {compId !== 'LEAGUE'
            ? `${getCupTitle(compId, language)} · ${fixture.dayLabel ?? `Hafta ${fixture.week}`}`
            : tr
              ? `Hafta ${fixture.week} Maç Sonucu`
              : `Week ${fixture.week} Full Time`}{' '}
          · {getStadiumDisplayName(homeClub, licenseMode)}
        </div>

        <div className="mt-5 flex items-center justify-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-2 w-32">
            <ClubCrest club={homeClub} licenseMode={licenseMode} size={60} />
            <div className="font-display font-bold text-base text-white text-center">
              {getClubDisplayName(homeClub, licenseMode)}
            </div>
          </div>

          <div className="font-mono-num font-bold text-4xl sm:text-5xl text-[#b7ff4a]">
            {fixture.homeGoals} - {fixture.awayGoals}
          </div>

          <div className="flex flex-col items-center gap-2 w-32">
            <ClubCrest club={awayClub} licenseMode={licenseMode} size={60} />
            <div className="font-display font-bold text-base text-white text-center">
              {getClubDisplayName(awayClub, licenseMode)}
            </div>
          </div>
        </div>
      </div>

      {/* Match Analytics */}
      <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/10 text-center text-sm">
        <div>
          <div className="text-xs text-slate-400">xG</div>
          <div className="font-mono-num font-bold text-white mt-1">
            {fixture.homeXg.toFixed(2)} — {fixture.awayXg.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{tr ? 'Şutlar' : 'Shots'}</div>
          <div className="font-mono-num font-bold text-white mt-1">
            {fixture.homeShots} — {fixture.awayShots}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{tr ? 'Topa Sahip Olma' : 'Possession'}</div>
          <div className="font-mono-num font-bold text-[#00e5ff] mt-1">
            {fixture.homePossession}% — {100 - fixture.homePossession}%
          </div>
        </div>
      </div>

      {/* Post-Match Team Talk */}
      <div className="p-4 rounded-xl bg-[#080d11] border border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <ManagerPortraitSvg appearance={manager.appearance} photoUrl={manager.customPhotoDataUrl} size={44} />
          <div>
            <div className="text-xs font-semibold text-[#00e5ff] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{tr ? 'Maç Sonu Takım Konuşması' : 'Post-Match Team Talk'}</span>
            </div>
            <p className="text-xs text-slate-400">
              {tr
                ? 'Soyunma odasına girip oyuncularına maç sonrası tepkini ver:'
                : 'Deliver your full-time reaction to the dressing room:'}
            </p>
          </div>
        </div>

        {!postTalkDone ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {getTeamTalkOptions('POST_MATCH', scoreDiff, manager.personality).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePostTalk(opt.tone)}
                className="p-3 rounded-lg bg-[#111b21] border border-white/10 hover:border-[#b7ff4a] text-xs text-white text-left cursor-pointer transition-colors space-y-1"
              >
                <div className="font-display font-bold text-[#00e5ff]">{opt.labelTr}</div>
                <p className="text-[11px] text-slate-200 italic leading-relaxed">{opt.speechTr}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-[#0a1128] border border-[#b7ff4a]/40 text-xs text-slate-100">
            {postTalkDone.reactionText}
          </div>
        )}
      </div>

      {/* Match Events & Economy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-lg bg-[#080d11] border border-white/5 space-y-1.5">
          <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span>{tr ? 'Maç Olayları' : 'Key Events'}</span>
          </div>
          {fixture.events.slice(0, 8).map((ev, idx) => (
            <div key={idx} className="text-slate-300">
              <span className="font-mono-num text-[#b7ff4a] mr-1.5">{ev.minute}&apos;</span>
              <span>{ev.detail}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-[#080d11] border border-white/5 space-y-2">
          <div className="font-semibold text-slate-300">{tr ? 'Ekonomi & Sağlık Raporu' : 'Finance & Medical'}</div>
          <div className="flex justify-between">
            <span className="text-slate-400">{tr ? 'Gişe Geliri' : 'Gate Receipts'}</span>
            <span className="font-mono-num text-[#b7ff4a]">+{formatMoney(gateRevenue)}</span>
          </div>
          {uefaPrizeBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">{tr ? 'UEFA Performans Primi' : 'UEFA Match Bonus'}</span>
              <span className="font-mono-num text-[#00e5ff]">+{formatMoney(uefaPrizeBonus)}</span>
            </div>
          )}
          {travelFatigueNote && (
            <div className="text-amber-300 text-[11px]">{travelFatigueNote}</div>
          )}
          {newInjuries.length > 0 ? (
            <div className="text-red-400 space-y-1 pt-1">
              {newInjuries.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400">{tr ? 'Maçta yeni sakatlık yaşanmadı.' : 'No new injuries reported.'}</div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3.5 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>
          {compId === 'LEAGUE'
            ? tr
              ? 'Haftayı Tamamla & Puan Durumuna Git'
              : 'Advance Week & Standings'
            : tr
              ? 'Turnuva Tablosuna Dön'
              : 'Return to Competition Hub'}
        </span>
      </button>
    </div>
  );
};
