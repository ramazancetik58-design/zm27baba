import { generateRoundRobinFixtures, getLeagueMeta } from './database';
import { computeStandings, getClubDisplayName, getPlayerDisplayName } from './hardcoreRules';
import {
  Club,
  ClubVisionEvaluation,
  DynamicPressQuestion,
  Fixture,
  HolidayConfig,
  HolidayMatchSummary,
  HolidaySummaryReport,
  InboxMessage,
  LeagueId,
  LicenseMode,
  MAX_CAREER_SEASONS,
  ManagerProfile,
  Player,
  PlayerRole,
  PressAnswerImpact,
  SeasonHistoryEntry,
  StaffMember,
  TacticsConfig,
  WORLD_SEED,
} from './types';

export function formatSeasonLabel(seasonNumber: number): string {
  const clamped = Math.max(1, Math.min(MAX_CAREER_SEASONS, Math.floor(seasonNumber)));
  const startYear = 2025 + clamped; // season 1 => 2026-27
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

export function deterministicUnitRandom(seedInput: string): number {
  let h = WORLD_SEED >>> 0;
  for (let i = 0; i < seedInput.length; i++) {
    h = Math.imul(h ^ seedInput.charCodeAt(i), 2654435761) >>> 0;
  }
  h = (h ^ (h >>> 16)) >>> 0;
  return (h % 10000) / 10000;
}

export function getAssistantStaff(staff: StaffMember[]): StaffMember | null {
  return staff.find((s) => s.role === 'ASSISTANT') ?? null;
}

export function getAssistantTacticalKnowledge(staff: StaffMember[]): number {
  const assistant = getAssistantStaff(staff);
  if (!assistant) return 42;
  if (typeof assistant.tacticalKnowledge === 'number') {
    return Math.max(0, Math.min(100, Math.round(assistant.tacticalKnowledge)));
  }
  return Math.max(35, Math.min(98, Math.round(assistant.rating)));
}

export function evaluateAssistantTacticalImpact(tacticalKnowledge: number): {
  strengthModifier: number;
  errorRisk: number;
  summaryTr: string;
} {
  const tk = Math.max(0, Math.min(100, tacticalKnowledge));
  if (tk >= 82) {
    return {
      strengthModifier: 1.03,
      errorRisk: 0.04,
      summaryTr: `Asistan Menajer taktik bilginizi (${tk}/100) sahaya kusursuz yansıttı ve doğru hamleler yaptı.`,
    };
  }
  if (tk >= 65) {
    return {
      strengthModifier: 1.0,
      errorRisk: 0.11,
      summaryTr: `Asistan Menajer (${tk}/100) oyun planına sadık kaldı, dengeli bir yönetim sergiledi.`,
    };
  }
  return {
    strengthModifier: 0.94,
    errorRisk: 0.24,
    summaryTr: `Asistan Menajer (${tk}/100) maç içi geçişlerde ve oyuncu değişikliklerinde zaman zaman aksadı.`,
  };
}

const REGEN_FIRST_NAMES = [
  'Arda', 'Kerem', 'Yusuf', 'Emre', 'Can', 'Mert', 'Kaan', 'Efe',
  'Luka', 'Mateo', 'Lucas', 'Noah', 'Hugo', 'Leo', 'Liam', 'enzo',
];
const REGEN_LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Öztürk', 'Aydın', 'Arslan',
  'Silva', 'Moreau', 'Vries', 'Peeters', 'Rossi', 'Weber', 'Navarro', 'Bauer',
];

function createYouthRegen(
  club: Club,
  role: PlayerRole,
  seasonNumber: number,
  index: number
): Player {
  const seedKey = `${WORLD_SEED}_regen_${club.id}_s${seasonNumber}_${index}_${role}`;
  const r1 = deterministicUnitRandom(`${seedKey}_a`);
  const r2 = deterministicUnitRandom(`${seedKey}_b`);
  const r3 = deterministicUnitRandom(`${seedKey}_c`);

  const first = REGEN_FIRST_NAMES[Math.floor(r1 * REGEN_FIRST_NAMES.length)];
  const last = REGEN_LAST_NAMES[Math.floor(r2 * REGEN_LAST_NAMES.length)];
  const capFirst = first.charAt(0).toUpperCase() + first.slice(1);
  const fullName = `${capFirst} ${last}`;
  const shortName = `${capFirst.charAt(0)}. ${last}`;

  const age = 16 + Math.floor(r3 * 3); // 16-18
  const baseOvr = Math.max(58, Math.min(73, Math.round(club.reputation * 0.72 + (r1 * 8 - 2))));
  const potential = Math.max(baseOvr + 6, Math.min(94, Math.round(baseOvr + 10 + r2 * 14)));
  const posGroup =
    role === 'GK' ? 'GK' : role === 'LB' || role === 'CB' || role === 'RB' ? 'DEF' : role === 'LW' || role === 'RW' || role === 'ST' ? 'FWD' : 'MID';

  const id = `regen_${club.id}_s${seasonNumber}_${index}_${Math.floor(r1 * 99999)}`;
  return {
    id,
    fictionalName: shortName,
    realName: fullName,
    age,
    nationality: club.leagueId.startsWith('TR') || club.leagueId === 'SUPER_LIG' ? 'TUR' : 'EUR',
    naturalRole: role,
    positionGroup: posGroup,
    ovr: baseOvr,
    potential,
    growthProgress: 0,
    condition: 94,
    morale: 76,
    sharpness: 70,
    injuredWeeks: 0,
    injuryName: null,
    marketValue: Math.round(baseOvr * baseOvr * 140),
    weeklyWage: Math.max(1500, Math.round(baseOvr * 110)),
    contractYears: 4,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    shirtNumber: 40 + ((index + seasonNumber) % 55),
    attributes: {
      pace: Math.min(95, baseOvr + 4),
      shooting: Math.min(95, posGroup === 'FWD' ? baseOvr + 3 : baseOvr - 4),
      passing: Math.min(95, posGroup === 'MID' ? baseOvr + 4 : baseOvr - 1),
      dribbling: Math.min(95, baseOvr + 1),
      defending: Math.min(95, posGroup === 'DEF' ? baseOvr + 4 : baseOvr - 8),
      physical: Math.min(95, baseOvr - 2),
      stamina: Math.min(95, baseOvr + 3),
      goalkeeping: role === 'GK' ? baseOvr + 2 : 18,
    },
    trainingFocus: 'BALANCED',
    appearance: {
      skinTone: '#d9a78b',
      hairStyle: 'SHORT',
      hairColor: '#1f2937',
      facialHair: 'NONE',
      build: 'SLIM',
      bootColor: '#b7ff4a',
    },
  };
}

