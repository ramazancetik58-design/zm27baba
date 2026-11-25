import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Search,
  ShieldAlert,
  Sparkles,
  Syringe,
  Users,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import {
  buildTeamReport,
  formatMoney,
  getPlayerDisplayName,
  getStaffDisplayName,
} from '../../engine/hardcoreRules';
import {
  Club,
  Language,
  LicenseMode,
  MentoringPair,
  Player,
  StaffMember,
  StaffRole,
  TrainingFocus,
  TrainingIntensity,
  TrainingPlan,
  TrainingSessionType,
} from '../../engine/types';
import { PlayerAvatarSvg } from '../BrandArt';

const SESSION_META: Record<TrainingSessionType, { labelTr: string; labelEn: string; color: string }> = {
  TACTICS_SHAPE: { labelTr: 'Taktik & Diziliş', labelEn: 'Tactical Shape', color: 'text-[#00e5ff]' },
  ATTACKING_FINISHING: { labelTr: 'Hücum & Bitiricilik', labelEn: 'Attacking Finishing', color: 'text-[#b7ff4a]' },
  DEFENSIVE_PRESS: { labelTr: 'Savunma & Pres', labelEn: 'Defensive Press', color: 'text-amber-300' },
  PHYSICAL_ENDURANCE: { labelTr: 'Fizik & Dayanıklılık', labelEn: 'Endurance', color: 'text-red-300' },
  RECOVERY_YOGA: { labelTr: 'Rejenerasyon & Esneklik', labelEn: 'Recovery', color: 'text-emerald-300' },
  MATCH_PREP: { labelTr: 'Maç Analizi & Duran Top', labelEn: 'Match Prep', color: 'text-indigo-300' },
  REST_DAY: { labelTr: 'Tam Dinlenme', labelEn: 'Rest Day', color: 'text-slate-400' },
};

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TrainingScreenProps {
  club: Club;
  plan: TrainingPlan;
  staff: StaffMember[];
  currentWeek: number;
  licenseMode: LicenseMode;
  language: Language;
  onUpdatePlan: (next: TrainingPlan) => void;
  onUpdatePlayerFocus: (playerId: string, focus: TrainingFocus) => void;
  onApplyWeeklyTraining: () => void;
}

