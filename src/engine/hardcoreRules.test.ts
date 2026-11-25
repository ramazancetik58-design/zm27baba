import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_LEAGUE_IDS,
  buildDefaultBenchForClub,
  buildTacticsForClub,
  createAchievementsCatalog,
  createClubsForLeague,
  createDefaultManagerProfile,
  createInitialClubs,
  createInitialStaffForClub,
  createInitialTrainingPlan,
  createStaffMarketPool,
  createTransferMarketPool,
  FORMATION_TEMPLATES,
  generateRoundRobinFixtures,
  getLeagueMeta,
  TACTICAL_STYLE_PRESETS,
} from './database';
import {
  applyWeeklyTeamTraining,
  applyYouthDevelopment,
  buildTeamReport,
  calculateTacticalStrength,
  computeAgentFeeAmount,
  computeStandings,
  evaluateAchievements,
  evaluateBoardInterview,
  evaluateJobApplication,
  evaluateMedicalIntervention,
  evaluatePressQuestion,
  evaluateResignation,
  evaluateTeamTalk,
  evaluateTransferOffer,
  filterTransferMarket,
  generateBoardInterview,
  generateInitialInbox,
  generatePressConferenceQuestions,
  generateScoutReport,
  generateWeeklyInbox,
  getStaffDisplayName,
  getTeamTalkOptions,
  INJURY_CATALOG,
  isDerbyFixture,
  partitionMatchdaySquad,
  RESIGN_REASONS,
  stepPlayerFatigueAndInjury,
  swapPlayerZone,
  validateLicenseCode,
} from './hardcoreRules';
import { LeagueId, TransferNegotiation } from './types';

test('license activation validates ZEPHYR-FULL case-insensitively', () => {
  assert.equal(validateLicenseCode('ZEPHYR-FULL'), true);
  assert.equal(validateLicenseCode('  zephyr-full  '), true);
  assert.equal(validateLicenseCode('ZEPHYR-DEMO'), false);
});

test('Super Lig 2026-27 database has 18 clubs, 34 weeks (306 fixtures), and unique players', () => {
  const clubs = createInitialClubs();
  assert.equal(clubs.length, 18);
  const fixtures = generateRoundRobinFixtures(clubs);
  assert.equal(fixtures.length, 306);
  const maxWeek = Math.max(...fixtures.map((f) => f.week));
  assert.equal(maxWeek, 34);

  // Verify every week has exactly 9 unique matches (18 distinct teams)
  for (let w = 1; w <= 34; w++) {
    const wf = fixtures.filter((f) => f.week === w);
    assert.equal(wf.length, 9);
    const seen = new Set<string>();
    for (const f of wf) {
      seen.add(f.homeClubId);
      seen.add(f.awayClubId);
    }
    assert.equal(seen.size, 18);
  }

  // Verify no duplicate real player names across the 18 squads
  const names = clubs.flatMap((c) => c.players.map((p) => p.realName));
  assert.equal(new Set(names).size, names.length);
});

test('derby detection and press conference rules return valid Turkish labels and bonuses', () => {
  assert.equal(isDerbyFixture('gs', 'fb'), 'Kıtalararası Derbi');
  assert.equal(isDerbyFixture('ts', 'riz'), 'Karadeniz Derbisi');
  assert.equal(isDerbyFixture('gs', 'erz'), null);

  const press = evaluatePressQuestion('HUMBLE', 'ENCOURAGING');
  assert.ok(press.moraleDelta >= 5);
  assert.ok(press.confidenceDelta >= 2);
});

test('stubborn transfer AI never accepts on round 1 and walks away on lowball', () => {
  const pool = createTransferMarketPool();
  const target = pool.find((m) => m.listingType === 'TRANSFER')!;
  const baseNeg: TransferNegotiation = {
    targetPlayer: target.player,
    sellingClubId: target.clubId,
    listingType: 'TRANSFER',
    round: 1,
    maxRounds: 4,
    askingPrice: Math.round(target.player.marketValue * 1.35),
    currentOffer: 0,
    offeredWage: target.player.weeklyWage,
    status: 'OPEN',
    clubMessage: '',
  };

  // Even a generous round 1 bid gets countered in hardcore mode
  const r1 = evaluateTransferOffer(
    baseNeg,
    Math.round(target.player.marketValue * 1.35),
    Math.round(target.player.weeklyWage * 1.2),
    50_000_000,
    2_000_000,
    500_000
  );
  assert.equal(r1.status, 'COUNTERED');
  assert.equal(r1.round, 2);

  // Insultingly low bid triggers immediate walkout
  const insult = evaluateTransferOffer(
    baseNeg,
    Math.round(target.player.marketValue * 0.5),
    target.player.weeklyWage,
    50_000_000,
    2_000_000,
    500_000
  );
  assert.equal(insult.status, 'REJECTED_WALKED');

  // Round 2 matching asking price & wage succeeds
  const r2 = evaluateTransferOffer(
    r1,
    r1.askingPrice,
    Math.round(target.player.weeklyWage * 1.15),
    50_000_000,
    2_000_000,
    500_000
  );
  assert.equal(r2.status, 'ACCEPTED');
});