export interface SeasonRolloverInput {
  seasonNumber: number;
  leagueId: LeagueId;
  clubs: Club[];
  fixtures: Fixture[];
  userClubId: string | null;
  licenseMode: LicenseMode;
}

export interface SeasonRolloverResult {
  careerCompleted: boolean;
  nextSeasonNumber: number;
  nextSeasonLabel: string;
  updatedClubs: Club[];
  nextFixtures: Fixture[];
  historyEntry: SeasonHistoryEntry;
  inboxMessage: InboxMessage;
}

export function advanceSeasonRollover(input: SeasonRolloverInput): SeasonRolloverResult {
  const { seasonNumber, leagueId, clubs, fixtures, userClubId, licenseMode } = input;
  const seasonLabel = formatSeasonLabel(seasonNumber);
  const standings = computeStandings(clubs, fixtures);
  const championRow = standings[0];
  const championClub = clubs.find((c) => c.id === championRow?.clubId) ?? clubs[0];
  const championName = championClub ? getClubDisplayName(championClub, licenseMode) : 'Bilinmiyor';

  const userIndex = userClubId ? standings.findIndex((r) => r.clubId === userClubId) : -1;
  const userRow = userIndex >= 0 ? standings[userIndex] : null;
  const userClub = userClubId ? clubs.find((c) => c.id === userClubId) ?? null : null;

  let topScorerName = '—';
  let topScorerGoals = 0;
  for (const club of clubs) {
    for (const p of club.players) {
      if (p.goals > topScorerGoals) {
        topScorerGoals = p.goals;
        topScorerName = getPlayerDisplayName(p, licenseMode);
      }
    }
  }

  const trophiesWon: string[] = [];
  if (userClubId && championClub && championClub.id === userClubId) {
    trophiesWon.push(`${getLeagueMeta(leagueId).name} Şampiyonluğu (${seasonLabel})`);
  }

  let retiredCount = 0;
  let regensPromoted = 0;

  const updatedClubs: Club[] = clubs.map((club) => {
    const rank = standings.findIndex((s) => s.clubId === club.id) + 1;
    const prizeBonus = rank === 1 ? 14_000_000 : rank <= 4 ? 8_500_000 : rank <= 8 ? 4_500_000 : 2_000_000;
    const repDelta = rank === 1 ? 2 : rank <= 3 ? 1 : rank >= clubs.length - 2 ? -2 : 0;

    const nextPlayers: Player[] = [];
    const retiredRoles: PlayerRole[] = [];

    for (const p of club.players) {
      const nextAge = p.age + 1;
      const retireRoll = deterministicUnitRandom(`${WORLD_SEED}_ret_${p.id}_s${seasonNumber}`);
      const shouldRetire =
        nextAge >= 40 ||
        (nextAge >= 37 && retireRoll < 0.55) ||
        (nextAge >= 35 && retireRoll < 0.22);

      if (shouldRetire) {
        retiredCount++;
        retiredRoles.push(p.naturalRole);
        continue;
      }

      let ovrDelta = 0;
      if (nextAge <= 23 && p.ovr < p.potential) {
        ovrDelta = retireRoll > 0.35 ? 2 : 1;
      } else if (nextAge <= 28 && p.ovr < p.potential) {
        ovrDelta = retireRoll > 0.65 ? 1 : 0;
      } else if (nextAge >= 32) {
        ovrDelta = nextAge >= 35 ? -2 : -1;
      }

      const nextOvr = Math.max(55, Math.min(96, p.ovr + ovrDelta));
      nextPlayers.push({
        ...p,
        age: nextAge,
        ovr: nextOvr,
        condition: 96,
        sharpness: 76,
        injuredWeeks: 0,
        injuryName: null,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        contractYears: Math.max(1, p.contractYears - 1),
        marketValue: Math.max(250_000, Math.round(nextOvr * nextOvr * (nextAge <= 25 ? 210 : nextAge >= 32 ? 85 : 145))),
      });
    }

    // Replace retirees with deterministic youth regens
    retiredRoles.forEach((role, idx) => {
      nextPlayers.push(createYouthRegen(club, role, seasonNumber + 1, idx));
      regensPromoted++;
    });

    // Ensure minimum squad size of 18
    while (nextPlayers.length < 18) {
      const fallbackRole: PlayerRole = nextPlayers.length % 4 === 0 ? 'CB' : nextPlayers.length % 3 === 0 ? 'CM' : 'ST';
      nextPlayers.push(createYouthRegen(club, fallbackRole, seasonNumber + 1, nextPlayers.length));
      regensPromoted++;
    }

    return {
      ...club,
      reputation: Math.max(45, Math.min(98, club.reputation + repDelta)),
      cashBalance: club.cashBalance + prizeBonus,
      transferBudget: Math.max(1_500_000, Math.round(club.transferBudget * 0.45 + prizeBonus * 0.65)),
      boardConfidence: Math.max(50, Math.min(92, club.boardConfidence + (rank <= 4 ? 5 : 0))),
      players: nextPlayers,
    };
  });

  const historyEntry: SeasonHistoryEntry = {
    seasonNumber,
    seasonLabel,
    leagueId,
    clubId: userClubId,
    clubName: userClub ? getClubDisplayName(userClub, licenseMode) : 'Kulüpsüz',
    finalPosition: userIndex >= 0 ? userIndex + 1 : 0,
    points: userRow?.points ?? 0,
    won: userRow?.won ?? 0,
    drawn: userRow?.drawn ?? 0,
    lost: userRow?.lost ?? 0,
    championName,
    topScorerName,
    topScorerGoals,
    trophiesWon,
    retiredCount,
    regensPromoted,
  };

  const careerCompleted = seasonNumber >= MAX_CAREER_SEASONS;
  const nextSeasonNumber = careerCompleted ? MAX_CAREER_SEASONS : seasonNumber + 1;
  const nextSeasonLabel = formatSeasonLabel(nextSeasonNumber);
  const nextFixtures = careerCompleted ? fixtures : generateRoundRobinFixtures(updatedClubs);

  const inboxMessage: InboxMessage = {
    id: `season_rollover_${seasonNumber}_${leagueId}`,
    week: 1,
    sender: 'Lig Federasyonu & Kulüp Yönetimi',
    senderRole: 'Sezon Sonu Raporu',
    subject: careerCompleted
      ? `30 Sezonluk Efsane Kariyer Tamamlandı (${seasonLabel})`
      : `${seasonLabel} Sezonu Tamamlandı — ${nextSeasonLabel} Başlıyor!`,
    body: careerCompleted
      ? `${seasonLabel} sezonuyla birlikte 30 sezonluk Zephyr Manager 27 kariyeriniz tamamlandı. Son şampiyon: ${championName}. Gol kralı: ${topScorerName} (${topScorerGoals} gol).`
      : `${seasonLabel} sezonu sona erdi. Şampiyon: ${championName}. Gol kralı: ${topScorerName} (${topScorerGoals} gol). Lig genelinde ${retiredCount} futbolcu emekli oldu ve akademilerden ${regensPromoted} genç yetenek A takımlara yükseldi. ${nextSeasonLabel} fikstürü çekildi.`,
    category: 'SEASON',
    read: false,
    urgent: true,
  };

  return {
    careerCompleted,
    nextSeasonNumber,
    nextSeasonLabel,
    updatedClubs,
    nextFixtures,
    historyEntry,
    inboxMessage,
  };
}

