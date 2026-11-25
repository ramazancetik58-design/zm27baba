import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  LogOut,
  MessageSquare,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { getLeagueLabel } from '../engine/database';
import {
  evaluateBoardInterview,
  evaluateResignation,
  formatMoney,
  generateBoardInterview,
  getClubDisplayName,
  RESIGN_REASONS,
  ResignReasonOption,
} from '../engine/hardcoreRules';
import { Club, Language, LeagueId, LicenseMode, ManagerProfile } from '../engine/types';
import { ClubCrest } from './BrandArt';

interface ResignModalProps {
  club: Club;
  licenseMode: LicenseMode;
  language: Language;
  onClose: () => void;
  onConfirmResign: (reasonLabel: string, customNote: string, repImpact: number) => void;
}

export const ResignModal: React.FC<ResignModalProps> = ({
  club,
  licenseMode,
  language,
  onClose,
  onConfirmResign,
}) => {
  const tr = language === 'tr';
  const [selectedReason, setSelectedReason] = useState<ResignReasonOption['id']>('BUDGET');
  const [customNote, setCustomNote] = useState('');
  const [submittedEval, setSubmittedEval] = useState<ReturnType<typeof evaluateResignation> | null>(null);
  const clubName = getClubDisplayName(club, licenseMode);

  const handleSubmitToBoard = () => {
    soundEngine.playClick();
    setSubmittedEval(evaluateResignation(club, selectedReason, customNote, licenseMode));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={tr ? 'Kulüpten İstifa Et' : 'Resign from Club'}
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#111b21] border border-red-500/35 shadow-2xl overflow-hidden my-auto">
        <div className="p-4 sm:p-5 bg-[#0a1128] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ClubCrest club={club} licenseMode={licenseMode} size={44} />
            <div className="min-w-0">
              <div className="text-[11px] font-mono-num text-red-400 uppercase tracking-wider">
                {tr ? 'Yönetim Kurulu Acil Oturumu' : 'Emergency Board Session'}
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
                {clubName} — {tr ? 'İstifa Başvurusu' : 'Resignation Request'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#080d11] text-slate-400 hover:text-white cursor-pointer"
            aria-label={tr ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {!submittedEval ? (
            <>
              <div className="rounded-xl bg-[#080d11] border border-amber-400/25 p-3.5 text-xs text-slate-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    {tr
                      ? 'Yönetim Kurulu Neden İstifa Etmek İstediğinizi Soruyor'
                      : 'The Board Asks Why You Wish to Resign'}
                  </div>
                  <p className="text-slate-400 mt-1">
                    {tr
                      ? 'Seçtiğiniz gerekçe kulüp arşivine işlenecek ve işsiz kaldığınızda yapacağınız yeni kulüp mülakatlarında karşınıza çıkacaktır.'
                      : 'Your stated reason is recorded on your managerial dossier and impacts future board interviews.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {RESIGN_REASONS.map((r) => {
                  const active = selectedReason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedReason(r.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-red-500/15 border-red-400 text-white font-medium'
                          : 'bg-[#080d11] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {tr ? r.labelTr : r.labelEn}
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="resign-custom-note" className="block text-[11px] text-slate-400 mb-1.5">
                  {tr ? 'Yönetime Ek Açıklama (İsteğe Bağlı)' : 'Additional Note to the Board (Optional)'}
                </label>
                <textarea
                  id="resign-custom-note"
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={tr ? 'Örn: Kulübün menfaati için kan değişikliği gerekiyor...' : 'Optional statement...'}
                  className="w-full rounded-xl bg-[#080d11] border border-white/15 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#080d11] border border-white/15 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  {tr ? 'Göreve Devam Et' : 'Stay at Club'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitToBoard}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tr ? 'Gerekçeyi Yönetime Sun' : 'Submit Resignation Reason'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#080d11] border border-white/15 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00e5ff]">
                  <MessageSquare className="w-4 h-4" />
                  <span>{submittedEval.boardReactionTitle}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{submittedEval.boardReactionBody}</p>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-white/10">
                  {tr ? 'Resmi Gerekçe: ' : 'Official Reason: '}
                  <span className="text-white font-medium">{submittedEval.reasonLabel}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#080d11] border border-white/15 text-xs text-slate-300 cursor-pointer"
                >
                  {tr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onConfirmResign(submittedEval.reasonLabel, customNote.trim(), submittedEval.repImpact);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tr ? 'İstifayı Onayla & İşsiz Kal' : 'Confirm Resignation'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BoardInterviewModalProps {
  club: Club;
  leagueId: LeagueId;
  manager: ManagerProfile;
  licenseMode: LicenseMode;
  language: Language;
  onClose: () => void;
  onHireSuccess: (clubId: string, leagueId: LeagueId) => void;
}

export const BoardInterviewModal: React.FC<BoardInterviewModalProps> = ({
  club,
  leagueId,
  manager,
  licenseMode,
  language,
  onClose,
  onHireSuccess,
}) => {
  const tr = language === 'tr';
  const questions = useMemo(() => generateBoardInterview(club, manager, leagueId), [club, manager, leagueId]);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<ReturnType<typeof evaluateBoardInterview> | null>(null);

  const clubName = getClubDisplayName(club, licenseMode);
  const currentQ = questions[stepIdx];

  const handlePickOption = (optIndex: number) => {
    const nextAnswers = [...answers, optIndex];
    setAnswers(nextAnswers);
    if (stepIdx + 1 < questions.length) {
      soundEngine.playClick();
      setStepIdx(stepIdx + 1);
    } else {
      const result = evaluateBoardInterview(club, manager, nextAnswers, leagueId);
      if (result.accepted) soundEngine.playSuccess();
      else soundEngine.playReject();
      setVerdict(result);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={tr ? 'Yönetim İş Görüşmesi' : 'Board Job Interview'}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#111b21] border border-[#00e5ff]/35 shadow-2xl overflow-hidden my-auto">
        <div className="p-4 sm:p-5 bg-[#0a1128] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ClubCrest club={club} licenseMode={licenseMode} size={48} />
            <div className="min-w-0">
              <div className="text-[11px] font-mono-num text-[#00e5ff] uppercase tracking-wider">
                {getLeagueLabel(leagueId)} · {tr ? 'Yönetim İş Görüşmesi' : 'Boardroom Interview'}
              </div>
              <h3 className="font-display font-bold text-lg text-white truncate">{clubName}</h3>
              <div className="text-[11px] text-slate-400">
                {tr ? 'Hedef' : 'Target'}: {club.boardExpectation} ·{' '}
                <span className="text-[#b7ff4a] font-mono-num">
                  Rep {club.reputation} | {formatMoney(club.transferBudget)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#080d11] text-slate-400 hover:text-white cursor-pointer"
            aria-label={tr ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {!verdict ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Briefcase className="w-4 h-4 text-[#00e5ff]" />
                  <span>
                    {tr ? 'Soru' : 'Question'} {stepIdx + 1} / {questions.length}
                  </span>
                </div>
                <span className="font-mono-num text-[11px] text-slate-400">
                  {tr ? 'Menajer İtibarı' : 'Manager Rep'}: <strong className="text-white">{manager.reputation}</strong>
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-[#080d11] overflow-hidden">
                <div
                  className="h-full bg-[#00e5ff] transition-all"
                  style={{ width: `${((stepIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              <div className="rounded-xl bg-[#080d11] border border-white/10 p-4 space-y-2">
                <div className="text-[11px] font-mono-num text-[#b7ff4a]">
                  {currentQ.interviewer} · {currentQ.roleTr}
                </div>
                <p className="text-sm font-medium text-white leading-relaxed">{currentQ.questionTr}</p>
              </div>

              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickOption(idx)}
                    className="w-full text-left p-3.5 rounded-xl bg-[#080d11] hover:bg-[#17242c] border border-white/10 hover:border-[#00e5ff]/60 text-xs sm:text-sm text-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <span>{opt.labelTr}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-xl p-4 border space-y-2 ${
                  verdict.accepted
                    ? 'bg-[#b7ff4a]/10 border-[#b7ff4a]/45'
                    : 'bg-red-500/10 border-red-500/40'
                }`}
              >
                <div className="flex items-center gap-2 font-display font-bold text-base text-white">
                  {verdict.accepted ? (
                    <CheckCircle2 className="w-5 h-5 text-[#b7ff4a]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span>{verdict.verdictTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{verdict.boardMessage}</p>
                {!verdict.accepted && (
                  <div className="flex items-center gap-2 text-[11px] text-amber-300 pt-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      {tr
                        ? 'İpucu: Orta veya alt sıra bir kulüpte maç kazanarak itibarınızı yükselttikten sonra büyük kulüplere tekrar başvurabilirsiniz.'
                        : 'Tip: Build your reputation at a smaller club before re-applying to elite boards.'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                {verdict.accepted ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSuccess();
                      onHireSuccess(club.id, leagueId);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    {tr ? 'Sözleşmeyi İmzala & Göreve Başla' : 'Sign Contract & Start'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#080d11] border border-white/15 text-xs font-medium text-white cursor-pointer"
                  >
                    {tr ? 'Diğer İş Fırsatlarına Dön' : 'Back to Job Market'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
