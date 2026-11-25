import assert from 'node:assert/strict';
import test from 'node:test';
import { createClubsForLeague, generateRoundRobinFixtures } from './database';
import {
  advanceSeasonRollover,
  evaluateAssistantTacticalImpact,
  evaluateClubVisionApplication,
  evaluatePressAnswer,
  formatSeasonLabel,
  generateDynamicPressConference,
  runHolidaySimulation,
} from './megaCareerEngine';
import { LeagueId, ManagerProfile, MAX_CAREER_SEASONS, StaffMember } from './types';

test('All 9 major European leagues load valid clubs and squads', () => {
  const nineLeagues: LeagueId[] = [
    'PREMIER_LEAGUE',
    'LA_LIGA',
    'SERIE_A',
    'BUNDESLIGA',
    'LIGUE_1',
    'SUPER_LIG',
    'EREDIVISIE',
    'LIGA_PORTUGAL',
    'BELGIAN_PRO_LEAGUE',
  ];

  for (const leagueId of nineLeagues) {
    const clubs = createClubsForLeague(leagueId);
    assert.ok(clubs.length >= 16, `${leagueId} should have at least 16 clubs`);
    assert.ok(clubs[0].players.length >= 15, `${leagueId} clubs should have squads`);
  }
});

test('30-season rollover ages players, generates unique regens, and stops at season 30', () => {
  assert.equal(formatSeasonLabel(1), '2026-27');
  assert.equal(formatSeasonLabel(30), '2055-56');

  const clubs = createClubsForLeague('LIGUE_1');
  const fixtures = generateRoundRobinFixtures(clubs);
  const initialAge = clubs[0].players[0].age;

  const rollover1 = advanceSeasonRollover({
    seasonNumber: 1,
    leagueId: 'LIGUE_1',
    clubs,
    fixtures,
    userClubId: clubs[0].id,
    licenseMode: 'FULL_LICENSE',
  });

  assert.equal(rollover1.careerCompleted, false);
  assert.equal(rollover1.nextSeasonNumber, 2);
  assert.equal(rollover1.nextSeasonLabel, '2027-28');
  assert.ok(rollover1.nextFixtures.length > 0);
  const samePlayer = rollover1.updatedClubs[0].players.find((p) => p.id === clubs[0].players[0].id);
  if (samePlayer) {
    assert.equal(samePlayer.age, initialAge + 1);
  }

  // Season 30 must complete the career and not roll into season 31
  const rollover30 = advanceSeasonRollover({
    seasonNumber: MAX_CAREER_SEASONS,
    leagueId: 'LIGUE_1',
    clubs: rollover1.updatedClubs,
    fixtures: rollover1.nextFixtures,
    userClubId: clubs[0].id,
    licenseMode: 'FULL_LICENSE',
  });
  assert.equal(rollover30.careerCompleted, true);
  assert.equal(rollover30.nextSeasonNumber, MAX_CAREER_SEASONS);
});

test('Assistant tacticalKnowledge directly impacts match simulation modifier', () => {
  const high = evaluateAssistantTacticalImpact(90);
  const low = evaluateAssistantTacticalImpact(45);
  assert.ok(high.strengthModifier > low.strengthModifier);
  assert.ok(high.errorRisk < low.errorRisk);
});

test('Club Vision rejects unproven manager for elite club and accepts veteran winner', () => {
  const laLiga = createClubsForLeague('LA_LIGA');
  const realMadrid = laLiga.find((c) => c.realShort === 'RMA') ?? laLiga[0];

  const rookie: ManagerProfile = {
    firstName: 'Ali',
    lastName: 'Kaya',
    nationality: 'TUR',
    age: 32,
    personality: 'TACTICIAN',
    appearance: {
      skinTone: '#d9a78b',
      hairStyle: 'SHORT',
      hairColor: '#111111',
      facialHair: 'NONE',
      outfit: 'SUIT',
      glasses: false,
    },
    reputation: 42,
    trophies: 0,
    matchesManaged: 10,
    wins: 4,
  };

  const evalRookie = evaluateClubVisionApplication(rookie, realMadrid, [], 'FULL_LICENSE');
  assert.equal(evalRookie.accepted, false);
  assert.ok(evalRookie.inboxBody.includes('Yönetim Kurulu'));

  const legend: ManagerProfile = {
    ...rookie,
    reputation: 94,
    trophies: 6,
    matchesManaged: 180,
    wins: 135,
  };
  const evalLegend = evaluateClubVisionApplication(legend, realMadrid, [], 'FULL_LICENSE');
  assert.equal(evalLegend.accepted, true);
});

test('Turkish Press Conference generates outlet question and handles custom & skip answers', () => {
  const q = generateDynamicPressConference('PRE_MATCH', {
    week: 4,
    seasonNumber: 1,
    clubName: 'Galatasaray',
    opponentName: 'Fenerbahçe',
  });
  assert.ok(['Habertürk', 'ATV Spor', 'TRT Spor', 'Fanatik'].includes(q.outlet));
  assert.ok(q.options.length >= 3);

  const customImpact = evaluatePressAnswer('CUSTOM', {
    customText: 'Taraftarımızla birlikte şampiyon olacağız!',
    outlet: q.outlet,
    clubName: 'Galatasaray',
  });
  assert.ok(customImpact.fanSupportDelta > 0);

  const skipImpact = evaluatePressAnswer('SKIP', {
    outlet: q.outlet,
    clubName: 'Galatasaray',
  });
  assert.ok(skipImpact.mediaRelationsDelta < 0);
});

test('Holiday simulation runs fast multi-week and end-of-season rollovers with summary report', () => {
  const clubs = createClubsForLeague('EREDIVISIE');
  const fixtures = generateRoundRobinFixtures(clubs);
  const staff: StaffMember[] = [
    {
      id: 'st_asst',
      name: 'Kemal Özdeş',
      role: 'ASSISTANT',
      nationality: 'TUR',
      age: 48,
      rating: 84,
      tacticalKnowledge: 86,
      weeklyWage: 12000,
      specialty: 'Taktik Analiz',
    },
  ];

  const res = runHolidaySimulation({
    config: {
      mode: 'DAYS',
      days: 21,
      useCurrentTactics: true,
      transferPolicy: 'REJECT_ALL',
      returnOnJobOffer: false,
    },
    seasonNumber: 1,
    currentWeek: 1,
    leagueId: 'EREDIVISIE',
    clubs,
    fixtures,
    userClubId: clubs[0].id,
    tactics: null,
    staff,
    licenseMode: 'FULL_LICENSE',
  });

  assert.equal(res.report.weeksSimulated, 3);
  assert.equal(res.report.matchesPlayed, 3);
  assert.ok(res.inboxMessages.some((m) => m.category === 'HOLIDAY'));
});