test('free agent and loan negotiations respect €0 transfer fee and loan fee rules', () => {
  const pool = createTransferMarketPool();
  const freeAgent = pool.find((m) => m.listingType === 'FREE_AGENT')!;
  const loanTarget = pool.find((m) => m.listingType === 'LOAN')!;

  const faNeg: TransferNegotiation = {
    targetPlayer: freeAgent.player,
    sellingClubId: null,
    listingType: 'FREE_AGENT',
    round: 1,
    maxRounds: 4,
    askingPrice: 0,
    currentOffer: 0,
    offeredWage: freeAgent.player.weeklyWage,
    status: 'OPEN',
    clubMessage: '',
  };

  const faR1 = evaluateTransferOffer(faNeg, 0, freeAgent.player.weeklyWage, 100_000, 2_000_000, 500_000);
  assert.equal(faR1.status, 'COUNTERED');
  const faR2 = evaluateTransferOffer(
    faR1,
    0,
    Math.round(freeAgent.player.weeklyWage * 1.25),
    100_000,
    2_000_000,
    500_000
  );
  assert.equal(faR2.status, 'ACCEPTED');

  const loanNeg: TransferNegotiation = {
    targetPlayer: loanTarget.player,
    sellingClubId: loanTarget.clubId,
    listingType: 'LOAN',
    round: 1,
    maxRounds: 4,
    askingPrice: loanTarget.loanFee ?? 300_000,
    currentOffer: 0,
    offeredWage: loanTarget.player.weeklyWage,
    status: 'OPEN',
    clubMessage: '',
  };

  const lnR1 = evaluateTransferOffer(
    loanNeg,
    loanTarget.loanFee ?? 300_000,
    loanTarget.player.weeklyWage,
    50_000_000,
    2_000_000,
    500_000
  );
  assert.equal(lnR1.status, 'COUNTERED');
  const lnR2 = evaluateTransferOffer(
    lnR1,
    lnR1.askingPrice,
    loanTarget.player.weeklyWage,
    50_000_000,
    2_000_000,
    500_000
  );
  assert.equal(lnR2.status, 'ACCEPTED');
});

test('hardcore tactical mismatch penalizes out-of-position and high-line no-press', () => {
  const clubs = createInitialClubs();
  const club = clubs[0];
  const slots = buildTacticsForClub(club);
  const goodTactics = {
    formation: club.preferredFormation,
    mentality: 'BALANCED' as const,
    pressing: 'MEDIUM' as const,
    tempo: 'NORMAL' as const,
    defensiveLine: 55,
    slots,
    benchPlayerIds: buildDefaultBenchForClub(club, slots),
  };

  const badTactics = {
    ...goodTactics,
    pressing: 'LOW' as const,
    defensiveLine: 85,
    slots: goodTactics.slots.map((s, idx) =>
      idx === 0
        ? { ...s, playerId: goodTactics.slots[10].playerId }
        : idx === 10
        ? { ...s, playerId: goodTactics.slots[0].playerId }
        : s
    ),
  };

  const goodEval = calculateTacticalStrength(club, goodTactics);
  const badEval = calculateTacticalStrength(club, badTactics);
  assert.ok(goodEval.overall > badEval.overall + 8);
  assert.ok(badEval.warnings.length >= 2);
});

test('team talk synergy rewards matching manager personality', () => {
  const despotAggressive = evaluateTeamTalk('HALF_TIME', 'AGGRESSIVE', 'DESPOT', -1);
  const encouragerAggressive = evaluateTeamTalk('HALF_TIME', 'AGGRESSIVE', 'ENCOURAGING', -1);
  assert.ok(despotAggressive.tacticalBoost > encouragerAggressive.tacticalBoost);
  assert.ok(despotAggressive.moraleDelta > encouragerAggressive.moraleDelta);

  const encouragerPassion = evaluateTeamTalk('PRE_MATCH', 'PASSIONATE', 'ENCOURAGING', 0);
  assert.ok(encouragerPassion.moraleDelta >= 8);
});

