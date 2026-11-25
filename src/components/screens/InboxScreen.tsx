import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  Search,
  ShieldAlert,
  Star,
  Stethoscope,
  Trash2,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { soundEngine } from '../../engine/audio';
import { AppScreen, InboxCategory, InboxMessage, Language } from '../../engine/types';

interface InboxScreenProps {
  messages: InboxMessage[];
  language: Language;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onToggleStar: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onResolveDecision: (id: string, decision: 'APPROVE' | 'REJECT') => void;
  onNavigate: (screen: AppScreen) => void;
}

const CATEGORY_META: Record<
  InboxCategory,
  { labelTr: string; labelEn: string; color: string }
> = {
  BOARD: { labelTr: 'Yönetim', labelEn: 'Board', color: 'text-[#b7ff4a]' },
  MEDICAL: { labelTr: 'Sağlık / Revir', labelEn: 'Medical', color: 'text-red-400' },
  MATCH: { labelTr: 'Maç & Taktik', labelEn: 'Match & Tactics', color: 'text-[#00e5ff]' },
  TRANSFER: { labelTr: 'Transfer', labelEn: 'Transfer', color: 'text-amber-300' },
  SCOUT: { labelTr: 'Gözlemci', labelEn: 'Scouting', color: 'text-emerald-300' },
  EUROPE: { labelTr: 'Avrupa Kupaları', labelEn: 'European Cups', color: 'text-indigo-300' },
  NATIONAL: { labelTr: 'Milli Takım', labelEn: 'National Team', color: 'text-sky-300' },
  MEDIA: { labelTr: 'Basın & Medya', labelEn: 'Media & Press', color: 'text-cyan-300' },
  HOLIDAY: { labelTr: 'Tatil Raporu', labelEn: 'Holiday Report', color: 'text-emerald-400' },
  SEASON: { labelTr: 'Sezon Özeti', labelEn: 'Season Review', color: 'text-amber-400' },
  STAFF: { labelTr: 'Kulüp Personeli', labelEn: 'Club Staff', color: 'text-purple-300' },
};

function getCategoryIcon(cat: InboxCategory) {
  switch (cat) {
    case 'MEDICAL':
      return <Stethoscope className="w-4 h-4 text-red-400 shrink-0" />;
    case 'BOARD':
      return <ShieldAlert className="w-4 h-4 text-[#b7ff4a] shrink-0" />;
    case 'TRANSFER':
    case 'SCOUT':
      return <UserPlus className="w-4 h-4 text-amber-300 shrink-0" />;
    case 'MATCH':
    default:
      return <Trophy className="w-4 h-4 text-[#00e5ff] shrink-0" />;
  }
}