export function evaluateClubVisionApplication(
  manager: ManagerProfile,
  targetClub: Club,
  seasonHistory: SeasonHistoryEntry[],
  licenseMode: LicenseMode
): ClubVisionEvaluation {
  const clubName = getClubDisplayName(targetClub, licenseMode);
  const winRate = manager.matchesManaged > 0 ? manager.wins / manager.matchesManaged : 0;
  const totalTrophies = manager.trophies + seasonHistory.reduce((acc, s) => acc + s.trophiesWon.length, 0);

  const score = Math.round(
    manager.reputation * 0.62 +
      Math.min(20, totalTrophies * 6) +
      Math.min(15, winRate * 18) +
      Math.min(10, manager.matchesManaged * 0.12)
  );
  const requiredScore = Math.max(38, Math.round(targetClub.reputation * 0.88 - 4));
  const accepted = score >= requiredScore;

  const clubVisionSummary = `${clubName} vizyonu: ${targetClub.boardExpectation} (Kulüp İtibarı: ${targetClub.reputation}/100)`;

  if (!accepted) {
    return {
      accepted: false,
      score,
      requiredScore,
      clubVisionSummary,
      reason: `Menajerlik puanınız (${score}) kulübün üst düzey kriterlerinin (${requiredScore}) altında kaldı.`,
      inboxSubject: `${clubName} — İş Başvurusu Değerlendirme Sonucu`,
      inboxBody: `Sayın ${manager.firstName} ${manager.lastName},\n\n${clubName} teknik direktörlük görevi için yaptığınız başvuruyu dikkatle değerlendirdik. Kulübümüzün mevcut hedefleri ve uluslararası vizyonu doğrultusunda, bu pozisyon için daha yüksek seviyede deneyim ve kanıtlanmış başarı geçmişine sahip adaylarla ilerleme kararı aldık.\n\nGelecekteki kariyerinizde başarılar dileriz.\n\n${clubName} Yönetim Kurulu`,
    };
  }

  return {
    accepted: true,
    score,
    requiredScore,
    clubVisionSummary,
    reason: `Kariyer geçmişiniz (${score}/${requiredScore}) kulüp vizyonuyla örtüştü.`,
    inboxSubject: `${clubName} — Teknik Direktörlük Teklifi Onaylandı!`,
    inboxBody: `Sayın ${manager.firstName} ${manager.lastName},\n\n${clubName} Yönetim Kurulu, kariyer istikrarınızı ve taktik vizyonunuzu değerlendirerek teknik direktörlük görevini size emanet etme kararı aldı. Yeni görevinizde başarılar dileriz.\n\n${clubName} Yönetim Kurulu`,
  };
}