test('advanced transfer filter searches across categories, role, ovr, and query', () => {
  const clubs = createInitialClubs();
  const pool = createTransferMarketPool();
  assert.ok(pool.length >= 50);

  const freeGks = filterTransferMarket(
    pool,
    {
      listingType: 'FREE_AGENT',
      query: '',
      role: 'GK',
      minOvr: 70,
      maxAge: 40,
      maxPrice: 0,
      minPotential: 70,
      sortBy: 'OVR_DESC',
    },
    clubs,
    'FULL_LICENSE'
  );
  assert.ok(freeGks.length >= 2);
  assert.ok(freeGks.every((m) => m.listingType === 'FREE_AGENT' && m.player.naturalRole === 'GK'));

  const ardaSearch = filterTransferMarket(
    pool,
    {
      listingType: 'ALL',
      query: 'arda güler',
      role: 'ALL',
      minOvr: 60,
      maxAge: 40,
      maxPrice: 0,
      minPotential: 60,
      sortBy: 'OVR_DESC',
    },
    clubs,
    'FULL_LICENSE'
  );
  assert.equal(ardaSearch.length, 1);
  assert.equal(ardaSearch[0].player.realName, 'Arda Güler');
});

test('unemployed manager job application rejects top clubs when reputation is low', () => {
  const clubs = createInitialClubs();
  const rookieManager = { ...createDefaultManagerProfile(), reputation: 52, personality: 'ENCOURAGING' as const };
  const midClub = clubs.find((c) => c.reputation <= 70)!;
  const topClub = clubs.find((c) => c.reputation >= 83)!;

  assert.equal(evaluateJobApplication(midClub, rookieManager).accepted, true);
  assert.equal(evaluateJobApplication(topClub, rookieManager).accepted, false);
});

test('hardcore stamina drains faster under gegenpress and injuries occur on low roll', () => {
  const clubs = createInitialClubs();
  const player = clubs[0].players[5];
  const lowPress = stepPlayerFatigueAndInjury(player, 90, 'LOW', 0.99);
  const gegenPress = stepPlayerFatigueAndInjury(player, 90, 'GEGENPRESS', 0.99);
  assert.ok(gegenPress.newCondition < lowPress.newCondition);

  const injured = stepPlayerFatigueAndInjury({ ...player, condition: 45 }, 90, 'GEGENPRESS', 0.005);
  assert.ok(injured.injuredWeeks > 0);
  assert.ok(injured.injuryName !== null);
});

test('youth development is realistically slow and respects potential cap', () => {
  const clubs = createInitialClubs();
  const youngster = { ...clubs[0].players[15], age: 18, ovr: 70, potential: 82, growthProgress: 0.1 };
  const afterOneMatch = applyYouthDevelopment(youngster, true);
  assert.equal(afterOneMatch.ovr, 70);
  assert.ok(afterOneMatch.growthProgress > 0.1 && afterOneMatch.growthProgress < 0.5);
});

test('standings sort by points then goal difference', () => {
  const clubs = createInitialClubs().slice(0, 3);
  const rows = computeStandings(clubs, [
    {
      id: 'f1',
      week: 1,
      homeClubId: clubs[0].id,
      awayClubId: clubs[1].id,
      played: true,
      homeGoals: 3,
      awayGoals: 0,
      homeXg: 2.2,
      awayXg: 0.4,
      homePossession: 58,
      homeShots: 14,
      awayShots: 4,
      events: [],
    },
    {
      id: 'f2',
      week: 2,
      homeClubId: clubs[2].id,
      awayClubId: clubs[1].id,
      played: true,
      homeGoals: 1,
      awayGoals: 0,
      homeXg: 1.1,
      awayXg: 0.7,
      homePossession: 52,
      homeShots: 9,
      awayShots: 6,
      events: [],
    },
  ]);

  assert.equal(rows[0].clubId, clubs[0].id);
  assert.equal(rows[0].points, 3);
  assert.equal(rows[0].gd, 3);
  assert.equal(rows[1].clubId, clubs[2].id);
  assert.equal(rows[1].gd, 1);
});