export const TrainingScreen: React.FC<TrainingScreenProps> = ({
  club,
  plan,
  staff,
  currentWeek,
  licenseMode,
  language,
  onUpdatePlan,
  onUpdatePlayerFocus,
  onApplyWeeklyTraining,
}) => {
  const tr = language === 'tr';
  const appliedThisWeek = plan.appliedWeek === currentWeek;
  const assistant = staff.find((s) => s.role === 'ASSISTANT');
  const fitness = staff.find((s) => s.role === 'FITNESS');
  const youthDir = staff.find((s) => s.role === 'YOUTH_DIRECTOR');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-[#b7ff4a]" />
            <span>{tr ? 'Antrenman Sahası & Bireysel Odak' : 'Training Ground & Individual Focus'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `Hafta ${currentWeek} · Baş Antrenör (${assistant?.rating ?? 70}), Kondisyoner (${fitness?.rating ?? 70}) ve Akademi Direktörü (${youthDir?.rating ?? 70}) katkısı aktif.`
              : `Week ${currentWeek} · Assisted by Coach (${assistant?.rating ?? 70}) & Fitness (${fitness?.rating ?? 70}).`}
          </p>
        </div>

        <button
          type="button"
          disabled={appliedThisWeek}
          onClick={() => {
            soundEngine.playSuccess();
            onApplyWeeklyTraining();
          }}
          className="px-5 py-2.5 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] disabled:opacity-45 text-[#080d11] font-display font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>
            {appliedThisWeek
              ? tr
                ? `Hafta ${currentWeek} İdmanı Uygulandı`
                : `Week ${currentWeek} Applied`
              : tr
              ? `Hafta ${currentWeek} Antrenmanını Uygula`
              : `Apply Week ${currentWeek} Training`}
          </span>
        </button>
      </div>

      {/* Intensity & 6-Day Weekly Slots */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-white">
            {tr ? 'Haftalık Antrenman Şiddeti' : 'Weekly Training Intensity'}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['LOW', tr ? 'Hafif (Toparlanma)' : 'Light'],
                ['BALANCED', tr ? 'Dengeli' : 'Balanced'],
                ['INTENSE', tr ? 'Yüksek Tempo' : 'Intense'],
                ['DOUBLE', tr ? 'Çift İdman (Sakatlık Riski!)' : 'Double Session (Risk!)'],
              ] as Array<[TrainingIntensity, string]>
            ).map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                onClick={() => onUpdatePlan({ ...plan, intensity: id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  plan.intensity === id
                    ? id === 'DOUBLE'
                      ? 'bg-red-500 text-white'
                      : 'bg-[#b7ff4a] text-[#080d11]'
                    : 'bg-[#080d11] text-slate-300 border border-white/10'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {plan.sessions.map((sess, dayIdx) => (
            <div key={dayIdx} className="p-3.5 rounded-xl bg-[#080d11] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold text-white">{tr ? DAYS_TR[dayIdx] : DAYS_EN[dayIdx]}</span>
                <span className={`font-semibold text-[11px] ${SESSION_META[sess].color}`}>
                  {tr ? SESSION_META[sess].labelTr : SESSION_META[sess].labelEn}
                </span>
              </div>
              <select
                aria-label={`${DAYS_TR[dayIdx]} İdman`}
                value={sess}
                onChange={(e) => {
                  const next = [...plan.sessions];
                  next[dayIdx] = e.target.value as TrainingSessionType;
                  onUpdatePlan({ ...plan, sessions: next });
                }}
                className="w-full rounded-lg bg-[#111b21] border border-white/10 px-2.5 py-2 text-xs text-white"
              >
                {(Object.keys(SESSION_META) as TrainingSessionType[]).map((key) => (
                  <option key={key} value={key}>
                    {tr ? SESSION_META[key].labelTr : SESSION_META[key].labelEn}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Player Focus Table */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white">
            {tr ? 'Bireysel Oyuncu Gelişim & Kondisyon Odakları' : 'Individual Player Focus'}
          </h3>
          <span className="text-xs text-slate-400">
            {tr ? 'Her oyuncuya özel antrenman odağı atayın' : 'Assign individual training routines'}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400">
              <th className="py-3 px-4">{tr ? 'Oyuncu' : 'Player'}</th>
              <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
              <th className="py-3 px-3 text-right font-mono-num">OVR / POT</th>
              <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Kondisyon' : 'Cond'}</th>
              <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Keskinlik' : 'Sharp'}</th>
              <th className="py-3 px-4">{tr ? 'Bireysel Odak' : 'Training Focus'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {club.players.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-4">
                  <div className="font-medium text-white">{getPlayerDisplayName(p, licenseMode)}</div>
                  <div className="text-[11px] text-slate-400">{p.age} {tr ? 'Yaş' : 'yrs'}</div>
                </td>
                <td className="py-2.5 px-3 font-mono-num font-bold text-[#00e5ff]">{p.naturalRole}</td>
                <td className="py-2.5 px-3 text-right font-mono-num">
                  <span className="text-[#b7ff4a] font-bold">{p.ovr}</span> / {p.potential}
                </td>
                <td className="py-2.5 px-3 text-right font-mono-num text-slate-200">{p.condition}%</td>
                <td className="py-2.5 px-3 text-right font-mono-num text-[#00e5ff]">{p.sharpness ?? 75}%</td>
                <td className="py-2.5 px-4">
                  <select
                    aria-label={`${p.realName} Odak`}
                    value={p.trainingFocus ?? 'BALANCED'}
                    onChange={(e) => onUpdatePlayerFocus(p.id, e.target.value as TrainingFocus)}
                    className="rounded-lg bg-[#080d11] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="BALANCED">{tr ? 'Dengeli Gelişim' : 'Balanced'}</option>
                    <option value="FINISHING">{tr ? 'Bitiricilik & Şut' : 'Finishing'}</option>
                    <option value="PLAYMAKING">{tr ? 'Pas & Oyun Kurma' : 'Playmaking'}</option>
                    <option value="DEFENSE">{tr ? 'Savunma & Pozisyon' : 'Defending'}</option>
                    <option value="PHYSICAL">{tr ? 'Hız & Fizik' : 'Physical'}</option>
                    <option value="RECOVERY">{tr ? 'Ekstra Toparlanma' : 'Extra Recovery'}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface MedicalCenterScreenProps {
  club: Club;
  physioRating: number;
  licenseMode: LicenseMode;
  language: Language;
  onMedicalIntervention: (playerId: string, mode: 'REST' | 'INJECTION') => string;
}

export const MedicalCenterScreen: React.FC<MedicalCenterScreenProps> = ({
  club,
  physioRating,
  licenseMode,
  language,
  onMedicalIntervention,
}) => {
  const tr = language === 'tr';
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actedIds, setActedIds] = useState<string[]>([]);

  const injured = club.players.filter((p) => p.injuredWeeks > 0);
  const fatigued = club.players
    .filter((p) => p.injuredWeeks === 0 && p.condition < 78)
    .sort((a, b) => a.condition - b.condition);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <HeartPulse className="w-6 h-6 text-red-400" />
            <span>{tr ? 'Sağlık Merkezi & Fizyoterapi' : 'Medical Center & Rehab'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `Baş Fizyoterapist Kalitesi: ${physioRating}/100 · Sakat oyuncular için tam dinlenme veya riskli ağrı kesici iğne uygulayın.`
              : `Head Physio Rating: ${physioRating}/100 · Manage injured stars and high fatigue risk.`}
          </p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-[#111b21] border border-white/10 text-xs font-mono-num">
          <span className="text-slate-400">{tr ? 'Revirdeki Oyuncu: ' : 'Injured: '}</span>
          <span className="font-bold text-red-400">{injured.length}</span>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-[#0a1128] border border-[#00e5ff]/50 text-xs text-white flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[#b7ff4a] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-4">
        <h3 className="font-display font-bold text-base text-white">
          {tr ? 'Aktif Sakatlıklar (Revir)' : 'Active Injury Ward'}
        </h3>
        {injured.length === 0 ? (
          <div className="p-6 rounded-lg bg-[#080d11] text-center text-xs text-[#b7ff4a]">
            {tr ? 'Harika! Kulüp revirinde şu an sakat oyuncu bulunmuyor.' : 'No injured players in the ward.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {injured.map((p) => {
              const acted = actedIds.includes(p.id);
              return (
                <div key={p.id} className="p-4 rounded-xl bg-[#080d11] border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatarSvg appearance={p.appearance} size={42} />
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-white truncate">
                          {getPlayerDisplayName(p, licenseMode)}
                        </div>
                        <div className="text-xs text-red-300 truncate">
                          {p.injuryName ?? 'Kas Zorlanması'} · {p.injuredWeeks} {tr ? 'hafta' : 'wks'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-slate-300">{p.condition}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={acted}
                      onClick={() => {
                        const msg = onMedicalIntervention(p.id, 'REST');
                        setFeedback(msg);
                        setActedIds((prev) => [...prev, p.id]);
                      }}
                      className="py-2 px-3 rounded-lg bg-[#111b21] border border-[#00e5ff]/40 hover:bg-[#00e5ff] hover:text-[#080d11] disabled:opacity-40 text-xs font-bold text-[#00e5ff] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{tr ? 'Güvenli Rehabilitasyon' : 'Safe Rehab'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={acted}
                      onClick={() => {
                        const msg = onMedicalIntervention(p.id, 'INJECTION');
                        setFeedback(msg);
                        setActedIds((prev) => [...prev, p.id]);
                      }}
                      className="py-2 px-3 rounded-lg bg-red-500/15 border border-red-500/40 hover:bg-red-500 hover:text-white disabled:opacity-40 text-xs font-bold text-red-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Syringe className="w-3.5 h-3.5" />
                      <span>{tr ? 'Riskli Ağrı İğnesi' : 'Risky Injection'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
        <h3 className="font-display font-bold text-base text-white">
          {tr ? 'Yüksek Yorgunluk & Sakatlık Riski Taşıyanlar' : 'Fatigue & Injury Risk Watch'}
        </h3>
        {fatigued.length === 0 ? (
          <p className="text-xs text-slate-400">
            {tr ? 'Tüm sağlam oyuncuların kondisyonu %78 üzerinde.' : 'All fit players above 78% condition.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {fatigued.map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-[#080d11] border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-white">{getPlayerDisplayName(p, licenseMode)}</div>
                  <div className="text-slate-400">{p.naturalRole} · OVR {p.ovr}</div>
                </div>
                <span className={`font-mono-num font-bold ${p.condition < 62 ? 'text-red-400' : 'text-amber-300'}`}>
                  %{p.condition}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface DevelopmentCenterScreenProps {
  club: Club;
  youthDirectorRating: number;
  mentoringPairs: MentoringPair[];
  licenseMode: LicenseMode;
  language: Language;
  onAddMentoringPair: (mentorId: string, menteeId: string) => void;
  onRemoveMentoringPair: (menteeId: string) => void;
}

export const DevelopmentCenterScreen: React.FC<DevelopmentCenterScreenProps> = ({
  club,
  youthDirectorRating,
  mentoringPairs,
  licenseMode,
  language,
  onAddMentoringPair,
  onRemoveMentoringPair,
}) => {
  const tr = language === 'tr';
  const youths = club.players.filter((p) => p.age <= 23).sort((a, b) => b.potential - a.potential);
  const veterans = club.players.filter((p) => p.age >= 27).sort((a, b) => b.ovr - a.ovr);

  const [selectedMentor, setSelectedMentor] = useState<string>(() => veterans[0]?.id ?? '');
  const [selectedMentee, setSelectedMentee] = useState<string>(() => youths[0]?.id ?? '');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'Gelişim Merkezi & U23 Akademi' : 'Youth Development & Mentoring'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `Akademi Direktörü Puanı: ${youthDirectorRating}/100 · Hardcore modda genç oyuncular maç süresi, yoğun idman ve kıdemli mentorlukla gelişir.`
              : `Youth Director: ${youthDirectorRating}/100 · Pair veterans with U23 prospects.`}
          </p>
        </div>
      </div>

      {/* Mentoring Pairing Box */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-display font-bold text-white">
          <Sparkles className="w-4 h-4 text-[#b7ff4a]" />
          <span>{tr ? 'Kıdemli → Genç Mentorluk Grubu Kur' : 'Veteran → Prospect Mentoring'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <select
            aria-label="Kıdemli Mentor"
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
          >
            {veterans.map((v) => (
              <option key={v.id} value={v.id}>
                Mentor: {getPlayerDisplayName(v, licenseMode)} ({v.age}y · {v.ovr} OVR)
              </option>
            ))}
          </select>

          <select
            aria-label="Genç Öğrenci"
            value={selectedMentee}
            onChange={(e) => setSelectedMentee(e.target.value)}
            className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-white"
          >
            {youths.map((y) => (
              <option key={y.id} value={y.id}>
                Genç: {getPlayerDisplayName(y, licenseMode)} ({y.age}y · {y.ovr}/{y.potential})
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!selectedMentor || !selectedMentee}
            onClick={() => {
              soundEngine.playSuccess();
              onAddMentoringPair(selectedMentor, selectedMentee);
            }}
            className="py-2 px-4 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] disabled:opacity-40 text-[#080d11] font-display font-bold cursor-pointer"
          >
            {tr ? 'Mentorluk Eşleştirmesi Ekle' : 'Create Mentoring Pair'}
          </button>
        </div>

        {mentoringPairs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {mentoringPairs.map((pair) => {
              const mentor = club.players.find((p) => p.id === pair.mentorId);
              const mentee = club.players.find((p) => p.id === pair.menteeId);
              if (!mentor || !mentee) return null;
              return (
                <div key={pair.menteeId} className="p-3 rounded-lg bg-[#080d11] border border-[#00e5ff]/35 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="text-[#00e5ff] font-semibold truncate">
                      {getPlayerDisplayName(mentor, licenseMode)}
                    </div>
                    <div className="text-slate-300 truncate">→ {getPlayerDisplayName(mentee, licenseMode)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveMentoringPair(pair.menteeId)}
                    className="text-slate-400 hover:text-red-400 text-[11px] cursor-pointer shrink-0"
                  >
                    {tr ? 'Kaldır' : 'Remove'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* U23 Prospect Progress Table */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400">
              <th className="py-3 px-4">{tr ? 'Genç Oyuncu (U23)' : 'U23 Prospect'}</th>
              <th className="py-3 px-3">{tr ? 'Mevki' : 'Pos'}</th>
              <th className="py-3 px-3 text-right font-mono-num">{tr ? 'Yaş' : 'Age'}</th>
              <th className="py-3 px-3 text-right font-mono-num">OVR / POT</th>
              <th className="py-3 px-4">{tr ? '+1 OVR Gelişim Çubuğu' : '+1 OVR Progress'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {youths.map((y) => {
              const pct = Math.min(100, Math.round(y.growthProgress * 100));
              const isMentored = mentoringPairs.some((m) => m.menteeId === y.id);
              return (
                <tr key={y.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{getPlayerDisplayName(y, licenseMode)}</span>
                      {isMentored && (
                        <span className="px-1.5 py-0.5 rounded bg-[#00e5ff]/15 text-[#00e5ff] text-[10px] font-bold">
                          MENTORLU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono-num font-bold text-[#00e5ff]">{y.naturalRole}</td>
                  <td className="py-3 px-3 text-right font-mono-num text-slate-300">{y.age}</td>
                  <td className="py-3 px-3 text-right font-mono-num">
                    <span className="text-[#b7ff4a] font-bold">{y.ovr}</span>
                    <span className="text-slate-400"> / {y.potential}</span>
                  </td>
                  <td className="py-3 px-4 w-64">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 h-2 rounded bg-[#080d11] overflow-hidden">
                        <div className="h-full bg-[#b7ff4a]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono-num text-slate-300 w-10 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface TeamReportScreenProps {
  club: Club;
  clubs: Club[];
  language: Language;
  onGoTransfers: () => void;
}

export const TeamReportScreen: React.FC<TeamReportScreenProps> = ({
  club,
  clubs,
  language,
  onGoTransfers,
}) => {
  const tr = language === 'tr';
  const report = useMemo(() => buildTeamReport(club, clubs), [club, clubs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#b7ff4a]" />
            <span>{tr ? 'Takım Raporu & Kadro Derinliği' : 'Team Report & Squad Depth'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? `Kadro Ort. OVR: ${report.avgOvr} · Yaş Ortalaması: ${report.avgAge} · Maaş Kullanımı: %${report.wageUsagePct}`
              : `Avg OVR ${report.avgOvr} · Avg Age ${report.avgAge} · Wage Cap ${report.wageUsagePct}%`}
          </p>
        </div>

        <button
          type="button"
          onClick={onGoTransfers}
          className="px-4 py-2 rounded-lg bg-[#17242c] hover:bg-[#b7ff4a] hover:text-[#080d11] text-xs font-display font-bold text-white cursor-pointer transition-colors"
        >
          {tr ? 'Eksik Bölgelere Transfer Yap →' : 'Reinforce Squad →'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {report.lines.map((line) => (
          <div key={line.group} className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-base text-white">{line.label}</span>
              <span className="text-amber-400 text-xs">{'★'.repeat(line.stars)}{'☆'.repeat(5 - line.stars)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#080d11]">
                <div className="text-slate-400">{tr ? 'Bizim Hat' : 'Club Avg'}</div>
                <div className="font-mono-num font-bold text-lg text-[#b7ff4a]">{line.avgOvr}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#080d11]">
                <div className="text-slate-400">{tr ? 'Lig Ort.' : 'League'}</div>
                <div className="font-mono-num font-bold text-lg text-[#00e5ff]">{line.leagueAvg}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              {tr ? `Kadroda ${line.count} oyuncu mevcut` : `${line.count} players available`}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl bg-[#111b21] border border-[#b7ff4a]/30 p-5 space-y-3">
          <div className="font-display font-bold text-base text-[#b7ff4a]">
            {tr ? 'Takımın Güçlü Yönleri' : 'Team Strengths'}
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#b7ff4a] shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[#111b21] border border-amber-400/30 p-5 space-y-3">
          <div className="font-display font-bold text-base text-amber-300">
            {tr ? 'Dikkat Edilmesi Gereken Alanlar' : 'Weaknesses & Risks'}
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const STAFF_ROLE_LABELS: Record<StaffRole, { tr: string; en: string; effectTr: string }> = {
  ASSISTANT: { tr: 'Yardımcı Antrenör', en: 'Assistant Manager', effectTr: 'Taktik bilgi (0-100), maç & tatil yönetimi' },
  FITNESS: { tr: 'Kondisyon Antrenörü', en: 'Fitness Coach', effectTr: 'Kondisyon toparlanma & sakatlık önleme' },
  GK_COACH: { tr: 'Kaleci Antrenörü', en: 'Goalkeeper Coach', effectTr: 'Kaleci refleks & kurtarış gelişimi' },
  CHIEF_SCOUT: { tr: 'Baş Gözlemci', en: 'Chief Scout', effectTr: 'Gözlemci raporu isabet oranı' },
  HEAD_PHYSIO: { tr: 'Baş Fizyoterapist', en: 'Head Physio', effectTr: 'Rehabilitasyon hızı & kondisyon koruma' },
  DOCTOR: { tr: 'Kulüp Doktoru', en: 'Club Doctor', effectTr: 'Ağır sakatlık tedavisi & risk analizi' },
  YOUTH_DIRECTOR: { tr: 'Altyapı Direktörü', en: 'Youth Director', effectTr: 'U23 genç oyuncu OVR gelişim hızı' },
};

interface StaffScreenProps {
  club: Club;
  staff: StaffMember[];
  staffMarket: StaffMember[];
  licenseMode?: LicenseMode;
  language: Language;
  onHireStaff: (candidate: StaffMember) => void;
}

export const StaffScreen: React.FC<StaffScreenProps> = ({
  club,
  staff,
  staffMarket,
  licenseMode = 'NO_DATA',
  language,
  onHireStaff,
}) => {
  const tr = language === 'tr';
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [query, setQuery] = useState('');

  const roleCounts = useMemo(() => {
    const counts: Record<StaffRole, number> = {
      ASSISTANT: 0,
      FITNESS: 0,
      GK_COACH: 0,
      CHIEF_SCOUT: 0,
      HEAD_PHYSIO: 0,
      DOCTOR: 0,
      YOUTH_DIRECTOR: 0,
    };
    for (const c of staffMarket) counts[c.role]++;
    return counts;
  }, [staffMarket]);

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staffMarket.filter((c) => {
      if (roleFilter !== 'ALL' && c.role !== roleFilter) return false;
      if (q) {
        const name = getStaffDisplayName(c, licenseMode).toLowerCase();
        const nat = c.nationality.toLowerCase();
        const spec = c.specialty.toLowerCase();
        if (!name.includes(q) && !nat.includes(q) && !spec.includes(q)) return false;
      }
      return true;
    });
  }, [staffMarket, roleFilter, query, licenseMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'Kulüp Çalışanları & Personel Arama' : 'Club Staff & Recruitment'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? 'Mevcut teknik ekibinizi yönetin ve yeni uzman personel imzalayarak antrenman, sağlık ve gözlemcilik kalitenizi yükseltin.'
              : 'Upgrade coaching, medical, fitness, scouting, and youth staff.'}
          </p>
        </div>
        <div className="text-xs font-mono-num">
          <span className="text-slate-400">{tr ? 'Transfer Bütçesi: ' : 'Budget: '}</span>
          <span className="text-[#b7ff4a] font-bold">{formatMoney(club.transferBudget)}</span>
        </div>
      </div>

      {/* Current Backroom Staff */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((st) => (
          <div key={st.id} className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-[#00e5ff] uppercase">
                  {tr ? STAFF_ROLE_LABELS[st.role].tr : STAFF_ROLE_LABELS[st.role].en}
                </div>
                <div className="font-display font-bold text-lg text-white mt-0.5">
                  {getStaffDisplayName(st, licenseMode)}
                </div>
                <div className="text-xs text-slate-400">{st.nationality} · {st.age} {tr ? 'Yaş' : 'yrs'}</div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-[#080d11] border border-[#b7ff4a]/40 font-mono-num font-bold text-base text-[#b7ff4a]">
                {st.rating}
              </div>
            </div>
            <div className="text-xs text-slate-300">{st.specialty}</div>
            <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
              <span>{STAFF_ROLE_LABELS[st.role].effectTr}</span>
              <span className="font-mono-num text-white shrink-0">{formatMoney(st.weeklyWage)}/hf</span>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Search & Hiring Pool */}
      <div className="rounded-xl bg-[#111b21] border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-white">
            <Briefcase className="w-5 h-5 text-[#b7ff4a]" />
            <span>
              {tr
                ? `Personel Arama & İmza Havuzu (${filteredCandidates.length}/${staffMarket.length})`
                : `Available Staff Market (${filteredCandidates.length}/${staffMarket.length})`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label={tr ? 'Personel Ara' : 'Search Staff'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr ? 'İsim, uyruk veya uzmanlık ara...' : 'Search name, country, specialty...'}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080d11] border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#b7ff4a]"
              />
            </div>
            <select
              aria-label="Personel Rolü"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | StaffRole)}
              className="rounded-lg bg-[#080d11] border border-white/15 px-3 py-2 text-xs text-white"
            >
              <option value="ALL">{tr ? `Tüm Pozisyonlar (${staffMarket.length})` : `All Roles (${staffMarket.length})`}</option>
              {(Object.keys(STAFF_ROLE_LABELS) as StaffRole[]).map((r) => (
                <option key={r} value={r}>
                  {tr ? STAFF_ROLE_LABELS[r].tr : STAFF_ROLE_LABELS[r].en} ({roleCounts[r]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
              roleFilter === 'ALL'
                ? 'bg-[#b7ff4a] text-[#080d11] border-[#b7ff4a] font-bold'
                : 'bg-[#080d11] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            {tr ? `Tümü (${staffMarket.length})` : `All (${staffMarket.length})`}
          </button>
          {(Object.keys(STAFF_ROLE_LABELS) as StaffRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                roleFilter === r
                  ? 'bg-[#00e5ff] text-[#080d11] border-[#00e5ff] font-bold'
                  : 'bg-[#080d11] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              {tr ? STAFF_ROLE_LABELS[r].tr : STAFF_ROLE_LABELS[r].en} ({roleCounts[r]})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCandidates.map((cand) => {
            const signingFee = cand.weeklyWage * 14;
            const canAfford = club.transferBudget >= signingFee;
            return (
              <div key={cand.id} className="p-4 rounded-xl bg-[#080d11] border border-white/10 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-[#00e5ff]">
                        {tr ? STAFF_ROLE_LABELS[cand.role].tr : STAFF_ROLE_LABELS[cand.role].en}
                      </div>
                      <div className="font-display font-bold text-base text-white">
                        {getStaffDisplayName(cand, licenseMode)}
                      </div>
                      <div className="text-[11px] text-slate-400">{cand.nationality} · {cand.age} {tr ? 'Yaş' : 'yrs'}</div>
                    </div>
                    <span className="font-mono-num font-bold text-sm px-2 py-0.5 rounded bg-[#111b21] text-[#b7ff4a]">
                      {cand.rating}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{cand.specialty}</p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">{tr ? 'Tazminat / Maaş' : 'Fee / Wage'}</div>
                    <div className="font-mono-num text-white">
                      {formatMoney(signingFee)} · {formatMoney(cand.weeklyWage)}/hf
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      soundEngine.playSuccess();
                      onHireStaff(cand);
                    }}
                    className="px-3 py-2 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] disabled:opacity-35 text-[#080d11] font-display font-bold cursor-pointer whitespace-nowrap"
                  >
                    {tr ? 'Göreve Getir' : 'Hire'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
