import { ClubSeed } from './premierLeagueData';
import { Club, ClubEmblemType, CrestShape, FormationId, KitPattern, LeagueId, PlayerRole, WORLD_SEED } from './types';

interface CompactClubDef {
  id: string;
  fictionalName: string;
  realName: string;
  fictionalShort: string;
  realShort: string;
  city: string;
  stadiumFictional: string;
  stadiumReal: string;
  capacity: number;
  primary: string;
  secondary: string;
  accent: string;
  pattern: KitPattern;
  emblemType: ClubEmblemType;
  crestShape: CrestShape;
  stars: number;
  foundedYear: number;
  budget: number;
  wageCap: number;
  rep: number;
  expectation: string;
  formation: FormationId;
  countryCode: string;
  starsRoster?: Array<[string, string, number, string, PlayerRole, number, number, number]>;
}

const SURNAMES_BY_COUNTRY: Record<string, string[]> = {
  FRA: ['Moreau', 'Laurent', 'Lefevre', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Marchand', 'Blanc', 'Garnier', 'Faure', 'Mercier'],
  NED: ['de Vries', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'Koster'],
  POR: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Ribeiro', 'Pinto'],
  BEL: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Vermeulen', 'Pauwels', 'Hermans', 'Aerts', 'Michiels', 'Martens', 'De Vries', 'Bogaert'],
};

const FIRST_INITIALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V', 'Y'];

const BASE_ROLES: PlayerRole[] = [
  'GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST',
  'GK', 'CB', 'LB', 'CM', 'CDM', 'LW', 'ST',
];

function deterministicHash(str: string): number {
  let h = WORLD_SEED;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildClubSeed(def: CompactClubDef): ClubSeed {
  const surnames = SURNAMES_BY_COUNTRY[def.countryCode] ?? SURNAMES_BY_COUNTRY.FRA;
  const roster: Array<[string, string, number, string, PlayerRole, number, number, number]> = [
    ...(def.starsRoster ?? []),
  ];

  const usedNumbers = new Set<number>(roster.map((r) => r[7]));
  const baseOvr = Math.max(66, Math.min(86, Math.round(def.rep * 0.92)));

  let idx = 0;
  while (roster.length < 18) {
    const role = BASE_ROLES[roster.length % BASE_ROLES.length];
    const h = deterministicHash(`${def.id}_p_${idx}_${role}`);
    const surname = surnames[h % surnames.length];
    const initial = FIRST_INITIALS[(h >> 4) % FIRST_INITIALS.length];
    const age = 19 + (h % 14);
    const ovrOffset = (h % 7) - 3 - (roster.length >= 11 ? 3 : 0);
    const ovr = Math.max(63, Math.min(85, baseOvr + ovrOffset));
    const pot = Math.min(92, ovr + (age <= 22 ? 6 + (h % 6) : age <= 26 ? 2 + (h % 3) : 0));

    let num = ((h % 35) + 1);
    while (usedNumbers.has(num)) {
      num = (num % 98) + 1;
    }
    usedNumbers.add(num);

    const realName = `${initial}. ${surname}`;
    const fictionalName = `${initial}. ${surname.slice(0, Math.max(4, surname.length - 1))}`;
    roster.push([fictionalName, realName, age, def.countryCode, role, ovr, pot, num]);
    idx++;
  }

  return {
    id: def.id,
    fictionalName: def.fictionalName,
    realName: def.realName,
    fictionalShort: def.fictionalShort,
    realShort: def.realShort,
    city: def.city,
    stadiumFictional: def.stadiumFictional,
    stadiumReal: def.stadiumReal,
    capacity: def.capacity,
    primary: def.primary,
    secondary: def.secondary,
    accent: def.accent,
    pattern: def.pattern,
    emblemType: def.emblemType,
    crestShape: def.crestShape,
    stars: def.stars,
    foundedYear: def.foundedYear,
    budget: def.budget,
    wageCap: def.wageCap,
    rep: def.rep,
    expectation: def.expectation,
    formation: def.formation,
    roster,
  };
}

const LIGUE_1_DEFS: CompactClubDef[] = [
  {
    id: 'fra_psg',
    fictionalName: 'Paris Royale',
    realName: 'Paris Saint-Germain',
    fictionalShort: 'PRY',
    realShort: 'PSG',
    city: 'Paris',
    stadiumFictional: 'Parc Lumière',
    stadiumReal: 'Parc des Princes',
    capacity: 47929,
    primary: '#004170',
    secondary: '#DA291C',
    accent: '#FFFFFF',
    pattern: 'SOLID',
    emblemType: 'TOWER_EFC',
    crestShape: 'CIRCLE',
    stars: 4,
    foundedYear: 1970,
    budget: 145_000_000,
    wageCap: 5_200_000,
    rep: 92,
    expectation: 'Ligue 1 Şampiyonluğu & Şampiyonlar Ligi Finali',
    formation: '4-3-3',
    countryCode: 'FRA',
    starsRoster: [
      ['G. Donnarum', 'Gianluigi Donnarumma', 27, 'ITA', 'GK', 89, 91, 1],
      ['A. Hakimi', 'Achraf Hakimi', 27, 'MAR', 'RB', 88, 89, 2],
      ['Marquinh', 'Marquinhos', 32, 'BRA', 'CB', 86, 86, 5],
      ['W. Pacho', 'Willian Pacho', 24, 'ECU', 'CB', 84, 88, 51],
      ['N. Mendes', 'Nuno Mendes', 24, 'POR', 'LB', 87, 90, 25],
      ['Vitinha', 'Vitinha', 26, 'POR', 'CDM', 88, 90, 17],
      ['J. Neves', 'João Neves', 21, 'POR', 'CM', 85, 92, 87],
      ['W. Zaïre-E', 'Warren Zaïre-Emery', 20, 'FRA', 'CM', 84, 92, 33],
      ['K. Kvarats', 'Khvicha Kvaratskhelia', 25, 'GEO', 'LW', 88, 91, 7],
      ['O. Dembél', 'Ousmane Dembélé', 29, 'FRA', 'RW', 89, 89, 10],
      ['D. Doué', 'Désiré Doué', 21, 'FRA', 'ST', 84, 92, 14],
      ['F. Ruiz', 'Fabián Ruiz', 30, 'ESP', 'CM', 85, 85, 8],
      ['F. Torres', 'Ferran Torres', 26, 'ESP', 'ST', 83, 85, 11],
      ['S. Mayulu', 'Senny Mayulu', 20, 'FRA', 'CM', 78, 88, 24],
    ],
  },
  {
    id: 'fra_om',
    fictionalName: 'Olympique Phocée',
    realName: 'Olympique de Marseille',
    fictionalShort: 'OPH',
    realShort: 'OM',
    city: 'Marsilya',
    stadiumFictional: 'Stade Méditerranée',
    stadiumReal: 'Stade Vélodrome',
    capacity: 67394,
    primary: '#2FAEE0',
    secondary: '#FFFFFF',
    accent: '#C9A227',
    pattern: 'SOLID',
    emblemType: 'ANCHOR',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1899,
    budget: 58_000_000,
    wageCap: 2_100_000,
    rep: 84,
    expectation: 'Şampiyonlar Ligi Bileti (İlk 3)',
    formation: '4-2-3-1',
    countryCode: 'FRA',
    starsRoster: [
      ['G. Rulli', 'Gerónimo Rulli', 34, 'ARG', 'GK', 81, 81, 1],
      ['L. Balerdi', 'Leonardo Balerdi', 27, 'ARG', 'CB', 82, 84, 5],
      ['P. Højbjer', 'Pierre-Emile Højbjerg', 31, 'DEN', 'CDM', 82, 82, 23],
      ['A. Rabiot', 'Adrien Rabiot', 31, 'FRA', 'CM', 83, 83, 25],
      ['L. Henriq', 'Luis Henrique', 24, 'BRA', 'RW', 81, 85, 44],
      ['A. Gouiri', 'Amine Gouiri', 26, 'ALG', 'ST', 81, 84, 9],
    ],
  },
  {
    id: 'fra_asm',
    fictionalName: 'Principauté FC',
    realName: 'AS Monaco',
    fictionalShort: 'PFC',
    realShort: 'ASM',
    city: 'Monako',
    stadiumFictional: 'Stade Rocher',
    stadiumReal: 'Stade Louis-II',
    capacity: 18523,
    primary: '#E51937',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    pattern: 'SASH',
    emblemType: 'CROWN_RM',
    crestShape: 'SHIELD',
    stars: 2,
    foundedYear: 1924,
    budget: 52_000_000,
    wageCap: 1_900_000,
    rep: 83,
    expectation: 'Şampiyonlar Ligi Bileti',
    formation: '4-2-3-1',
    countryCode: 'FRA',
    starsRoster: [
      ['M. Akliouc', 'Maghnes Akliouche', 24, 'FRA', 'CAM', 82, 88, 11],
      ['D. Zakaria', 'Denis Zakaria', 29, 'SUI', 'CDM', 82, 82, 6],
      ['A. Golovin', 'Aleksandr Golovin', 30, 'RUS', 'CAM', 81, 81, 10],
      ['M. Biereth', 'Mika Biereth', 23, 'DEN', 'ST', 80, 86, 14],
    ],
  },
  {
    id: 'fra_losc',
    fictionalName: 'Flandre Lille',
    realName: 'LOSC Lille',
    fictionalShort: 'FLL',
    realShort: 'LOSC',
    city: 'Lille',
    stadiumFictional: 'Stade Nord',
    stadiumReal: 'Stade Pierre-Mauroy',
    capacity: 50186,
    primary: '#E01E13',
    secondary: '#1D2951',
    accent: '#FFFFFF',
    pattern: 'CHEVRON',
    emblemType: 'WOLF_ROM',
    crestShape: 'SHIELD',
    stars: 2,
    foundedYear: 1944,
    budget: 42_000_000,
    wageCap: 1_550_000,
    rep: 81,
    expectation: 'Avrupa Kupaları (İlk 5)',
    formation: '4-2-3-1',
    countryCode: 'FRA',
    starsRoster: [
      ['L. Chevali', 'Lucas Chevalier', 24, 'FRA', 'GK', 83, 88, 30],
      ['E. Zhegrov', 'Edon Zhegrova', 27, 'KOS', 'RW', 82, 84, 23],
      ['A. Bouaddi', 'Ayyoub Bouaddi', 19, 'FRA', 'CM', 78, 89, 32],
    ],
  },
  {
    id: 'fra_ol',
    fictionalName: 'Rhône Lyon',
    realName: 'Olympique Lyonnais',
    fictionalShort: 'RHL',
    realShort: 'OL',
    city: 'Lyon',
    stadiumFictional: 'Parc des Lumières',
    stadiumReal: 'Groupama Stadium',
    capacity: 59186,
    primary: '#FFFFFF',
    secondary: '#14387F',
    accent: '#DA291C',
    pattern: 'SOLID',
    emblemType: 'LION_AV',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1950,
    budget: 40_000_000,
    wageCap: 1_650_000,
    rep: 81,
    expectation: 'Avrupa Kupaları',
    formation: '4-3-3',
    countryCode: 'FRA',
    starsRoster: [
      ['R. Cherki', 'Rayan Cherki', 23, 'FRA', 'CAM', 83, 89, 18],
      ['M. Fofana', 'Malick Fofana', 21, 'BEL', 'LW', 80, 88, 11],
      ['G. Mikauta', 'Georges Mikautadze', 25, 'GEO', 'ST', 80, 84, 69],
    ],
  },
  { id: 'fra_ogcn', fictionalName: 'Côte d’Azur', realName: 'OGC Nice', fictionalShort: 'CAZ', realShort: 'NIC', city: 'Nice', stadiumFictional: 'Riviera Arena', stadiumReal: 'Allianz Riviera', capacity: 36178, primary: '#CC0000', secondary: '#111111', accent: '#FFFFFF', pattern: 'STRIPES', emblemType: 'EAGLE', crestShape: 'SHIELD', stars: 1, foundedYear: 1904, budget: 32_000_000, wageCap: 1_250_000, rep: 78, expectation: 'İlk 6 Mücadelesi', formation: '3-4-3', countryCode: 'FRA' },
  { id: 'fra_rcl', fictionalName: 'Artois Lens', realName: 'RC Lens', fictionalShort: 'ART', realShort: 'RCL', city: 'Lens', stadiumFictional: 'Stade Sang et Or', stadiumReal: 'Stade Bollaert-Delelis', capacity: 38223, primary: '#E2001A', secondary: '#FFD700', accent: '#111111', pattern: 'HALVES', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 1, foundedYear: 1906, budget: 28_000_000, wageCap: 1_100_000, rep: 77, expectation: 'Üst Sıra', formation: '3-4-2-1', countryCode: 'FRA' },
  { id: 'fra_rcsa', fictionalName: 'Alsace Racing', realName: 'RC Strasbourg', fictionalShort: 'ALS', realShort: 'RCS', city: 'Strazburg', stadiumFictional: 'Stade Rhin', stadiumReal: 'Stade de la Meinau', capacity: 26109, primary: '#009FE3', secondary: '#FFFFFF', accent: '#003366', pattern: 'SOLID', emblemType: 'WAVE', crestShape: 'CIRCLE', stars: 1, foundedYear: 1906, budget: 30_000_000, wageCap: 1_050_000, rep: 76, expectation: 'İlk 8', formation: '4-2-3-1', countryCode: 'FRA' },
  { id: 'fra_srfc', fictionalName: 'Bretagne Rennes', realName: 'Stade Rennais', fictionalShort: 'BRT', realShort: 'REN', city: 'Rennes', stadiumFictional: 'Parc Armorique', stadiumReal: 'Roazhon Park', capacity: 29778, primary: '#D71920', secondary: '#111111', accent: '#FFFFFF', pattern: 'HALVES', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 1, foundedYear: 1901, budget: 34_000_000, wageCap: 1_200_000, rep: 77, expectation: 'İlk 7', formation: '4-3-3', countryCode: 'FRA' },
  { id: 'fra_sb29', fictionalName: 'Finistère Brest', realName: 'Stade Brestois 29', fictionalShort: 'FIN', realShort: 'BRE', city: 'Brest', stadiumFictional: 'Stade Océan', stadiumReal: 'Stade Francis-Le Blé', capacity: 15220, primary: '#E2001A', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'ANCHOR', crestShape: 'SHIELD', stars: 0, foundedYear: 1950, budget: 18_000_000, wageCap: 820_000, rep: 75, expectation: 'Orta Sıra', formation: '4-3-3', countryCode: 'FRA' },
  { id: 'fra_tfc', fictionalName: 'Occitanie FC', realName: 'Toulouse FC', fictionalShort: 'OCC', realShort: 'TFC', city: 'Toulouse', stadiumFictional: 'Stade Garonne', stadiumReal: 'Stadium de Toulouse', capacity: 33150, primary: '#5F259F', secondary: '#FFFFFF', accent: '#111111', pattern: 'STRIPES', emblemType: 'CROSS_CEL', crestShape: 'CIRCLE', stars: 0, foundedYear: 1970, budget: 20_000_000, wageCap: 840_000, rep: 74, expectation: 'Orta Sıra', formation: '3-4-3', countryCode: 'FRA' },
  { id: 'fra_sdr', fictionalName: 'Champagne Reims', realName: 'Stade de Reims', fictionalShort: 'CHP', realShort: 'SDR', city: 'Reims', stadiumFictional: 'Stade Marne', stadiumReal: 'Stade Auguste-Delaune', capacity: 21029, primary: '#D71920', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'SOLID', emblemType: 'CROWN_RSO', crestShape: 'SHIELD', stars: 1, foundedYear: 1931, budget: 19_000_000, wageCap: 790_000, rep: 74, expectation: 'Orta Sıra', formation: '4-3-3', countryCode: 'FRA' },
  { id: 'fra_fcn', fictionalName: 'Loire Canaris', realName: 'FC Nantes', fictionalShort: 'LOI', realShort: 'FCN', city: 'Nantes', stadiumFictional: 'Stade Atlantique', stadiumReal: 'Stade de la Beaujoire', capacity: 35322, primary: '#FDE100', secondary: '#008B47', accent: '#111111', pattern: 'SOLID', emblemType: 'CANARY', crestShape: 'SHIELD', stars: 2, foundedYear: 1943, budget: 16_000_000, wageCap: 760_000, rep: 73, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'FRA' },
  { id: 'fra_aja', fictionalName: 'Bourgogne Auxerre', realName: 'AJ Auxerre', fictionalShort: 'BRG', realShort: 'AJA', city: 'Auxerre', stadiumFictional: 'Stade Yonne', stadiumReal: 'Stade de l’Abbé-Deschamps', capacity: 18541, primary: '#FFFFFF', secondary: '#0055A4', accent: '#111111', pattern: 'SOLID', emblemType: 'CROSS_CEL', crestShape: 'SHIELD', stars: 1, foundedYear: 1905, budget: 14_000_000, wageCap: 680_000, rep: 72, expectation: 'Ligde Kalma', formation: '5-4-1', countryCode: 'FRA' },
  { id: 'fra_sco', fictionalName: 'Anjou SCO', realName: 'Angers SCO', fictionalShort: 'ANJ', realShort: 'ANG', city: 'Angers', stadiumFictional: 'Stade Maine', stadiumReal: 'Stade Raymond Kopa', capacity: 19800, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'STRIPES', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 0, foundedYear: 1919, budget: 12_000_000, wageCap: 610_000, rep: 70, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'FRA' },
  { id: 'fra_hac', fictionalName: 'Normandie Havre', realName: 'Le Havre AC', fictionalShort: 'NRM', realShort: 'HAC', city: 'Le Havre', stadiumFictional: 'Stade Manche', stadiumReal: 'Stade Océane', capacity: 25178, primary: '#75B2DD', secondary: '#1B365D', accent: '#FFFFFF', pattern: 'HALVES', emblemType: 'WAVE', crestShape: 'CIRCLE', stars: 0, foundedYear: 1872, budget: 11_000_000, wageCap: 590_000, rep: 70, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'FRA' },
  { id: 'fra_fcl', fictionalName: 'Morbihan Lorient', realName: 'FC Lorient', fictionalShort: 'MRB', realShort: 'FCL', city: 'Lorient', stadiumFictional: 'Stade Scorff', stadiumReal: 'Stade du Moustoir', capacity: 18890, primary: '#FF6600', secondary: '#111111', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'WAVE', crestShape: 'SHIELD', stars: 0, foundedYear: 1926, budget: 13_000_000, wageCap: 640_000, rep: 71, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'FRA' },
  { id: 'fra_pfc', fictionalName: 'Métropole Paris', realName: 'Paris FC', fictionalShort: 'MTP', realShort: 'PFC', city: 'Paris', stadiumFictional: 'Stade Seine', stadiumReal: 'Stade Charléty', capacity: 20000, primary: '#1C3D7A', secondary: '#FFFFFF', accent: '#E31837', pattern: 'SOLID', emblemType: 'TOWER_EFC', crestShape: 'CIRCLE', stars: 0, foundedYear: 1969, budget: 25_000_000, wageCap: 880_000, rep: 73, expectation: 'Orta Sıra', formation: '4-3-3', countryCode: 'FRA' },
];

const EREDIVISIE_DEFS: CompactClubDef[] = [
  {
    id: 'ned_psv',
    fictionalName: 'Brabant Eindhoven',
    realName: 'PSV Eindhoven',
    fictionalShort: 'BRB',
    realShort: 'PSV',
    city: 'Eindhoven',
    stadiumFictional: 'Lichtstad Arena',
    stadiumReal: 'Philips Stadion',
    capacity: 35000,
    primary: '#ED1C24',
    secondary: '#FFFFFF',
    accent: '#111111',
    pattern: 'STRIPES',
    emblemType: 'STARS_4',
    crestShape: 'OVAL',
    stars: 3,
    foundedYear: 1913,
    budget: 48_000_000,
    wageCap: 1_550_000,
    rep: 83,
    expectation: 'Eredivisie Şampiyonluğu',
    formation: '4-3-3',
    countryCode: 'NED',
    starsRoster: [
      ['J. Schoute', 'Jerdy Schouten', 29, 'NED', 'CDM', 82, 82, 22],
      ['J. Veerman', 'Joey Veerman', 27, 'NED', 'CM', 82, 83, 23],
      ['J. Bakayok', 'Johan Bakayoko', 23, 'BEL', 'RW', 82, 88, 11],
      ['R. Pepi', 'Ricardo Pepi', 23, 'USA', 'ST', 80, 86, 9],
      ['N. Lang', 'Noa Lang', 27, 'NED', 'LW', 81, 82, 10],
    ],
  },
  {
    id: 'ned_aja',
    fictionalName: 'Amstel AFC',
    realName: 'AFC Ajax',
    fictionalShort: 'AMS',
    realShort: 'AJA',
    city: 'Amsterdam',
    stadiumFictional: 'Amstel Arena',
    stadiumReal: 'Johan Cruyff Arena',
    capacity: 55865,
    primary: '#FFFFFF',
    secondary: '#D2122E',
    accent: '#111111',
    pattern: 'SOLID',
    emblemType: 'STARS_4',
    crestShape: 'CIRCLE',
    stars: 3,
    foundedYear: 1900,
    budget: 44_000_000,
    wageCap: 1_500_000,
    rep: 83,
    expectation: 'Şampiyonluk Yarışı',
    formation: '4-3-3',
    countryCode: 'NED',
    starsRoster: [
      ['J. Hato', 'Jorrel Hato', 20, 'NED', 'LB', 81, 90, 4],
      ['K. Taylor', 'Kenneth Taylor', 24, 'NED', 'CM', 80, 85, 8],
      ['M. Godts', 'Mika Godts', 21, 'BEL', 'LW', 79, 87, 11],
      ['B. Brobbey', 'Brian Brobbey', 24, 'NED', 'ST', 80, 85, 9],
    ],
  },
  {
    id: 'ned_fey',
    fictionalName: 'Maas Rotterdam',
    realName: 'Feyenoord',
    fictionalShort: 'MAA',
    realShort: 'FEY',
    city: 'Rotterdam',
    stadiumFictional: 'Haven Stadion',
    stadiumReal: 'De Kuip',
    capacity: 47500,
    primary: '#EE1C25',
    secondary: '#FFFFFF',
    accent: '#111111',
    pattern: 'HALVES',
    emblemType: 'ANCHOR',
    crestShape: 'CIRCLE',
    stars: 2,
    foundedYear: 1908,
    budget: 40_000_000,
    wageCap: 1_400_000,
    rep: 82,
    expectation: 'Şampiyonluk & Şampiyonlar Ligi',
    formation: '4-3-3',
    countryCode: 'NED',
    starsRoster: [
      ['D. Hancko', 'Dávid Hancko', 28, 'SVK', 'CB', 83, 84, 33],
      ['Q. Timber', 'Quinten Timber', 25, 'NED', 'CM', 82, 86, 8],
      ['I. Paixão', 'Igor Paixão', 26, 'BRA', 'LW', 81, 84, 14],
    ],
  },
  { id: 'ned_az', fictionalName: 'Noord-Holland AZ', realName: 'AZ Alkmaar', fictionalShort: 'NHA', realShort: 'AZ', city: 'Alkmaar', stadiumFictional: 'Kaasmarkt Stadion', stadiumReal: 'AFAS Stadion', capacity: 19500, primary: '#DB0029', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'WINDMILL', crestShape: 'SHIELD', stars: 1, foundedYear: 1967, budget: 24_000_000, wageCap: 920_000, rep: 78, expectation: 'Avrupa Kupaları (İlk 4)', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_twe', fictionalName: 'Overijssel Twente', realName: 'FC Twente', fictionalShort: 'OVR', realShort: 'TWE', city: 'Enschede', stadiumFictional: 'Oost Stadion', stadiumReal: 'De Grolsch Veste', capacity: 30205, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'HORSE_ITFC', crestShape: 'SHIELD', stars: 1, foundedYear: 1965, budget: 20_000_000, wageCap: 820_000, rep: 77, expectation: 'İlk 5', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_utr', fictionalName: 'Domstad Utrecht', realName: 'FC Utrecht', fictionalShort: 'DOM', realShort: 'UTR', city: 'Utrecht', stadiumFictional: 'Dom Stadion', stadiumReal: 'Stadion Galgenwaard', capacity: 23750, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SASH', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1970, budget: 16_000_000, wageCap: 720_000, rep: 75, expectation: 'Avrupa Play-off', formation: '4-3-3', countryCode: 'NED' },
  { id: 'ned_gae', fictionalName: 'IJssel Eagles', realName: 'Go Ahead Eagles', fictionalShort: 'IJS', realShort: 'GAE', city: 'Deventer', stadiumFictional: 'Adelaar Park', stadiumReal: 'De Adelaarshorst', capacity: 10400, primary: '#E30613', secondary: '#FFD700', accent: '#FFFFFF', pattern: 'STRIPES', emblemType: 'EAGLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1902, budget: 10_000_000, wageCap: 520_000, rep: 72, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_nec', fictionalName: 'Waal Nijmegen', realName: 'NEC Nijmegen', fictionalShort: 'WAA', realShort: 'NEC', city: 'Nijmegen', stadiumFictional: 'Waal Stadion', stadiumReal: 'Goffertstadion', capacity: 12500, primary: '#E30613', secondary: '#00843D', accent: '#111111', pattern: 'HALVES', emblemType: 'EAGLE_DOUBLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1900, budget: 11_000_000, wageCap: 540_000, rep: 72, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_hee', fictionalName: 'Friesland SC', realName: 'sc Heerenveen', fictionalShort: 'FRI', realShort: 'HEE', city: 'Heerenveen', stadiumFictional: 'Fries Stadion', stadiumReal: 'Abe Lenstra Stadion', capacity: 27224, primary: '#005BAC', secondary: '#FFFFFF', accent: '#E30613', pattern: 'STRIPES', emblemType: 'WAVE', crestShape: 'SHIELD', stars: 0, foundedYear: 1920, budget: 11_000_000, wageCap: 560_000, rep: 72, expectation: 'Orta Sıra', formation: '4-3-3', countryCode: 'NED' },
  { id: 'ned_spa', fictionalName: 'Spangen Rotterdam', realName: 'Sparta Rotterdam', fictionalShort: 'SPG', realShort: 'SPA', city: 'Rotterdam', stadiumFictional: 'Kasteel Park', stadiumReal: 'Het Kasteel', capacity: 11026, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'STRIPES', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 1, foundedYear: 1888, budget: 9_500_000, wageCap: 490_000, rep: 71, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_for', fictionalName: 'Limburg Sittard', realName: 'Fortuna Sittard', fictionalShort: 'LMB', realShort: 'FOR', city: 'Sittard', stadiumFictional: 'Zuid Stadion', stadiumReal: 'Fortuna Sittard Stadion', capacity: 12800, primary: '#FFD700', secondary: '#00843D', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'STAR_GREEN', crestShape: 'CIRCLE', stars: 0, foundedYear: 1968, budget: 8_500_000, wageCap: 460_000, rep: 70, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'NED' },
  { id: 'ned_gro', fictionalName: 'Noord Groningen', realName: 'FC Groningen', fictionalShort: 'GRN', realShort: 'GRO', city: 'Groningen', stadiumFictional: 'Martini Stadion', stadiumReal: 'Euroborg', capacity: 22550, primary: '#00843D', secondary: '#FFFFFF', accent: '#111111', pattern: 'STRIPES', emblemType: 'STAR_GREEN', crestShape: 'SHIELD', stars: 0, foundedYear: 1971, budget: 9_000_000, wageCap: 480_000, rep: 71, expectation: 'Orta Sıra', formation: '4-4-2', countryCode: 'NED' },
  { id: 'ned_pec', fictionalName: 'Overijssel Zwolle', realName: 'PEC Zwolle', fictionalShort: 'ZWL', realShort: 'PEC', city: 'Zwolle', stadiumFictional: 'Blauwvinger Park', stadiumReal: 'MAC³PARK Stadion', capacity: 14000, primary: '#005BAC', secondary: '#FFFFFF', accent: '#111111', pattern: 'HOOPS', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 0, foundedYear: 1910, budget: 7_500_000, wageCap: 430_000, rep: 69, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_her', fictionalName: 'Almelo Zwart-Wit', realName: 'Heracles Almelo', fictionalShort: 'ALM', realShort: 'HER', city: 'Almelo', stadiumFictional: 'Twente Arena', stadiumReal: 'Asito Stadion', capacity: 12080, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'STRIPES', emblemType: 'LION_AV', crestShape: 'SHIELD', stars: 0, foundedYear: 1903, budget: 7_000_000, wageCap: 420_000, rep: 69, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'NED' },
  { id: 'ned_nac', fictionalName: 'Breda Geel-Zwart', realName: 'NAC Breda', fictionalShort: 'BRD', realShort: 'NAC', city: 'Breda', stadiumFictional: 'Brabant Park', stadiumReal: 'Rat Verlegh Stadion', capacity: 19000, primary: '#FFD700', secondary: '#111111', accent: '#FFFFFF', pattern: 'SASH', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1912, budget: 7_200_000, wageCap: 410_000, rep: 69, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'NED' },
  { id: 'ned_wil', fictionalName: 'Tilburg Tricolores', realName: 'Willem II', fictionalShort: 'TLB', realShort: 'WIL', city: 'Tilburg', stadiumFictional: 'Koning Park', stadiumReal: 'Koning Willem II Stadion', capacity: 14700, primary: '#E30613', secondary: '#FFFFFF', accent: '#005BAC', pattern: 'STRIPES', emblemType: 'CROWN_RM', crestShape: 'SHIELD', stars: 0, foundedYear: 1896, budget: 6_800_000, wageCap: 400_000, rep: 68, expectation: 'Ligde Kalma', formation: '5-3-2', countryCode: 'NED' },
  { id: 'ned_rkc', fictionalName: 'Waalwijk Geel', realName: 'RKC Waalwijk', fictionalShort: 'WWK', realShort: 'RKC', city: 'Waalwijk', stadiumFictional: 'Langstraat Park', stadiumReal: 'Mandemakers Stadion', capacity: 7500, primary: '#FFD700', secondary: '#005BAC', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'WINDMILL', crestShape: 'CIRCLE', stars: 0, foundedYear: 1940, budget: 5_800_000, wageCap: 370_000, rep: 67, expectation: 'Ligde Kalma', formation: '4-3-3', countryCode: 'NED' },
  { id: 'ned_vol', fictionalName: 'Markermeer FC', realName: 'FC Volendam', fictionalShort: 'MRK', realShort: 'VOL', city: 'Volendam', stadiumFictional: 'Dijk Stadion', stadiumReal: 'Kras Stadion', capacity: 6984, primary: '#FF6600', secondary: '#111111', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'WAVE', crestShape: 'CIRCLE', stars: 0, foundedYear: 1977, budget: 5_500_000, wageCap: 350_000, rep: 67, expectation: 'Ligde Kalma', formation: '4-3-3', countryCode: 'NED' },
];

const LIGA_PORTUGAL_DEFS: CompactClubDef[] = [
  {
    id: 'por_scp',
    fictionalName: 'Lisboa Leões',
    realName: 'Sporting CP',
    fictionalShort: 'LSL',
    realShort: 'SCP',
    city: 'Lizbon',
    stadiumFictional: 'Estádio Verde',
    stadiumReal: 'Estádio José Alvalade',
    capacity: 50095,
    primary: '#008057',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    pattern: 'HOOPS',
    emblemType: 'LION_AV',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1906,
    budget: 52_000_000,
    wageCap: 1_650_000,
    rep: 84,
    expectation: 'Liga Portugal Şampiyonluğu',
    formation: '3-4-2-1',
    countryCode: 'POR',
    starsRoster: [
      ['G. Inácio', 'Gonçalo Inácio', 25, 'POR', 'CB', 83, 88, 25],
      ['O. Diomand', 'Ousmane Diomande', 22, 'CIV', 'CB', 82, 89, 26],
      ['M. Hjulman', 'Morten Hjulmand', 27, 'DEN', 'CDM', 84, 86, 42],
      ['P. Gonçalv', 'Pedro Gonçalves', 28, 'POR', 'CAM', 83, 84, 8],
      ['F. Trincão', 'Francisco Trincão', 26, 'POR', 'RW', 83, 86, 17],
      ['G. Quenda', 'Geovany Quenda', 19, 'POR', 'RW', 79, 90, 52],
    ],
  },
  {
    id: 'por_slb',
    fictionalName: 'Águias Lisboa',
    realName: 'SL Benfica',
    fictionalShort: 'AGL',
    realShort: 'SLB',
    city: 'Lizbon',
    stadiumFictional: 'Estádio da Luzia',
    stadiumReal: 'Estádio da Luz',
    capacity: 64642,
    primary: '#E83030',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    pattern: 'SOLID',
    emblemType: 'EAGLE',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1904,
    budget: 56_000_000,
    wageCap: 1_800_000,
    rep: 85,
    expectation: 'Liga Portugal Şampiyonluğu',
    formation: '4-3-3',
    countryCode: 'POR',
    starsRoster: [
      ['A. Trubin', 'Anatoliy Trubin', 25, 'UKR', 'GK', 83, 88, 1],
      ['A. Silva', 'António Silva', 22, 'POR', 'CB', 82, 89, 4],
      ['F. Aursne', 'Fredrik Aursnes', 30, 'NOR', 'CM', 82, 82, 8],
      ['A. Schjeld', 'Andreas Schjelderup', 22, 'NOR', 'LW', 80, 88, 21],
      ['V. Pavlidi', 'Vangelis Pavlidis', 27, 'GRE', 'ST', 82, 84, 14],
    ],
  },
  {
    id: 'por_fcp',
    fictionalName: 'Dragões Porto',
    realName: 'FC Porto',
    fictionalShort: 'DRP',
    realShort: 'FCP',
    city: 'Porto',
    stadiumFictional: 'Estádio Douro',
    stadiumReal: 'Estádio do Dragão',
    capacity: 50033,
    primary: '#00428C',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    pattern: 'STRIPES',
    emblemType: 'DRAGON_WRE',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1893,
    budget: 45_000_000,
    wageCap: 1_550_000,
    rep: 84,
    expectation: 'Şampiyonluk Yarışı',
    formation: '4-2-3-1',
    countryCode: 'POR',
    starsRoster: [
      ['D. Costa', 'Diogo Costa', 27, 'POR', 'GK', 86, 89, 99],
      ['A. Varela', 'Alan Varela', 25, 'ARG', 'CDM', 82, 86, 22],
      ['R. Mora', 'Rodrigo Mora', 19, 'POR', 'CAM', 79, 91, 86],
      ['S. Aghehow', 'Samu Aghehowa', 22, 'ESP', 'ST', 82, 89, 9],
    ],
  },
  { id: 'por_scb', fictionalName: 'Minho Braga', realName: 'SC Braga', fictionalShort: 'MNH', realShort: 'SCB', city: 'Braga', stadiumFictional: 'Estádio Pedreira', stadiumReal: 'Estádio Municipal de Braga', capacity: 30286, primary: '#E30613', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'SOLID', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 1, foundedYear: 1921, budget: 22_000_000, wageCap: 850_000, rep: 78, expectation: 'İlk 4 & Avrupa', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_vsc', fictionalName: 'Guimarães Conquistadores', realName: 'Vitória SC', fictionalShort: 'GUI', realShort: 'VSC', city: 'Guimarães', stadiumFictional: 'Estádio Castelo', stadiumReal: 'Estádio D. Afonso Henriques', capacity: 30000, primary: '#FFFFFF', secondary: '#111111', accent: '#D4AF37', pattern: 'SOLID', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1922, budget: 14_000_000, wageCap: 620_000, rep: 75, expectation: 'İlk 5', formation: '4-3-3', countryCode: 'POR' },
  { id: 'por_scl', fictionalName: 'Açores Clara', realName: 'Santa Clara', fictionalShort: 'ACR', realShort: 'SCL', city: 'Ponta Delgada', stadiumFictional: 'Estádio Atlântico', stadiumReal: 'Estádio de São Miguel', capacity: 12500, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'EAGLE', crestShape: 'SHIELD', stars: 0, foundedYear: 1921, budget: 9_000_000, wageCap: 460_000, rep: 72, expectation: 'Üst Orta Sıra', formation: '3-4-3', countryCode: 'POR' },
  { id: 'por_fam', fictionalName: 'Famalicão FC', realName: 'FC Famalicão', fictionalShort: 'FML', realShort: 'FAM', city: 'Vila Nova de Famalicão', stadiumFictional: 'Estádio Minho', stadiumReal: 'Estádio Municipal 22 de Junho', capacity: 5186, primary: '#00428C', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 0, foundedYear: 1931, budget: 9_500_000, wageCap: 480_000, rep: 72, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_cas', fictionalName: 'Pina Lisboa', realName: 'Casa Pia AC', fictionalShort: 'PIN', realShort: 'CPA', city: 'Lizbon', stadiumFictional: 'Estádio Pina', stadiumReal: 'Estádio Municipal de Rio Maior', capacity: 7000, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'SOLID', emblemType: 'TOWER_EFC', crestShape: 'SHIELD', stars: 0, foundedYear: 1920, budget: 8_000_000, wageCap: 430_000, rep: 71, expectation: 'Orta Sıra', formation: '3-4-3', countryCode: 'POR' },
  { id: 'por_rio', fictionalName: 'Vila do Conde', realName: 'Rio Ave FC', fictionalShort: 'VDC', realShort: 'RIO', city: 'Vila do Conde', stadiumFictional: 'Estádio Ave', stadiumReal: 'Estádio dos Arcos', capacity: 5300, primary: '#008057', secondary: '#FFFFFF', accent: '#111111', pattern: 'STRIPES', emblemType: 'ANCHOR', crestShape: 'SHIELD', stars: 0, foundedYear: 1939, budget: 8_200_000, wageCap: 440_000, rep: 71, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_mor', fictionalName: 'Moreira Cónegos', realName: 'Moreirense FC', fictionalShort: 'MRC', realShort: 'MOR', city: 'Moreira de Cónegos', stadiumFictional: 'Parque Verde', stadiumReal: 'Parque Joaquim de Almeida Freitas', capacity: 6153, primary: '#008057', secondary: '#FFFFFF', accent: '#111111', pattern: 'HOOPS', emblemType: 'STAR_GREEN', crestShape: 'SHIELD', stars: 0, foundedYear: 1938, budget: 7_500_000, wageCap: 410_000, rep: 70, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_gil', fictionalName: 'Barcelos Galos', realName: 'Gil Vicente FC', fictionalShort: 'BRC', realShort: 'GIL', city: 'Barcelos', stadiumFictional: 'Estádio Galo', stadiumReal: 'Estádio Cidade de Barcelos', capacity: 12046, primary: '#E30613', secondary: '#00428C', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'COCKEREL', crestShape: 'SHIELD', stars: 0, foundedYear: 1924, budget: 7_200_000, wageCap: 400_000, rep: 70, expectation: 'Ligde Kalma', formation: '4-3-3', countryCode: 'POR' },
  { id: 'por_est', fictionalName: 'Cascais Praia', realName: 'Estoril Praia', fictionalShort: 'CSC', realShort: 'EST', city: 'Estoril', stadiumFictional: 'Estádio Sol', stadiumReal: 'Estádio António Coimbra da Mota', capacity: 8000, primary: '#FFD700', secondary: '#00428C', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'SUN_WAVE', crestShape: 'SHIELD', stars: 0, foundedYear: 1939, budget: 7_800_000, wageCap: 410_000, rep: 70, expectation: 'Orta Sıra', formation: '3-4-3', countryCode: 'POR' },
  { id: 'por_ama', fictionalName: 'Amadora Tricolor', realName: 'Estrela da Amadora', fictionalShort: 'AMD', realShort: 'AMA', city: 'Amadora', stadiumFictional: 'Estádio Estrela', stadiumReal: 'Estádio José Gomes', capacity: 9288, primary: '#E30613', secondary: '#008057', accent: '#FFFFFF', pattern: 'STRIPES', emblemType: 'STAR_GREEN', crestShape: 'SHIELD', stars: 0, foundedYear: 1932, budget: 6_500_000, wageCap: 370_000, rep: 69, expectation: 'Ligde Kalma', formation: '3-4-3', countryCode: 'POR' },
  { id: 'por_aro', fictionalName: 'Arouca Serra', realName: 'FC Arouca', fictionalShort: 'ARS', realShort: 'ARO', city: 'Arouca', stadiumFictional: 'Estádio Serra', stadiumReal: 'Estádio Municipal de Arouca', capacity: 5600, primary: '#FFD700', secondary: '#00428C', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'SNOW_PEAK', crestShape: 'SHIELD', stars: 0, foundedYear: 1951, budget: 6_800_000, wageCap: 380_000, rep: 69, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_nac', fictionalName: 'Madeira Alvinegro', realName: 'CD Nacional', fictionalShort: 'MDR', realShort: 'NAC', city: 'Funchal', stadiumFictional: 'Estádio Ilha', stadiumReal: 'Estádio da Madeira', capacity: 5200, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'STRIPES', emblemType: 'WAVE', crestShape: 'SHIELD', stars: 0, foundedYear: 1910, budget: 6_200_000, wageCap: 350_000, rep: 68, expectation: 'Ligde Kalma', formation: '4-3-3', countryCode: 'POR' },
  { id: 'por_avs', fictionalName: 'Vila das Aves', realName: 'AVS Futebol SAD', fictionalShort: 'VDA', realShort: 'AVS', city: 'Vila das Aves', stadiumFictional: 'Estádio Aves', stadiumReal: 'Estádio do CD Aves', capacity: 6230, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'FALCON', crestShape: 'SHIELD', stars: 0, foundedYear: 2023, budget: 5_800_000, wageCap: 340_000, rep: 67, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'POR' },
  { id: 'por_far', fictionalName: 'Algarve Faro', realName: 'SC Farense', fictionalShort: 'ALG', realShort: 'FAR', city: 'Faro', stadiumFictional: 'Estádio Sul', stadiumReal: 'Estádio de São Luís', capacity: 7000, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'HALVES', emblemType: 'LION_AV', crestShape: 'SHIELD', stars: 0, foundedYear: 1910, budget: 5_500_000, wageCap: 330_000, rep: 67, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'POR' },
  { id: 'por_boa', fictionalName: 'Xadrez Porto', realName: 'Boavista FC', fictionalShort: 'XDR', realShort: 'BFC', city: 'Porto', stadiumFictional: 'Estádio Bessa', stadiumReal: 'Estádio do Bessa', capacity: 28263, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'HALVES', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 1, foundedYear: 1903, budget: 6_000_000, wageCap: 360_000, rep: 68, expectation: 'Ligde Kalma', formation: '4-2-3-1', countryCode: 'POR' },
];

const BELGIAN_PRO_LEAGUE_DEFS: CompactClubDef[] = [
  {
    id: 'bel_bru',
    fictionalName: 'Vlaanderen Brugge',
    realName: 'Club Brugge KV',
    fictionalShort: 'VLB',
    realShort: 'BRU',
    city: 'Brugge',
    stadiumFictional: 'Brugge Arena',
    stadiumReal: 'Jan Breydel Stadium',
    capacity: 29042,
    primary: '#0055A4',
    secondary: '#111111',
    accent: '#FFFFFF',
    pattern: 'STRIPES',
    emblemType: 'CROWN_RM',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1891,
    budget: 38_000_000,
    wageCap: 1_250_000,
    rep: 81,
    expectation: 'Belçika Pro Lig Şampiyonluğu',
    formation: '4-2-3-1',
    countryCode: 'BEL',
    starsRoster: [
      ['S. Mignole', 'Simon Mignolet', 38, 'BEL', 'GK', 79, 79, 22],
      ['M. De Cuyp', 'Maxim De Cuyper', 25, 'BEL', 'LB', 81, 85, 55],
      ['H. Vanaken', 'Hans Vanaken', 34, 'BEL', 'CAM', 81, 81, 20],
      ['C. Tzolis', 'Christos Tzolis', 24, 'GRE', 'LW', 81, 86, 8],
    ],
  },
  {
    id: 'bel_usg',
    fictionalName: 'Saint-Gilles Union',
    realName: 'Royale Union SG',
    fictionalShort: 'SGU',
    realShort: 'USG',
    city: 'Brüksel',
    stadiumFictional: 'Parc Duden',
    stadiumReal: 'Joseph Marien Stadium',
    capacity: 9400,
    primary: '#FFD700',
    secondary: '#00428C',
    accent: '#FFFFFF',
    pattern: 'SOLID',
    emblemType: 'STAR_GREEN',
    crestShape: 'SHIELD',
    stars: 2,
    foundedYear: 1897,
    budget: 26_000_000,
    wageCap: 920_000,
    rep: 79,
    expectation: 'Şampiyonluk Yarışı',
    formation: '3-5-2',
    countryCode: 'BEL',
  },
  {
    id: 'bel_gnk',
    fictionalName: 'Limburg Genk',
    realName: 'KRC Genk',
    fictionalShort: 'LMG',
    realShort: 'GNK',
    city: 'Genk',
    stadiumFictional: 'Limburg Arena',
    stadiumReal: 'Cegeka Arena',
    capacity: 23718,
    primary: '#0055A4',
    secondary: '#FFFFFF',
    accent: '#111111',
    pattern: 'SOLID',
    emblemType: 'DIAMOND_BVB',
    crestShape: 'SHIELD',
    stars: 2,
    foundedYear: 1988,
    budget: 28_000_000,
    wageCap: 980_000,
    rep: 79,
    expectation: 'Şampiyonluk Yarışı',
    formation: '4-2-3-1',
    countryCode: 'BEL',
  },
  {
    id: 'bel_and',
    fictionalName: 'Brussel Paars-Wit',
    realName: 'RSC Anderlecht',
    fictionalShort: 'BPW',
    realShort: 'AND',
    city: 'Brüksel',
    stadiumFictional: 'Brussel Park',
    stadiumReal: 'Lotto Park',
    capacity: 21500,
    primary: '#5F259F',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    pattern: 'SOLID',
    emblemType: 'CROWN_RM',
    crestShape: 'SHIELD',
    stars: 3,
    foundedYear: 1908,
    budget: 27_000_000,
    wageCap: 1_050_000,
    rep: 79,
    expectation: 'İlk 3 & Avrupa',
    formation: '4-3-3',
    countryCode: 'BEL',
  },
  { id: 'bel_ant', fictionalName: 'Schelde Antwerp', realName: 'Royal Antwerp FC', fictionalShort: 'SCH', realShort: 'ANT', city: 'Anvers', stadiumFictional: 'Bosuil Arena', stadiumReal: 'Bosuilstadion', capacity: 16144, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'CASTLE', crestShape: 'SHIELD', stars: 1, foundedYear: 1880, budget: 20_000_000, wageCap: 820_000, rep: 77, expectation: 'İlk 4', formation: '4-2-3-1', countryCode: 'BEL' },
  { id: 'bel_gnt', fictionalName: 'Artevelde Gent', realName: 'KAA Gent', fictionalShort: 'ART', realShort: 'GNT', city: 'Gent', stadiumFictional: 'Artevelde Arena', stadiumReal: 'Planet Group Arena', capacity: 20175, primary: '#0055A4', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 1, foundedYear: 1900, budget: 19_000_000, wageCap: 790_000, rep: 76, expectation: 'İlk 5', formation: '4-2-3-1', countryCode: 'BEL' },
  { id: 'bel_sta', fictionalName: 'Meuse Liège', realName: 'Standard Liège', fictionalShort: 'MSL', realShort: 'STA', city: 'Liège', stadiumFictional: 'Stade Meuse', stadiumReal: 'Stade Maurice Dufrasne', capacity: 27670, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'SHIELD_GET', crestShape: 'SHIELD', stars: 2, foundedYear: 1898, budget: 14_000_000, wageCap: 680_000, rep: 74, expectation: 'İlk 6', formation: '3-5-2', countryCode: 'BEL' },
  { id: 'bel_mec', fictionalName: 'Dijle Mechelen', realName: 'KV Mechelen', fictionalShort: 'DJL', realShort: 'MEC', city: 'Mechelen', stadiumFictional: 'Achter de Kazerne', stadiumReal: 'AFAS Stadion Mechelen', capacity: 16672, primary: '#FFD700', secondary: '#E30613', accent: '#111111', pattern: 'STRIPES', emblemType: 'CROWN_RSO', crestShape: 'SHIELD', stars: 1, foundedYear: 1904, budget: 10_000_000, wageCap: 540_000, rep: 72, expectation: 'Orta Sıra', formation: '3-4-2-1', countryCode: 'BEL' },
  { id: 'bel_cer', fictionalName: 'Groen-Zwart Brugge', realName: 'Cercle Brugge', fictionalShort: 'GZB', realShort: 'CER', city: 'Brugge', stadiumFictional: 'Noord Park', stadiumReal: 'Jan Breydel Stadium', capacity: 29042, primary: '#008057', secondary: '#111111', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'STAR_GREEN', crestShape: 'CIRCLE', stars: 0, foundedYear: 1899, budget: 11_000_000, wageCap: 560_000, rep: 72, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'BEL' },
  { id: 'bel_cha', fictionalName: 'Hainaut Zebras', realName: 'Sporting Charleroi', fictionalShort: 'HNZ', realShort: 'CHA', city: 'Charleroi', stadiumFictional: 'Stade Pays Noir', stadiumReal: 'Stade du Pays de Charleroi', capacity: 15000, primary: '#111111', secondary: '#FFFFFF', accent: '#D4AF37', pattern: 'STRIPES', emblemType: 'ZEBRA_JUV', crestShape: 'SHIELD', stars: 0, foundedYear: 1904, budget: 10_500_000, wageCap: 530_000, rep: 72, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'BEL' },
  { id: 'bel_ohl', fictionalName: 'Brabant Leuven', realName: 'OH Leuven', fictionalShort: 'BRL', realShort: 'OHL', city: 'Leuven', stadiumFictional: 'Den Dreef Park', stadiumReal: 'King Power at Den Dreef', capacity: 10020, primary: '#FFFFFF', secondary: '#111111', accent: '#E30613', pattern: 'SOLID', emblemType: 'LION_AV', crestShape: 'SHIELD', stars: 0, foundedYear: 2002, budget: 10_000_000, wageCap: 510_000, rep: 71, expectation: 'Orta Sıra', formation: '3-5-2', countryCode: 'BEL' },
  { id: 'bel_wes', fictionalName: 'Kempen Westerlo', realName: 'KVC Westerlo', fictionalShort: 'KMP', realShort: 'WES', city: 'Westerlo', stadiumFictional: 'Kempen Park', stadiumReal: 'Het Kuipje', capacity: 8035, primary: '#FFD700', secondary: '#0055A4', accent: '#FFFFFF', pattern: 'SOLID', emblemType: 'STAR_GREEN', crestShape: 'SHIELD', stars: 0, foundedYear: 1933, budget: 9_500_000, wageCap: 490_000, rep: 71, expectation: 'Orta Sıra', formation: '4-2-3-1', countryCode: 'BEL' },
  { id: 'bel_stv', fictionalName: 'Haspengouw STVV', realName: 'Sint-Truidense VV', fictionalShort: 'HSP', realShort: 'STV', city: 'Sint-Truiden', stadiumFictional: 'Stayen Arena', stadiumReal: 'Stayen', capacity: 14600, primary: '#FFD700', secondary: '#0055A4', accent: '#111111', pattern: 'SOLID', emblemType: 'CANARY', crestShape: 'SHIELD', stars: 0, foundedYear: 1924, budget: 8_500_000, wageCap: 450_000, rep: 70, expectation: 'Ligde Kalma', formation: '3-4-2-1', countryCode: 'BEL' },
  { id: 'bel_den', fictionalName: 'Denderleeuw FC', realName: 'FCV Dender EH', fictionalShort: 'DND', realShort: 'DEN', city: 'Denderleeuw', stadiumFictional: 'Dender Park', stadiumReal: 'Florent Beeckmanstadion', capacity: 6429, primary: '#0055A4', secondary: '#111111', accent: '#FFFFFF', pattern: 'STRIPES', emblemType: 'WAVE', crestShape: 'SHIELD', stars: 0, foundedYear: 2005, budget: 6_500_000, wageCap: 370_000, rep: 68, expectation: 'Ligde Kalma', formation: '3-5-2', countryCode: 'BEL' },
  { id: 'bel_kor', fictionalName: 'Leie Kortrijk', realName: 'KV Kortrijk', fictionalShort: 'LEI', realShort: 'KVK', city: 'Kortrijk', stadiumFictional: 'Guldensporen Park', stadiumReal: 'Guldensporenstadion', capacity: 9399, primary: '#E30613', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'LION_AV', crestShape: 'SHIELD', stars: 0, foundedYear: 1901, budget: 6_800_000, wageCap: 390_000, rep: 68, expectation: 'Ligde Kalma', formation: '3-4-3', countryCode: 'BEL' },
  { id: 'bel_bee', fictionalName: 'Kiel Beerschot', realName: 'Beerschot VA', fictionalShort: 'KIL', realShort: 'BEE', city: 'Anvers', stadiumFictional: 'Kiel Stadion', stadiumReal: 'Olympisch Stadion', capacity: 12771, primary: '#5F259F', secondary: '#FFFFFF', accent: '#111111', pattern: 'SOLID', emblemType: 'BEAR_ATM', crestShape: 'SHIELD', stars: 0, foundedYear: 1899, budget: 6_200_000, wageCap: 360_000, rep: 67, expectation: 'Ligde Kalma', formation: '4-4-2', countryCode: 'BEL' },
];

export const LIGUE_1_SEEDS: ClubSeed[] = LIGUE_1_DEFS.map(buildClubSeed);
export const EREDIVISIE_SEEDS: ClubSeed[] = EREDIVISIE_DEFS.map(buildClubSeed);
export const LIGA_PORTUGAL_SEEDS: ClubSeed[] = LIGA_PORTUGAL_DEFS.map(buildClubSeed);
export const BELGIAN_PRO_LEAGUE_SEEDS: ClubSeed[] = BELGIAN_PRO_LEAGUE_DEFS.map(buildClubSeed);

type ClubFactory = (seed: ClubSeed, leagueId: LeagueId) => Club;

export function buildLigue1Clubs(buildClubFromSeed: ClubFactory): Club[] {
  return LIGUE_1_SEEDS.map((seed) => buildClubFromSeed(seed, 'LIGUE_1'));
}

export function buildEredivisieClubs(buildClubFromSeed: ClubFactory): Club[] {
  return EREDIVISIE_SEEDS.map((seed) => buildClubFromSeed(seed, 'EREDIVISIE'));
}

export function buildLigaPortugalClubs(buildClubFromSeed: ClubFactory): Club[] {
  return LIGA_PORTUGAL_SEEDS.map((seed) => buildClubFromSeed(seed, 'LIGA_PORTUGAL'));
}

export function buildBelgianProLeagueClubs(buildClubFromSeed: ClubFactory): Club[] {
  return BELGIAN_PRO_LEAGUE_SEEDS.map((seed) => buildClubFromSeed(seed, 'BELGIAN_PRO_LEAGUE'));
}