test('Premier League 2026-27 database has 20 clubs, 38 weeks (380 fixtures), realistic budgets, and unique players', () => {
  const plClubs = createClubsForLeague('PREMIER_LEAGUE');
  assert.equal(plClubs.length, 20);
  const fixtures = generateRoundRobinFixtures(plClubs);
  assert.equal(fixtures.length, 380);
  assert.equal(Math.max(...fixtures.map((f) => f.week)), 38);

  for (let w = 1; w <= 38; w++) {
    const wf = fixtures.filter((f) => f.week === w);
    assert.equal(wf.length, 10);
    const seen = new Set<string>();
    for (const f of wf) {
      seen.add(f.homeClubId);
      seen.add(f.awayClubId);
    }
    assert.equal(seen.size, 20);
  }

  const names = plClubs.flatMap((c) => c.players.map((p) => p.realName));
  assert.equal(new Set(names).size, names.length);

  const arsenal = plClubs.find((c) => c.id === 'ars')!;
  const villa = plClubs.find((c) => c.id === 'avl')!;
  assert.ok(arsenal.transferBudget > villa.transferBudget * 5);

  const plMarket = createTransferMarketPool('PREMIER_LEAGUE');
  assert.ok(plMarket.length >= 50);
  const plNameSet = new Set(names);
  assert.equal(plMarket.some((m) => plNameSet.has(m.player.realName)), false);

  assert.equal(isDerbyFixture('ars', 'tot'), 'Kuzey Londra Derbisi');
  assert.equal(isDerbyFixture('mci', 'mun'), 'Manchester Derbisi');
  assert.equal(isDerbyFixture('new', 'sun'), 'Tyne-Wear Derbisi');
});

test('diverse injury catalog produces varied realistic medical diagnoses', () => {
  assert.ok(INJURY_CATALOG.length >= 16);
  const clubs = createInitialClubs();
  const tired = { ...clubs[0].players[4], condition: 42 };
  const picked = new Set<string>();
  for (let i = 0; i < 18; i++) {
    const res = stepPlayerFatigueAndInjury(tired, 90, 'GEGENPRESS', 0.001 + i * 0.011);
    if (res.injuryName) picked.add(res.injuryName);
  }
  assert.ok(picked.size >= 8);
});

test('matchday squad partitioning and swapPlayerZone maintain 11 starters and <=9 bench players', () => {
  const clubs = createInitialClubs();
  const club = clubs[0];
  const slots = buildTacticsForClub(club);
  const tactics = {
    formation: club.preferredFormation,
    mentality: 'BALANCED' as const,
    pressing: 'MEDIUM' as const,
    tempo: 'NORMAL' as const,
    defensiveLine: 55,
    slots,
    benchPlayerIds: buildDefaultBenchForClub(club, slots),
  };

  const initial = partitionMatchdaySquad(club, tactics);
  assert.equal(initial.starters.length, 11);
  assert.ok(initial.bench.length <= 9 && initial.bench.length >= 7);
  assert.ok(initial.reserves.length >= 1);

  const benchCandidate = initial.bench[0];
  const demotedToReserves = swapPlayerZone(tactics, club, benchCandidate.id, 'RESERVES');
  const afterDemote = partitionMatchdaySquad(club, demotedToReserves);
  assert.equal(afterDemote.bench.some((p) => p.id === benchCandidate.id), false);
  assert.equal(afterDemote.reserves.some((p) => p.id === benchCandidate.id), true);

  const promotedBackToStarter = swapPlayerZone(demotedToReserves, club, benchCandidate.id, 'STARTER', 2);
  const afterPromote = partitionMatchdaySquad(club, promotedBackToStarter);
  assert.equal(afterPromote.starters[2].id, benchCandidate.id);
  assert.equal(afterPromote.starters.length, 11);
  assert.ok(afterPromote.bench.length <= 9);
});