const TURKISH_MEDIA_REPORTERS: Array<{
  outlet: 'Habertürk' | 'ATV Spor' | 'TRT Spor' | 'Fanatik';
  journalist: string;
}> = [
  { outlet: 'Habertürk', journalist: 'Yağız Sabuncuoğlu (Oyun İçi Medya)' },
  { outlet: 'TRT Spor', journalist: 'Ersin Düzen (Oyun İçi Medya)' },
  { outlet: 'ATV Spor', journalist: 'Murat Özbostan (Oyun İçi Medya)' },
  { outlet: 'Fanatik', journalist: 'Serdar Ali Çelikler (Oyun İçi Medya)' },
  { outlet: 'TRT Spor', journalist: 'Önder Özen (Oyun İçi Medya)' },
  { outlet: 'Habertürk', journalist: 'Mehmet Demirkol (Oyun İçi Medya)' },
  { outlet: 'Fanatik', journalist: 'Uğur Karakullukçu (Oyun İçi Medya)' },
  { outlet: 'ATV Spor', journalist: 'Reha Kapsal (Oyun İçi Medya)' },
];

export function generateDynamicPressConference(
  phase: 'PRE_MATCH' | 'POST_MATCH' | 'TRANSFER_IN' | 'TRANSFER_OUT',
  context: {
    week: number;
    seasonNumber: number;
    clubName: string;
    opponentName: string;
    questionIndex?: number;
    lastResult?: 'W' | 'D' | 'L';
    lastScore?: string;
    transferPlayerName?: string;
  }
): DynamicPressQuestion {
  const qIdx = Math.max(0, context.questionIndex ?? 0);
  const reporter = TURKISH_MEDIA_REPORTERS[(qIdx + context.week + context.seasonNumber) % TURKISH_MEDIA_REPORTERS.length];

  if (phase === 'TRANSFER_IN') {
    const pName = context.transferPlayerName || 'yeni transferiniz';
    const transferInQuestions = [
      `Hocam, ${pName} transferi camiada büyük heyecan yarattı. Bu oyuncudan kısa vadede ilk 11 katkısı mı bekliyorsunuz?`,
      `${pName} için ödenen maliyet sosyal medyada çok konuşuldu. ${context.clubName} oyun planında ona nasıl bir rol vereceksiniz?`,
    ];
    return {
      id: `press_tin_${context.seasonNumber}_${context.week}_${qIdx}`,
      phase: 'TRANSFER_IN',
      outlet: reporter.outlet,
      journalist: reporter.journalist,
      question: transferInQuestions[qIdx % transferInQuestions.length],
      options: [
        { id: 'opt_conf', tone: 'CONFIDENT', label: `${pName} sınıf atlatacak bir isim, doğrudan ilk 11 için hazır.` },
        { id: 'opt_humble', tone: 'HUMBLE', label: 'Takıma alışması için ona zaman tanıyacağız, potansiyeline güveniyoruz.' },
        { id: 'opt_press', tone: 'PRESSURE_OPP', label: 'Rakiplerimiz bu transferden sonra bize karşı planlarını değiştirmek zorunda.' },
        { id: 'opt_dip', tone: 'DIPLOMATIC', label: 'Scout ekibimiz ve yönetimimizle ortak karar aldık, kulübümüze hayırlı olsun.' },
      ],
    };
  }

  if (phase === 'TRANSFER_OUT') {
    const pName = context.transferPlayerName || 'ayrılan oyuncunuz';
    const transferOutQuestions = [
      `${pName} ile yolların ayrılması taraftarları ikiye böldü. Bu ayrılık kadro kalitenizi olumsuz etkiler mi?`,
      `Hocam, ${pName} satışından elde edilen geliri yeni bir yıldız transferi için mi kullanacaksınız?`,
    ];
    return {
      id: `press_tout_${context.seasonNumber}_${context.week}_${qIdx}`,
      phase: 'TRANSFER_OUT',
      outlet: reporter.outlet,
      journalist: reporter.journalist,
      question: transferOutQuestions[qIdx % transferOutQuestions.length],
      options: [
        { id: 'opt_conf', tone: 'CONFIDENT', label: 'Hiçbir oyuncu kulüpten büyük değildir, yerini fazlasıyla dolduracağız.' },
        { id: 'opt_humble', tone: 'HUMBLE', label: `${pName} kulübümüze çok emek verdi, yeni yolculuğunda başarılar diliyoruz.` },
        { id: 'opt_press', tone: 'PRESSURE_OPP', label: 'Ekonomik olarak çok akıllıca bir hamle yaptık, daha dinamik bir takım oluyoruz.' },
        { id: 'opt_dip', tone: 'DIPLOMATIC', label: 'Transfer bütçemizi ve maaş dengemizi korumak adına doğru bir karardı.' },
      ],
    };
  }

  if (phase === 'PRE_MATCH') {
    const preQuestions = [
      `Hocam, ${context.opponentName} maçı öncesi taraftarlar büyük bir beklenti içinde. ${context.clubName} sahaya nasıl bir oyun planıyla çıkacak?`,
      `${context.opponentName} son haftalarda tehlikeli hücum geçişleri yapıyor. Savunma çizginizi ve pres şiddetinizi bu maça özel değiştirecek misiniz?`,
      `Hafta içi idmanlarda takımın hırsı dikkat çekti. ${context.opponentName} karşısında ilk 11'de sürpriz bir tercih görecek miyiz?`,
    ];
    return {
      id: `press_pre_${context.seasonNumber}_${context.week}_${qIdx}`,
      phase: 'PRE_MATCH',
      outlet: reporter.outlet,
      journalist: reporter.journalist,
      question: preQuestions[qIdx % preQuestions.length],
      options: [
        { id: 'opt_conf', tone: 'CONFIDENT', label: 'Kendi oyunumuzu dikte edip 3 puanı alacağız, kimseden çekinmiyoruz.' },
        { id: 'opt_humble', tone: 'HUMBLE', label: `${context.opponentName} güçlü bir rakip, disiplinli ve sabırlı oynamalıyız.` },
        { id: 'opt_press', tone: 'PRESSURE_OPP', label: 'Asıl baskı onların üzerinde. Bizim aç kadromuz sürpriz yapmaya hazır.' },
        { id: 'opt_dip', tone: 'DIPLOMATIC', label: 'Hafta boyunca taktiksel olarak çok iyi çalıştık, sahada cevabı vereceğiz.' },
      ],
    };
  }

  const scoreText = context.lastScore ?? '0-0';
  const resultLead =
    context.lastResult === 'W'
      ? `${context.opponentName} karşısında alınan ${scoreText} galibiyet`
      : context.lastResult === 'L'
        ? `${context.opponentName} karşısında yaşanan ${scoreText} mağlubiyet`
        : `${context.opponentName} ile ${scoreText} berabere kalınan mücadele`;

  const postQuestions = [
    `${resultLead} sonrası soyunma odasında atmosfer nasıl? Taraftarın ve yönetimin beklentilerine nasıl yanıt veriyorsunuz?`,
    `Hocam, ${resultLead} maçında yaptığınız taktik hamleler çok konuşuldu. Takımın sahadaki reaksiyonundan memnun musunuz?`,
  ];

  return {
    id: `press_post_${context.seasonNumber}_${context.week}_${qIdx}`,
    phase: 'POST_MATCH',
    outlet: reporter.outlet,
    journalist: reporter.journalist,
    question: postQuestions[qIdx % postQuestions.length],
    options: [
      { id: 'opt_conf', tone: 'CONFIDENT', label: 'Oyuncularımın mücadelesinden gurur duyuyorum, bu takım hedeflerine ulaşacak.' },
      { id: 'opt_humble', tone: 'HUMBLE', label: 'Eksiklerimizi gördük, sorumluluk tamamen bana ait. Daha çok çalışacağız.' },
      { id: 'opt_press', tone: 'PRESSURE_OPP', label: 'Hakem kararları ve maç içi sertlik tempomuzu bozdu ama biz yolumuza bakıyoruz.' },
      { id: 'opt_dip', tone: 'DIPLOMATIC', label: 'Önümüzde uzun bir maraton var, bir sonraki haftaya odaklanıyoruz.' },
    ],
  };
}