export const InboxScreen: React.FC<InboxScreenProps> = ({
  messages,
  language,
  onMarkRead,
  onMarkAllRead,
  onToggleStar,
  onDeleteMessage,
  onResolveDecision,
  onNavigate,
}) => {
  const tr = language === 'tr';
  const [filter, setFilter] = useState<'ALL' | 'STARRED' | InboxCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => messages[0]?.id ?? null);

  const unreadCount = useMemo(() => messages.filter((m) => !m.read).length, [messages]);
  const starredCount = useMemo(() => messages.filter((m) => m.starred).length, [messages]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'STARRED' && !m.starred) return false;
      if (filter !== 'ALL' && filter !== 'STARRED' && m.category !== filter) return false;
      if (q) {
        const hay = `${m.sender} ${m.senderRole} ${m.subject} ${m.body}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messages, filter, searchQuery]);

  const activeMessage = useMemo(() => {
    return (
      filtered.find((m) => m.id === selectedId) ??
      filtered[0] ??
      messages.find((m) => m.id === selectedId) ??
      messages[0] ??
      null
    );
  }, [filtered, messages, selectedId]);

  const handleSelectMessage = (msg: InboxMessage) => {
    soundEngine.playClick();
    setSelectedId(msg.id);
    if (!msg.read) {
      onMarkRead(msg.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-[#00e5ff]" />
            <span>{tr ? 'Gelen Kutusu' : 'Manager Inbox'}</span>
            {unreadCount > 0 && (
              <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-[#b7ff4a] text-[#080d11]">
                {unreadCount} {tr ? 'Okunmamış' : 'Unread'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr
              ? 'Yönetim kurulu, sağlık ekibi, gözlemciler ve karar bekleyen kulüp yazışmaları.'
              : 'Direct dispatches from the board, medical staff, scouts, and club decisions.'}
          </p>
        </div>

        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={() => {
            soundEngine.playClick();
            onMarkAllRead();
          }}
          className="px-4 py-2 rounded-lg bg-[#111b21] hover:bg-[#17242c] border border-white/15 disabled:opacity-40 text-xs font-medium text-white flex items-center gap-2 cursor-pointer transition-colors"
        >
          <CheckCheck className="w-4 h-4 text-[#b7ff4a]" />
          <span>{tr ? 'Tümünü Okundu İşaretle' : 'Mark All Read'}</span>
        </button>
      </div>

      {/* Category Filter Strip + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['ALL', tr ? 'Tümü' : 'All', messages.length],
              ['STARRED', tr ? 'Yıldızlı' : 'Starred', starredCount],
              ['BOARD', tr ? 'Yönetim' : 'Board', messages.filter((m) => m.category === 'BOARD').length],
              ['MEDICAL', tr ? 'Sağlık / Revir' : 'Medical', messages.filter((m) => m.category === 'MEDICAL').length],
              ['MATCH', tr ? 'Maç & Taktik' : 'Match', messages.filter((m) => m.category === 'MATCH').length],
              ['SCOUT', tr ? 'Gözlemci' : 'Scouting', messages.filter((m) => m.category === 'SCOUT').length],
              ['TRANSFER', tr ? 'Transfer' : 'Transfers', messages.filter((m) => m.category === 'TRANSFER').length],
            ] as Array<['ALL' | 'STARRED' | InboxCategory, string, number]>
          ).map(([cat, lbl, count]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                filter === cat
                  ? 'bg-[#b7ff4a] text-[#080d11] font-bold'
                  : 'bg-[#111b21] text-slate-300 border border-white/10 hover:text-white'
              }`}
            >
              {cat === 'STARRED' && <Star className="w-3.5 h-3.5 fill-current" />}
              <span>{lbl}</span>
              <span className="font-mono-num opacity-75">{count}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr ? 'Mesajlarda ara...' : 'Search inbox...'}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111b21] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00e5ff]"
          />
        </div>
      </div>

      {/* Two-Pane FM26 Correspondence Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left List */}
        <div className="lg:col-span-5 rounded-xl bg-[#111b21] border border-white/10 overflow-hidden flex flex-col max-h-[600px]">
          <div className="px-4 py-3 border-b border-white/10 text-xs font-semibold text-slate-400 flex justify-between">
            <span>{tr ? 'Mesajlar' : 'Messages'}</span>
            <span className="font-mono-num">{filtered.length}</span>
          </div>

          <div className="divide-y divide-white/5 overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {tr ? 'Bu kriterlere uygun mesaj bulunmuyor.' : 'No messages match this filter.'}
              </div>
            ) : (
              filtered.map((msg) => {
                const isSelected = activeMessage?.id === msg.id;
                const meta = CATEGORY_META[msg.category];
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#0a1128]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!msg.read ? (
                          <span className="w-2 h-2 rounded-full bg-[#b7ff4a] shrink-0" aria-label="Okunmadı" />
                        ) : (
                          <MailOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className={`font-semibold truncate ${meta.color}`}>
                          {tr ? meta.labelTr : meta.labelEn}
                        </span>
                        {msg.urgent && (
                          <span className="text-[10px] font-bold text-red-400 uppercase">· ACİL</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {msg.starred && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                        <span className="font-mono-num text-slate-500">
                          {tr ? `Hafta ${msg.week}` : `W${msg.week}`}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-1.5 text-sm truncate ${
                        !msg.read ? 'font-bold text-white' : 'font-medium text-slate-200'
                      }`}
                    >
                      {msg.subject}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate">{msg.sender}</span>
                      <span className="truncate text-slate-500">{msg.senderRole}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Reader */}
        <div className="lg:col-span-7 rounded-xl bg-[#111b21] border border-white/10 p-6 flex flex-col justify-between min-h-[420px]">
          {activeMessage ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#080d11] border border-white/10 flex items-center justify-center shrink-0">
                    {getCategoryIcon(activeMessage.category)}
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">
                      <strong className="text-white">{activeMessage.sender}</strong> · {activeMessage.senderRole}
                    </div>
                    <h3 className="font-display font-bold text-xl text-white mt-1">
                      {activeMessage.subject}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleStar(activeMessage.id)}
                    aria-label={activeMessage.starred ? 'Yıldızı Kaldır' : 'Yıldızla'}
                    className={`p-2 rounded-lg bg-[#080d11] border border-white/10 cursor-pointer ${
                      activeMessage.starred ? 'text-amber-400 border-amber-400/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${activeMessage.starred ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(activeMessage.id)}
                    aria-label="Mesajı Sil"
                    className="p-2 rounded-lg bg-[#080d11] border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-400/40 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="text-xs font-mono-num text-[#00e5ff] bg-[#080d11] border border-white/10 px-3 py-1.5 rounded-lg">
                    {tr ? `Hafta ${activeMessage.week}` : `Week ${activeMessage.week}`}
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {activeMessage.body}
              </div>

              {activeMessage.decisionType && (
                <div className="p-4 rounded-xl bg-[#080d11] border border-[#00e5ff]/35 space-y-3">
                  <div className="text-xs font-bold text-[#00e5ff]">
                    {tr ? 'Yönetim / Sağlık Kararı Bekleniyor' : 'Decision Required'}
                  </div>
                  {activeMessage.decisionDone ? (
                    <div className="text-xs text-[#b7ff4a] font-medium">
                      {tr ? '✓ Bu talep hakkında kararınız kulübe iletildi.' : '✓ Decision processed.'}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playSuccess();
                          onResolveDecision(activeMessage.id, 'APPROVE');
                        }}
                        className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] font-display font-bold text-xs cursor-pointer"
                      >
                        {activeMessage.decisionType === 'BOARD_BUDGET'
                          ? tr
                            ? 'Ek Transfer Bütçesi Talep Et (+%10)'
                            : 'Request Extra Budget (+10%)'
                          : tr
                          ? 'Sağlık Merkezinde İncele'
                          : 'Open Medical Center'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onResolveDecision(activeMessage.id, 'REJECT');
                        }}
                        className="px-4 py-2 rounded-lg bg-[#111b21] border border-white/15 text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        {activeMessage.decisionType === 'BOARD_BUDGET'
                          ? tr
                            ? 'Mevcut Bütçeyle Devam Et'
                            : 'Stick to Current Budget'
                          : tr
                          ? 'Standart İyileşme Planı'
                          : 'Standard Rest Plan'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeMessage.targetScreen && activeMessage.actionLabel && (
                <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (!activeMessage.read) onMarkRead(activeMessage.id);
                      onNavigate(activeMessage.targetScreen!);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-[#b7ff4a] hover:bg-[#c8ff70] text-[#080d11] font-display font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>{activeMessage.actionLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <Mail className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-medium text-white">
                {tr ? 'Gelen Kutunuz Boş' : 'Your Inbox is Empty'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {tr ? 'Yeni raporlar hafta ilerledikçe buraya düşecek.' : 'Weekly dispatches will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