test('FM26-style inbox generates unread initial and weekly medical/derby alerts', () => {
  const plClubs = createClubsForLeague('PREMIER_LEAGUE');
  const arsenal = plClubs.find((c) => c.id === 'ars')!;
  const manager = createDefaultManagerProfile();

  const initMsgs = generateInitialInbox(arsenal, 'PREMIER_LEAGUE', manager, 'FULL_LICENSE', 1);
  assert.equal(initMsgs.length, 3);
  assert.ok(initMsgs.every((m) => m.read === false));

  const derbyFixture = {
    id: 'fix_derby',
    week: 2,
    homeClubId: 'ars',
    awayClubId: 'tot',
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    homeXg: 0,
    awayXg: 0,
    homePossession: 50,
    homeShots: 0,
    awayShots: 0,
    events: [],
  };
  const weeklyMsgs = generateWeeklyInbox(
    arsenal,
    plClubs,
    derbyFixture,
    [{ playerName: 'Bukayo Saka', injuryName: 'Ayak Bileği Burkulması', weeks: 2 }],
    'FULL_LICENSE',
    2,
    { opponentName: 'Chelsea', myGoals: 2, oppGoals: 1 }
  );
  assert.equal(weeklyMsgs.length, 3);
  assert.ok(weeklyMsgs.some((m) => m.category === 'MEDICAL' && m.urgent));
  assert.ok(weeklyMsgs.some((m) => m.subject.includes('Kuzey Londra Derbisi')));
});

test('La Liga 2026-27 database has 20 clubs, 38 weeks (380 fixtures), LCPD budgets, and 420 unique players', () => {
  const llClubs = createClubsForLeague('LA_LIGA');
  assert.equal(llClubs.length, 20);
  const fixtures = generateRoundRobinFixtures(llClubs);
  assert.equal(fixtures.length, 380);
  assert.equal(Math.max(...fixtures.map((f) => f.week)), 38);

  const names = llClubs.flatMap((c) => c.players.map((p) => p.realName));
  assert.equal(names.length, 420);
  assert.equal(new Set(names).size, names.length);

  const rma = llClubs.find((c) => c.id === 'rma')!;
  const sev = llClubs.find((c) => c.id === 'sev')!;
  assert.ok(rma.wageBudgetWeekly > sev.wageBudgetWeekly * 15);
  assert.ok(llClubs.some((c) => c.id === 'rac'));
  assert.ok(llClubs.some((c) => c.id === 'dep'));
  assert.ok(llClubs.some((c) => c.id === 'mal'));

  assert.equal(isDerbyFixture('rma', 'fcb'), 'El Clásico');
  assert.equal(isDerbyFixture('rma', 'atm'), 'El Derbi Madrileño');
  assert.equal(isDerbyFixture('ath', 'rso'), 'Euskal Derbia (Bask Derbisi)');
  assert.equal(isDerbyFixture('rbb', 'sev'), 'El Gran Derbi (Sevilla)');
});

test('team training, scout reports, medical intervention, press questions, team report, and achievements work coherently', () => {
  const llClubs = createClubsForLeague('LA_LIGA');
  const barca = llClubs.find((c) => c.id === 'fcb')!;
  const staff = createInitialStaffForClub(barca.id, barca.reputation);
  const plan = { ...createInitialTrainingPlan(), intensity: 'INTENSE' as const };

  const trainRes = applyWeeklyTeamTraining(barca.players, plan, staff, 3);
  assert.equal(trainRes.updatedPlayers.length, barca.players.length);
  assert.ok(trainRes.summaryText.includes('INTENSE'));

  const yamal = barca.players.find((p) => p.realName === 'Lamine Yamal')!;
  const report = generateScoutReport(yamal, barca.realName, 'LA_LIGA', 88, 3, 'FULL_LICENSE');
  assert.equal(report.grade, 'A+');
  assert.ok(report.pros.length >= 1);

  const injuredPlayer = { ...yamal, injuredWeeks: 3, injuryName: 'Hamstring Gerilmesi', condition: 60 };
  const injOk = evaluateMedicalIntervention(injuredPlayer, 'INJECTION', 88, 0.25);
  assert.equal(injOk.injuredWeeks, 0);
  const injFail = evaluateMedicalIntervention(injuredPlayer, 'INJECTION', 70, 0.92);
  assert.equal(injFail.injuredWeeks, 5);

  const pressQs = generatePressConferenceQuestions(barca, llClubs[0], 4, 'El Clásico', 'FULL_LICENSE');
  assert.equal(pressQs.length, 5);

  const tReport = buildTeamReport(barca, llClubs);
  assert.equal(tReport.lines.length, 4);
  assert.ok(tReport.avgOvr > 78);

  const achs = createAchievementsCatalog();
  const evalAch = evaluateAchievements(achs, {
    wins: 1,
    cleanSheets: 1,
    derbyWins: 1,
    fourGoalGames: 0,
    winStreak: 1,
    transfersSigned: 0,
    freeOrLoansSigned: 0,
    scoutReports: 2,
    trainingsApplied: 1,
    pressDone: 1,
    staffHired: 0,
    youthOvrGains: 0,
    boardConfidence: 72,
    licenseFull: true,
    week: 2,
  });
  assert.ok(evalAch.newlyUnlocked.some((a) => a.id === 'first_win'));
  assert.ok(evalAch.newlyUnlocked.some((a) => a.id === 'derby_king'));
  assert.ok(evalAch.newlyUnlocked.some((a) => a.id === 'full_license'));
});