export function evaluatePressAnswer(
  mode: 'PRESET' | 'CUSTOM' | 'SKIP',
  payload: {
    tone?: 'CONFIDENT' | 'HUMBLE' | 'PRESSURE_OPP' | 'DIPLOMATIC';
    customText?: string;
    outlet: string;
    clubName: string;
  }
): PressAnswerImpact {
  if (mode === 'SKIP') {
    return {
      moraleDelta: -1,
      fanSupportDelta: -3,
      boardConfidenceDelta: -2,
      mediaRelationsDelta: -6,
      headline: `${payload.outlet}: ${payload.clubName} teknik direktörü basın toplantısını yanıtsız bıraktı!`,
      reactionSummary: 'Basın mensupları soğuk tepki gösterdi; medya ilişkileri gerildi.',
    };
  }

  if (mode === 'CUSTOM') {
    const text = (payload.customText ?? '').trim();
    const lower = text.toLowerCase();
    const isAggressive =
      lower.includes('hakem') || lower.includes('skandal') || lower.includes('rezalet') || lower.includes('istifa');
    const isPositive =
      lower.includes('taraftar') || lower.includes('şampiyon') || lower.includes('kazan') || lower.includes('gurur') || lower.includes('takım');

    if (isAggressive) {
      return {
        moraleDelta: 1,
        fanSupportDelta: 2,
        boardConfidenceDelta: -3,
        mediaRelationsDelta: -4,
        headline: `${payload.outlet} SON DAKİKA: "${text.slice(0, 72)}"`,
        reactionSummary: 'Sert açıklamanız gündeme oturdu; taraftar hareketlendi ancak yönetim temkinli.',
      };
    }
    if (isPositive) {
      return {
        moraleDelta: 3,
        fanSupportDelta: 4,
        boardConfidenceDelta: 2,
        mediaRelationsDelta: 4,
        headline: `${payload.outlet}: ${payload.clubName} cephesinden camiayı kenetleyen mesaj!`,
        reactionSummary: 'Özgün ve yapıcı açıklamanız soyunma odasında ve tribünlerde olumlu yankı buldu.',
      };
    }
    return {
      moraleDelta: 1,
      fanSupportDelta: 1,
      boardConfidenceDelta: 1,
      mediaRelationsDelta: 2,
      headline: `${payload.outlet}: "${text.slice(0, 72) || 'Maça odaklandık.'}"`,
      reactionSummary: 'Dengeli açıklamanız basın tarafından olumlu karşılandı.',
    };
  }

  switch (payload.tone) {
    case 'CONFIDENT':
      return {
        moraleDelta: 3,
        fanSupportDelta: 3,
        boardConfidenceDelta: 1,
        mediaRelationsDelta: 2,
        headline: `${payload.outlet}: ${payload.clubName} hocasından iddialı çıkış!`,
        reactionSummary: 'Özgüvenli duruşunuz takımı ateşledi ve taraftarı heyecanlandırdı.',
      };
    case 'HUMBLE':
      return {
        moraleDelta: 1,
        fanSupportDelta: 1,
        boardConfidenceDelta: 2,
        mediaRelationsDelta: 4,
        headline: `${payload.outlet}: ${payload.clubName} cephesinde ayakları yere basan açıklamalar`,
        reactionSummary: 'Alçakgönüllü yaklaşımınız yönetim ve spor medyasından tam not aldı.',
      };
    case 'PRESSURE_OPP':
      return {
        moraleDelta: 2,
        fanSupportDelta: 3,
        boardConfidenceDelta: -1,
        mediaRelationsDelta: -1,
        headline: `${payload.outlet}: Akıl oyunları başladı! ${payload.clubName} baskıyı rakibe yıktı`,
        reactionSummary: 'Psikolojik hamleniz manşetlere taşındı.',
      };
    default:
      return {
        moraleDelta: 1,
        fanSupportDelta: 1,
        boardConfidenceDelta: 2,
        mediaRelationsDelta: 3,
        headline: `${payload.outlet}: ${payload.clubName} cephesinden soğukkanlı değerlendirme`,
        reactionSummary: 'Diplomatik yanıtınız kulüp içi huzuru korudu.',
      };
  }
}