test('all 13 leagues (including 9 major European leagues) match fixture counts and unique IDs', () => {
  const expected: Record<LeagueId, { teams: number; weeks: number; fixtures: number }> = {
    SUPER_LIG: { teams: 18, weeks: 34, fixtures: 306 },
    TR_1_LIG: { teams: 20, weeks: 38, fixtures: 380 },
    TR_2_LIG_BEYAZ: { teams: 18, weeks: 34, fixtures: 306 },
    TR_2_LIG_KIRMIZI: { teams: 18, weeks: 34, fixtures: 306 },
    PREMIER_LEAGUE: { teams: 20, weeks: 38, fixtures: 380 },
    LA_LIGA: { teams: 20, weeks: 38, fixtures: 380 },
    SERIE_A: { teams: 20, weeks: 38, fixtures: 380 },
    BUNDESLIGA: { teams: 18, weeks: 34, fixtures: 306 },
    LIGUE_1: { teams: 18, weeks: 34, fixtures: 306 },
    EREDIVISIE: { teams: 18, weeks: 34, fixtures: 306 },
    LIGA_PORTUGAL: { teams: 18, weeks: 34, fixtures: 306 },
    BELGIAN_PRO_LEAGUE: { teams: 16, weeks: 30, fixtures: 240 },
    EFL_CHAMPIONSHIP: { teams: 24, weeks: 46, fixtures: 552 },
  };

  assert.equal(ALL_LEAGUE_IDS.length, 13);
  const allClubIds: string[] = [];
  const allPlayerIds: string[] = [];

  for (const lid of ALL_LEAGUE_IDS) {
    const meta = getLeagueMeta(lid);
    const clubs = createClubsForLeague(lid);
    const fixtures = generateRoundRobinFixtures(clubs);
    const exp = expected[lid];

    assert.equal(clubs.length, exp.teams, `${lid} club count`);
    assert.equal(meta.teams, exp.teams, `${lid} meta teams`);
    assert.equal(meta.weeks, exp.weeks, `${lid} meta weeks`);
    assert.equal(fixtures.length, exp.fixtures, `${lid} fixture count`);
    assert.equal(Math.max(...fixtures.map((f) => f.week)), exp.weeks, `${lid} max week`);
    assert.ok(meta.zones.length >= 3, `${lid} has league zones`);

    for (const c of clubs) {
      allClubIds.push(c.id);
      assert.ok(c.players.length >= 18, `${c.id} has full squad`);
      for (const p of c.players) {
        allPlayerIds.push(p.id);
      }
    }
  }

  assert.equal(allClubIds.length, 246, 'total clubs across 13 leagues');
  assert.equal(new Set(allClubIds).size, allClubIds.length, 'all 176 club IDs must be globally unique');
  assert.equal(new Set(allPlayerIds).size, allPlayerIds.length, 'all player IDs across 9 leagues must be unique');

  // Derby checks including Bundesliga & Championship
  assert.equal(isDerbyFixture('ita_int', 'ita_mil'), 'Derby della Madonnina');
  assert.equal(isDerbyFixture('ita_rom', 'ita_laz'), 'Derby della Capitale');
  assert.equal(isDerbyFixture('tr1_bod', 'tr1_mug'), 'Muğla Derbisi');
  assert.equal(isDerbyFixture('tr2k_ag', 'tr2k_ankd'), 'Başkent Derbisi');
  assert.equal(isDerbyFixture('ger_bvb', 'ger_fcb'), 'Der Klassiker');
  assert.equal(isDerbyFixture('ger_bvb', 'ger_s04'), 'Revierderby');
  assert.equal(isDerbyFixture('chp_por', 'chp_sou'), 'South Coast Derbisi');
});

test('researched club staff DB and expanded market support FULL_LICENSE and NO_DATA modes across all 9 leagues', () => {
  const sampleChecks: Array<[string, LeagueId]> = [
    ['gs', 'SUPER_LIG'],
    ['tr1_ant', 'TR_1_LIG'],
    ['tr2b_ads', 'TR_2_LIG_BEYAZ'],
    ['tr2k_ag', 'TR_2_LIG_KIRMIZI'],
    ['ars', 'PREMIER_LEAGUE'],
    ['rma', 'LA_LIGA'],
    ['ita_int', 'SERIE_A'],
    ['ger_fcb', 'BUNDESLIGA'],
    ['chp_whu', 'EFL_CHAMPIONSHIP'],
  ];

  for (const [clubId, lid] of sampleChecks) {
    const clubs = createClubsForLeague(lid);
    const club = clubs.find((c) => c.id === clubId)!;
    assert.ok(club, `${clubId} exists in ${lid}`);
    const staff = createInitialStaffForClub(club.id, club.reputation, lid);
    assert.equal(staff.length, 5, `${clubId} has 5 backroom staff roles`);
    for (const st of staff) {
      const real = getStaffDisplayName(st, 'FULL_LICENSE');
      const fictional = getStaffDisplayName(st, 'NO_DATA');
      assert.ok(real.length > 2);
      assert.ok(fictional.length > 2);
      assert.notEqual(real, fictional, `${clubId} staff ${st.role} should differ between licensed & fictional`);
    }
  }

  const staffMarket = createStaffMarketPool();
  assert.ok(staffMarket.length >= 40, 'expanded staff market should have 40+ candidates');
  for (const role of ['ASSISTANT', 'FITNESS', 'CHIEF_SCOUT', 'HEAD_PHYSIO', 'YOUTH_DIRECTOR'] as const) {
    assert.ok(staffMarket.some((c) => c.role === role), `staff market covers ${role}`);
  }
});

test('11 tactical style presets, 13 formations (with CUSTOM), and style counter matchups work', () => {
  assert.equal(TACTICAL_STYLE_PRESETS.length, 11);
  assert.equal(Object.keys(FORMATION_TEMPLATES).length, 13);
  assert.ok('CUSTOM' in FORMATION_TEMPLATES);
  assert.ok('4-2-4' in FORMATION_TEMPLATES);
  assert.ok('3-4-2-1' in FORMATION_TEMPLATES);

  const bundesClubs = createClubsForLeague('BUNDESLIGA');
  const bayern = bundesClubs.find((c) => c.id === 'ger_fcb')!;
  const slots = buildTacticsForClub(bayern);
  const vttTactics = {
    formation: bayern.preferredFormation,
    tacticalStyle: 'VERTICAL_TIKI_TAKA' as const,
    mentality: 'ATTACKING' as const,
    pressing: 'HIGH' as const,
    tempo: 'FAST' as const,
    defensiveLine: 68,
    slots,
    benchPlayerIds: [],
  };
  const catenaccioOpp = {
    formation: '5-3-2' as const,
    tacticalStyle: 'CATENACCIO' as const,
    mentality: 'DEFENSIVE' as const,
    pressing: 'LOW' as const,
    tempo: 'SLOW' as const,
    defensiveLine: 34,
    slots,
    benchPlayerIds: [],
  };
  const neutralOpp = { ...catenaccioOpp, tacticalStyle: 'CUSTOM' as const };
  const vsCatenaccio = calculateTacticalStrength(bayern, vttTactics, catenaccioOpp);
  const vsNeutral = calculateTacticalStrength(bayern, vttTactics, neutralOpp);
  assert.ok(vsCatenaccio.overall > vsNeutral.overall);
});