export interface HolidaySimInput {
  config: HolidayConfig;
  seasonNumber: number;
  currentWeek: number;
  leagueId: LeagueId;
  clubs: Club[];
  fixtures: Fixture[];
  userClubId: string | null;
  tactics: TacticsConfig | null;
  staff: StaffMember[];
  licenseMode: LicenseMode;
  maxWeeksSafetyCap?: number;
}

export interface HolidaySimResult {
  seasonNumber: number;
  currentWeek: number;
  clubs: Club[];
  fixtures: Fixture[];
  seasonHistoryAdded: SeasonHistoryEntry[];
  careerCompleted: boolean;
  report: HolidaySummaryReport;
  inboxMessages: InboxMessage[];
}

function quickSimulateFixture(
  fixture: Fixture,
  clubs: Club[],
  userClubId: string | null,
  assistantModifier: number,
  seedPrefix: string
): Fixture {
  if (fixture.played) return fixture;
  const home = clubs.find((c) => c.id === fixture.homeClubId);
  const away = clubs.find((c) => c.id === fixture.awayClubId);
  if (!home || !away) return fixture;

  const homeBase = home.reputation * 1.04 * (home.id === userClubId ? assistantModifier : 1);
  const awayBase = away.reputation * 0.96 * (away.id === userClubId ? assistantModifier : 1);

  const r1 = deterministicUnitRandom(`${seedPrefix}_${fixture.id}_h`);
  const r2 = deterministicUnitRandom(`${seedPrefix}_${fixture.id}_a`);

  const diff = (homeBase - awayBase) / 18;
  const homeExpected = Math.max(0.25, 1.35 + diff * 0.55);
  const awayExpected = Math.max(0.2, 1.05 - diff * 0.45);

  const homeGoals = Math.max(0, Math.min(6, Math.round(homeExpected * (0.4 + r1 * 1.35))));
  const awayGoals = Math.max(0, Math.min(6, Math.round(awayExpected * (0.4 + r2 * 1.35))));

  return {
    ...fixture,
    played: true,
    homeGoals,
    awayGoals,
    homeXg: Number((homeExpected * (0.7 + r1 * 0.6)).toFixed(2)),
    awayXg: Number((awayExpected * (0.7 + r2 * 0.6)).toFixed(2)),
    homePossession: Math.max(35, Math.min(65, Math.round(50 + diff * 6))),
    homeShots: Math.max(homeGoals + 2, Math.round(7 + homeExpected * 4)),
    awayShots: Math.max(awayGoals + 2, Math.round(6 + awayExpected * 4)),
  };
}