test('hardcore free-agent negotiation rejects lower-league prestige mismatch and enforces signing bonus & agent %', () => {
  const pool = createTransferMarketPool('PREMIER_LEAGUE');
  const topFreeAgent = pool
    .filter((m) => m.listingType === 'FREE_AGENT')
    .sort((a, b) => b.player.ovr - a.player.ovr)[0]!;

  const tr2Clubs = createClubsForLeague('TR_2_LIG_BEYAZ');
  const smallClub = tr2Clubs[tr2Clubs.length - 1];
  const plClubs = createClubsForLeague('PREMIER_LEAGUE');
  const bigClub = plClubs.find((c) => c.id === 'ars')!;

  const faNeg: TransferNegotiation = {
    targetPlayer: { ...topFreeAgent.player, ovr: Math.max(80, topFreeAgent.player.ovr) },
    sellingClubId: null,
    listingType: 'FREE_AGENT',
    round: 1,
    maxRounds: 4,
    askingPrice: 0,
    currentOffer: 0,
    offeredWage: topFreeAgent.player.weeklyWage,
    status: 'OPEN',
    clubMessage: '',
  };

  // Lower-league / low-prestige club refused immediately
  const rejected = evaluateTransferOffer(
    faNeg,
    0,
    topFreeAgent.player.weeklyWage * 2,
    5_000_000,
    2_000_000,
    50_000,
    'TACTICIAN',
    {
      targetClub: smallClub,
      targetLeagueId: 'TR_2_LIG_BEYAZ',
      signingBonus: 250_000,
      agentFeePct: 12,
    }
  );
  assert.equal(rejected.status, 'REJECTED_WALKED');
  assert.equal(rejected.refusalReason, 'PRESTIGE_MISMATCH');

  // Top club countered on Round 1, demands signing bonus & agent commission
  const r1 = evaluateTransferOffer(
    faNeg,
    0,
    topFreeAgent.player.weeklyWage,
    50_000_000,
    10_000_000,
    500_000,
    'TACTICIAN',
    {
      targetClub: bigClub,
      targetLeagueId: 'PREMIER_LEAGUE',
      signingBonus: 50_000,
      agentFeePct: 5,
    }
  );
  assert.equal(r1.status, 'COUNTERED');

  // Round 2 still missing agent fee % -> countered
  const r2LowAgent = evaluateTransferOffer(
    r1,
    0,
    Math.round(topFreeAgent.player.weeklyWage * 1.4),
    50_000_000,
    10_000_000,
    500_000,
    'TACTICIAN',
    {
      targetClub: bigClub,
      targetLeagueId: 'PREMIER_LEAGUE',
      signingBonus: 400_000,
      agentFeePct: 4,
    }
  );
  assert.equal(r2LowAgent.status, 'COUNTERED');

  // Round 3 meeting wage + signing bonus + 12% agent commission succeeds
  assert.ok(computeAgentFeeAmount(0, 60_000, 400_000, 12) > 0);
  const r3Ok = evaluateTransferOffer(
    r2LowAgent,
    0,
    Math.round(topFreeAgent.player.weeklyWage * 1.4),
    50_000_000,
    10_000_000,
    500_000,
    'TACTICIAN',
    {
      targetClub: bigClub,
      targetLeagueId: 'PREMIER_LEAGUE',
      signingBonus: 400_000,
      agentFeePct: 12,
    }
  );
  assert.equal(r3Ok.status, 'ACCEPTED');
});

test('resignation reasons, 4-question board interviews, and spoken team talks behave realistically', () => {
  assert.ok(RESIGN_REASONS.length >= 6);
  const bundesClubs = createClubsForLeague('BUNDESLIGA');
  const bayern = bundesClubs.find((c) => c.id === 'ger_fcb')!;
  const augsburg = bundesClubs.find((c) => c.id === 'ger_fca')!;

  const resignEval = evaluateResignation(augsburg, 'BOARD_CONFLICT', 'Hedefler örtüşmedi.');
  assert.ok(resignEval.boardReactionBody.includes('Hedefler örtüşmedi'));
  assert.ok(resignEval.repImpact < 0);

  const rookie = { ...createDefaultManagerProfile(), reputation: 52, personality: 'TACTICIAN' as const };
  const qs = generateBoardInterview(augsburg, rookie, 'BUNDESLIGA');
  assert.equal(qs.length, 4);

  // Best answers pass mid-table Augsburg, worst answers fail, elite Bayern rejects rookie
  const goodPass = evaluateBoardInterview(augsburg, rookie, [0, 0, 2, 0], 'BUNDESLIGA');
  assert.equal(goodPass.accepted, true);
  const badFail = evaluateBoardInterview(augsburg, rookie, [1, 1, 1, 1], 'BUNDESLIGA');
  assert.equal(badFail.accepted, false);
  const eliteReject = evaluateBoardInterview(bayern, rookie, [0, 0, 2, 0], 'BUNDESLIGA');
  assert.equal(eliteReject.accepted, false);

  // Spoken team talk options across phases
  assert.ok(getTeamTalkOptions('PRE_MATCH', 0, 'DESPOT').length >= 6);
  assert.ok(getTeamTalkOptions('HALF_TIME', -2, 'ENCOURAGING').length >= 6);
  assert.ok(getTeamTalkOptions('POST_MATCH', 2, 'TACTICIAN').length >= 6);
});