export function runHolidaySimulation(input: HolidaySimInput): HolidaySimResult {
  const { config, leagueId, userClubId, staff, licenseMode } = input;
  const assistant = getAssistantStaff(staff);
  const assistantTK = getAssistantTacticalKnowledge(staff);
  const assistantImpact = evaluateAssistantTacticalImpact(
    config.useCurrentTactics ? assistantTK : Math.max(40, assistantTK - 8)
  );

  let seasonNumber = input.seasonNumber;
  let currentWeek = input.currentWeek;
  let clubs = input.clubs.map((c) => ({ ...c, players: c.players.map((p) => ({ ...p })) }));
  let fixtures = input.fixtures.map((f) => ({ ...f }));

  const startedSeasonLabel = formatSeasonLabel(seasonNumber);
  const seasonHistoryAdded: SeasonHistoryEntry[] = [];
  const matchLogs: HolidayMatchSummary[] = [];
  const injuriesOccurred: string[] = [];
  const transfersHandled: string[] = [];
  const jobOffersReceived: string[] = [];
  const inboxMessages: InboxMessage[] = [];

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let weeksSimulated = 0;
  let seasonsRolledOver = 0;
  let careerCompleted = false;
  let stopReason = 'Tatil süresi tamamlandı.';

  const totalWeeksInLeague = getLeagueMeta(leagueId).weeks;
  const maxWeeks =
    config.mode === 'DAYS'
      ? Math.max(1, Math.ceil(config.days / 7))
      : config.mode === 'NEXT_MATCH'
        ? 1
        : config.mode === 'END_OF_SEASON'
          ? Math.max(1, totalWeeksInLeague - currentWeek + 1)
          : Math.min(input.maxWeeksSafetyCap ?? 16, 52);

  for (let step = 0; step < maxWeeks; step++) {
    if (careerCompleted) break;

    const seasonLabel = formatSeasonLabel(seasonNumber);
    const seedPrefix = `${WORLD_SEED}_hol_s${seasonNumber}_w${currentWeek}`;

    // Simulate all unplayed fixtures of currentWeek
    fixtures = fixtures.map((f) => {
      if (f.week !== currentWeek || f.played) return f;
      const simmed = quickSimulateFixture(f, clubs, userClubId, assistantImpact.strengthModifier, seedPrefix);

      if (userClubId && (simmed.homeClubId === userClubId || simmed.awayClubId === userClubId)) {
        const isHome = simmed.homeClubId === userClubId;
        const gf = isHome ? simmed.homeGoals : simmed.awayGoals;
        const ga = isHome ? simmed.awayGoals : simmed.homeGoals;
        const oppId = isHome ? simmed.awayClubId : simmed.homeClubId;
        const oppClub = clubs.find((c) => c.id === oppId);
        const oppName = oppClub ? getClubDisplayName(oppClub, licenseMode) : oppId;
        const result: 'W' | 'D' | 'L' = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        if (result === 'W') wins++;
        else if (result === 'D') draws++;
        else losses++;
        goalsFor += gf;
        goalsAgainst += ga;

        matchLogs.push({
          week: currentWeek,
          seasonLabel,
          opponentName: oppName,
          isHome,
          goalsFor: gf,
          goalsAgainst: ga,
          result,
        });
      }
      return simmed;
    });

    // Update user club injuries / recovery & occasional transfer offer handling
    if (userClubId) {
      const userClub = clubs.find((c) => c.id === userClubId);
      if (userClub) {
        for (const p of userClub.players) {
          if (p.injuredWeeks > 0) {
            p.injuredWeeks = Math.max(0, p.injuredWeeks - 1);
            if (p.injuredWeeks === 0) p.injuryName = null;
          }
          p.condition = Math.min(98, Math.max(68, p.condition + 4));
        }

        const injRoll = deterministicUnitRandom(`${seedPrefix}_inj`);
        if (injRoll < 0.14 && userClub.players.length > 0) {
          const victim = userClub.players[Math.floor(injRoll * 100) % userClub.players.length];
          if (victim.injuredWeeks === 0) {
            victim.injuredWeeks = 2;
            victim.injuryName = 'Arka Adale Gerilmesi';
            injuriesOccurred.push(`${getPlayerDisplayName(victim, licenseMode)} (2 hafta)`);
          }
        }

        const offerRoll = deterministicUnitRandom(`${seedPrefix}_offer`);
        if (offerRoll < 0.12 && userClub.players.length > 15) {
          const candidate = userClub.players[userClub.players.length - 1];
          const offerAmount = Math.round(candidate.marketValue * 1.15);
          if (config.transferPolicy === 'REJECT_ALL') {
            transfersHandled.push(
              `${getPlayerDisplayName(candidate, licenseMode)} için gelen teklif politika gereği reddedildi.`
            );
          } else if (config.transferPolicy === 'ACCEPT_SUITABLE') {
            userClub.cashBalance += offerAmount;
            userClub.transferBudget += Math.round(offerAmount * 0.7);
            userClub.players = userClub.players.filter((p) => p.id !== candidate.id);
            transfersHandled.push(
              `${getPlayerDisplayName(candidate, licenseMode)} uygun teklifle satıldı (+€${(offerAmount / 1_000_000).toFixed(1)}M).`
            );
          } else {
            transfersHandled.push(
              `${getPlayerDisplayName(candidate, licenseMode)} için teklif geldi (Manuel karar bekleniyor).`
            );
          }
        }
      }
    }

    // Job offer check
    if (config.returnOnJobOffer) {
      const jobRoll = deterministicUnitRandom(`${seedPrefix}_job`);
      if (jobRoll < 0.06 && clubs.length > 2) {
        const offeringClub = clubs[Math.floor(jobRoll * 1000) % clubs.length];
        if (offeringClub.id !== userClubId) {
          const offerClubName = getClubDisplayName(offeringClub, licenseMode);
          jobOffersReceived.push(`${offerClubName} teknik direktörlük görüşmesi teklif etti.`);
          weeksSimulated++;
          currentWeek++;
          stopReason = `${offerClubName} kulübünden iş teklifi geldiği için tatil otomatik sonlandırıldı.`;
          break;
        }
      }
    }

    weeksSimulated++;
    currentWeek++;

    // End of season rollover check
    if (currentWeek > totalWeeksInLeague) {
      const rollover = advanceSeasonRollover({
        seasonNumber,
        leagueId,
        clubs,
        fixtures,
        userClubId,
        licenseMode,
      });
      seasonHistoryAdded.push(rollover.historyEntry);
      inboxMessages.push(rollover.inboxMessage);
      clubs = rollover.updatedClubs;
      fixtures = rollover.nextFixtures;
      seasonNumber = rollover.nextSeasonNumber;
      seasonsRolledOver++;
      careerCompleted = rollover.careerCompleted;

      if (careerCompleted) {
        currentWeek = totalWeeksInLeague;
        stopReason = '30 sezonluk kariyer tamamlandığı için tatil sonlandırıldı.';
        break;
      } else {
        currentWeek = 1;
        if (config.mode === 'END_OF_SEASON') {
          stopReason = `${startedSeasonLabel} sezonu tamamlandı ve ${formatSeasonLabel(seasonNumber)} sezonuna geçildi.`;
          break;
        }
      }
    }
  }

  const daysElapsed = config.mode === 'DAYS' ? Math.min(config.days, weeksSimulated * 7) : weeksSimulated * 7;
  const endedSeasonLabel = formatSeasonLabel(seasonNumber);

  const report: HolidaySummaryReport = {
    id: `holiday_${seasonNumber}_${currentWeek}_${weeksSimulated}`,
    startedSeasonLabel,
    endedSeasonLabel,
    daysElapsed,
    weeksSimulated,
    seasonsRolledOver,
    matchesPlayed: matchLogs.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    matchLogs,
    injuriesOccurred,
    transfersHandled,
    jobOffersReceived,
    assistantName: assistant ? assistant.name : 'Geçici Yardımcı Antrenör',
    assistantTacticalKnowledge: assistantTK,
    tacticalNote: assistantImpact.summaryTr,
    stopReason,
  };

  inboxMessages.push({
    id: `inbox_${report.id}`,
    week: currentWeek,
    sender: report.assistantName,
    senderRole: 'Asistan Menajer — Tatil Dönüş Raporu',
    subject: `Tatil Özeti: ${report.matchesPlayed} Maç (${wins}G ${draws}B ${losses}M)`,
    body: `${report.stopReason}\n\nGeçen Süre: ${report.daysElapsed} gün (${report.weeksSimulated} hafta)\nMaç Karnesi: ${wins} Galibiyet, ${draws} Beraberlik, ${losses} Mağlubiyet (${goalsFor}:${goalsAgainst})\nTaktik Notu: ${report.tacticalNote}${
      injuriesOccurred.length > 0 ? `\nSakatlıklar: ${injuriesOccurred.join(', ')}` : ''
    }${transfersHandled.length > 0 ? `\nTransfer Hareketleri: ${transfersHandled.join(' | ')}` : ''}`,
    category: 'HOLIDAY',
    read: false,
    urgent: true,
  });

  return {
    seasonNumber,
    currentWeek,
    clubs,
    fixtures,
    seasonHistoryAdded,
    careerCompleted,
    report,
    inboxMessages,
  };
}
