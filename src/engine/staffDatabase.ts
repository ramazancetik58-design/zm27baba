import { LeagueId, StaffMember, StaffRole } from './types';

interface StaffBlueprint {
  realName: string;
  fictionalName: string;
  role: StaffRole;
  nationality: string;
  age: number;
  rating: number;
  specialty: string;
}

/**
 * Researched Coaching & Backroom Staff across Süper Lig, 1. Lig, 2. Lig, Premier League, La Liga, Serie A, Bundesliga & EFL Championship.
 * In FULL_LICENSE mode realName is shown; in NO_DATA mode fictionalName is shown.
 */
const CLUB_STAFF_OVERRIDES: Record<string, StaffBlueprint[]> = {
  // Süper Lig
  gs: [
    { realName: 'Okan Buruk', fictionalName: 'Orhan Bulut', role: 'ASSISTANT', nationality: 'TUR', age: 52, rating: 86, specialty: 'Gegenpress & Hücum Geçişleri' },
    { realName: 'İrfan Saraloğlu', fictionalName: 'İlker Saraçoğlu', role: 'FITNESS', nationality: 'TUR', age: 54, rating: 81, specialty: 'Maç İçi Yüksek Tempo Dayanıklılık' },
    { realName: 'Emre Utkucan', fictionalName: 'Enes Utkulu', role: 'CHIEF_SCOUT', nationality: 'TUR', age: 44, rating: 84, specialty: 'Güney Amerika & Avrupa Fırsat Ağı' },
    { realName: 'Dr. Yener İnce', fictionalName: 'Dr. Yaman İnce', role: 'HEAD_PHYSIO', nationality: 'TUR', age: 49, rating: 83, specialty: 'Kas Yaralanması & Hızlı Rehabilitasyon' },
    { realName: 'Hakan Balta', fictionalName: 'Haluk Batur', role: 'YOUTH_DIRECTOR', nationality: 'TUR', age: 43, rating: 80, specialty: 'Florya Akademi & Savunma Mentorluğu' },
  ],
  fb: [
    { realName: 'Zeki Murat Göle', fictionalName: 'Zafer Murat Güleç', role: 'ASSISTANT', nationality: 'TUR', age: 47, rating: 82, specialty: 'Duran Top & Blok Geçiş Disiplini' },
    { realName: 'Stefano Rapetti', fictionalName: 'Simone Rinaldi', role: 'FITNESS', nationality: 'ITA', age: 50, rating: 84, specialty: 'Patlayıcı Güç & Yoğun Fikstür Yüklemesi' },
    { realName: 'Devin Özek', fictionalName: 'Doruk Özer', role: 'CHIEF_SCOUT', nationality: 'GER', age: 31, rating: 83, specialty: 'Veri Odaklı Wonderkid Avcılığı' },
    { realName: 'Dr. Ahmet Kulbilge', fictionalName: 'Dr. Alper Kulbilge', role: 'HEAD_PHYSIO', nationality: 'TUR', age: 44, rating: 81, specialty: 'Ortopedik Rehabilitasyon' },
    { realName: 'Tahir Karapınar', fictionalName: 'Tarık Karapınar', role: 'YOUTH_DIRECTOR', nationality: 'TUR', age: 59, rating: 79, specialty: 'U19 A Takım Geçiş Programı' },
  ],
  bjk: [
    { realName: 'Serdar Topraktepe', fictionalName: 'Sedat Toprak', role: 'ASSISTANT', nationality: 'TUR', age: 50, rating: 80, specialty: 'Üçüncü Bölge Kombinasyonları' },
    { realName: 'Erling Moe', fictionalName: 'Erik Moen', role: 'FITNESS', nationality: 'NOR', age: 56, rating: 80, specialty: 'İskandinav Dayanıklılık Metodu' },
    { realName: 'Eduard Graf', fictionalName: 'Egon Grafe', role: 'CHIEF_SCOUT', nationality: 'GER', age: 37, rating: 81, specialty: 'Bundesliga & Balkan Pazarı' },
    { realName: 'Dr. Kerem Ülkü', fictionalName: 'Dr. Koray Ülkü', role: 'HEAD_PHYSIO', nationality: 'TUR', age: 45, rating: 80, specialty: 'Diz & Bağ Dokusu Tedavisi' },
    { realName: 'Mehmet Ekşi', fictionalName: 'Metin Ekşi', role: 'YOUTH_DIRECTOR', nationality: 'TUR', age: 69, rating: 82, specialty: 'Özkaynak Düzeni & Genç Yıldız Gelişimi' },
  ],
  ts: [
    { realName: 'Hüseyin Çimşir', fictionalName: 'Hakan Çimşir', role: 'ASSISTANT', nationality: 'TUR', age: 47, rating: 79, specialty: 'Kontra Atak & Kanat Organizasyonu' },
    { realName: 'Gökhan Kandemir', fictionalName: 'Güven Kandemir', role: 'FITNESS', nationality: 'TUR', age: 42, rating: 78, specialty: 'Kuvvet & Aerobik Kapasite' },
    { realName: 'İhsan Gündüz Derelioğlu', fictionalName: 'İsmail Dereli', role: 'CHIEF_SCOUT', nationality: 'TUR', age: 58, rating: 78, specialty: 'Karadeniz & Doğu Avrupa İzleme' },
    { realName: 'Dr. Ahmet Beşir', fictionalName: 'Dr. Arif Beşir', role: 'HEAD_PHYSIO', nationality: 'TUR', age: 46, rating: 77, specialty: 'Saha İçi Acil Müdahale' },
    { realName: 'Eyüp Saka', fictionalName: 'Eren Saka', role: 'YOUTH_DIRECTOR', nationality: 'TUR', age: 48, rating: 79, specialty: 'U19 Şampiyonlar Akademisi' },
  ],
  goz: [
    { realName: 'Stanimir Stoilov', fictionalName: 'Stoyan Stoilov', role: 'ASSISTANT', nationality: 'BUL', age: 59, rating: 81, specialty: 'Yüksek Baskı & Fiziksel Üstünlük' },
  ],
  sam: [
    { realName: 'Thomas Reis', fictionalName: 'Tobias Reiss', role: 'ASSISTANT', nationality: 'GER', age: 53, rating: 80, specialty: 'Alman Savunma Kompaktlığı' },
  ],

  // Trendyol 1. Lig
  tr1_ant: [
    { realName: 'Emre Belözoğlu', fictionalName: 'Eren Belöz', role: 'ASSISTANT', nationality: 'TUR', age: 46, rating: 77, specialty: 'Merkez Pas Kontrolü & Tempo' },
    { realName: 'Selahattin Göksel', fictionalName: 'Salih Göksel', role: 'FITNESS', nationality: 'TUR', age: 41, rating: 74, specialty: 'Sıcak İklim Hidrasyon & Kondisyon' },
  ],
  tr1_bod: [
    { realName: 'Burhan Eşer', fictionalName: 'Bülent Eşer', role: 'ASSISTANT', nationality: 'TUR', age: 41, rating: 75, specialty: 'Geçiş Hücumu & Kompakt 4-2-3-1' },
  ],
  tr1_bur: [
    { realName: 'Mustafa Er', fictionalName: 'Murat Er', role: 'ASSISTANT', nationality: 'TUR', age: 46, rating: 76, specialty: 'Vakıfköy Genç Entegrasyonu & Pres' },
    { realName: 'Mesut Ünal', fictionalName: 'Mert Ünal', role: 'YOUTH_DIRECTOR', nationality: 'TUR', age: 51, rating: 78, specialty: 'Vakıfköy Akademi İhracatı' },
  ],
  tr1_kg: [
    { realName: 'Salvatore Bocchetti', fictionalName: 'Silvio Bocchetti', role: 'ASSISTANT', nationality: 'ITA', age: 39, rating: 76, specialty: 'İtalyan Savunma Çizgisi' },
  ],
  tr1_pen: [
    { realName: 'Murat Şahin', fictionalName: 'Melih Şahin', role: 'ASSISTANT', nationality: 'TUR', age: 50, rating: 75, specialty: 'Duran Top & Kaleci Organizasyonu' },
  ],
  tr1_erok: [
    { realName: 'Hikmet Karaman', fictionalName: 'Halit Karaman', role: 'ASSISTANT', nationality: 'TUR', age: 66, rating: 76, specialty: 'Disiplinli Savunma & Kriz Yönetimi' },
  ],
  tr1_igd: [
    { realName: 'Kenan Koçak', fictionalName: 'Kemal Koçak', role: 'ASSISTANT', nationality: 'TUR', age: 45, rating: 75, specialty: 'Alman Ekolü Takım Savunması' },
  ],
  tr1_kec: [
    { realName: 'Osman Zeki Korkmaz', fictionalName: 'Orhan Zeki Korkmaz', role: 'ASSISTANT', nationality: 'TUR', age: 44, rating: 75, specialty: 'Dinamik 4-3-3 & Kanat Baskısı' },
  ],
  tr1_van: [
    { realName: 'Mustafa Gürsel', fictionalName: 'Mahmut Gürsel', role: 'ASSISTANT', nationality: 'TUR', age: 51, rating: 74, specialty: 'Yüksek Rakım Fiziksel Oyun' },
  ],
  tr1_sar: [
    { realName: 'Umut Eskiköy', fictionalName: 'Uğur Eskiköy', role: 'ASSISTANT', nationality: 'TUR', age: 39, rating: 73, specialty: 'Dar Alan Paslaşması' },
  ],
  tr1_bat: [
    { realName: 'Selçuk Şahin', fictionalName: 'Serkan Şahin', role: 'ASSISTANT', nationality: 'TUR', age: 45, rating: 74, specialty: 'Merkez Orta Saha Kontrolü' },
  ],
  tr1_mug: [
    { realName: 'Yalçın Koşukavak', fictionalName: 'Yaşar Koşukavak', role: 'ASSISTANT', nationality: 'TUR', age: 54, rating: 75, specialty: '1. Lig Taktiksel Esneklik' },
  ],
  tr1_mar: [
    { realName: 'Ivaylo Petev', fictionalName: 'Ivan Petrov', role: 'ASSISTANT', nationality: 'BUL', age: 51, rating: 74, specialty: 'Balkan Disiplini & Duran Top' },
  ],

  // Nesine 2. Lig
  tr2b_elz: [
    { realName: 'Serdar Bozkurt', fictionalName: 'Selim Bozkurt', role: 'ASSISTANT', nationality: 'TUR', age: 49, rating: 72, specialty: '2. Lig Şampiyonluk Tecrübesi' },
  ],
  tr2b_ads: [
    { realName: 'Volkan Bekiroğlu', fictionalName: 'Vedat Bekiroğlu', role: 'ASSISTANT', nationality: 'TUR', age: 48, rating: 72, specialty: 'Genç Kadro & Kanat Akınları' },
  ],
  tr2b_hat: [
    { realName: 'Mehmet Hakkı Hocaoğlu', fictionalName: 'Metin Hoca', role: 'ASSISTANT', nationality: 'TUR', age: 47, rating: 71, specialty: 'Yeniden Yapılanma & Savunma' },
  ],
  tr2k_ag: [
    { realName: 'İlker Avcıbay', fictionalName: 'İlhan Avcı', role: 'ASSISTANT', nationality: 'TUR', age: 48, rating: 73, specialty: 'Fiziksel 4-2-3-1 & Kaleci Ekolü' },
  ],

  // Premier League
  ars: [
    { realName: 'Albert Stuivenberg', fictionalName: 'Arthur Steenberg', role: 'ASSISTANT', nationality: 'NED', age: 56, rating: 88, specialty: 'Pozisyon Oyunu & Yarı Alanlar' },
    { realName: 'Nicolas Jover', fictionalName: 'Nathan Jover', role: 'FITNESS', nationality: 'FRA', age: 45, rating: 90, specialty: 'Dünya Standartlarında Duran Top' },
    { realName: 'Andrea Berta', fictionalName: 'Alberto Berta', role: 'CHIEF_SCOUT', nationality: 'ITA', age: 54, rating: 88, specialty: 'Elit Avrupa Transfer Mühendisliği' },
  ],
  mci: [
    { realName: 'Juanma Lillo', fictionalName: 'Javier Lillo', role: 'ASSISTANT', nationality: 'ESP', age: 60, rating: 89, specialty: 'Taktiksel Kuram & Topa Sahip Olma' },
    { realName: 'Lorenzo Buenaventura', fictionalName: 'Lucas Buenaventura', role: 'FITNESS', nationality: 'ESP', age: 63, rating: 88, specialty: 'Yüksek Yoğunluklu İdman Periyodu' },
  ],
  liv: [
    { realName: 'Sipke Hulshoff', fictionalName: 'Sander Hulshoff', role: 'ASSISTANT', nationality: 'NED', age: 51, rating: 87, specialty: 'Vertikal Hücum & Gegenpress' },
    { realName: 'Ruben Peeters', fictionalName: 'Robin Peeters', role: 'FITNESS', nationality: 'BEL', age: 34, rating: 87, specialty: 'Sakatlık Önleme & Maksimum Sprint' },
  ],

  // La Liga
  rma: [
    { realName: 'Davide Ancelotti', fictionalName: 'Dario Antonelli', role: 'ASSISTANT', nationality: 'ITA', age: 37, rating: 89, specialty: 'Şampiyonlar Ligi Taktik Analizi' },
    { realName: 'Antonio Pintus', fictionalName: 'Andrea Pinti', role: 'FITNESS', nationality: 'ITA', age: 64, rating: 94, specialty: 'Pintus Metodu & Laktat Dayanıklılığı' },
    { realName: 'Juni Calafat', fictionalName: 'João Calafat', role: 'CHIEF_SCOUT', nationality: 'BRA', age: 53, rating: 94, specialty: 'Küresel Wonderkid İmparatorluğu' },
  ],
  fcb: [
    { realName: 'Marcus Sorg', fictionalName: 'Marco Sorg', role: 'ASSISTANT', nationality: 'GER', age: 60, rating: 88, specialty: 'Yüksek Savunma Hattı & Ofsayt Tuzağı' },
    { realName: 'Julio Tous', fictionalName: 'Julián Tous', role: 'FITNESS', nationality: 'ESP', age: 52, rating: 89, specialty: 'Patlayıcı Kas Koruması' },
    { realName: 'José Ramón Alexanko', fictionalName: 'Jordi Alexanko', role: 'YOUTH_DIRECTOR', nationality: 'ESP', age: 70, rating: 91, specialty: 'La Masia Elit Yetenek Fabrikası' },
  ],

  // Serie A
  ita_int: [
    { realName: 'Aleksandar Kolarov', fictionalName: 'Aleksei Kolar', role: 'ASSISTANT', nationality: 'SRB', age: 40, rating: 86, specialty: '3-5-2 Kanat Bek & Duran Top' },
    { realName: 'Fabio Ripert', fictionalName: 'Flavio Ripari', role: 'FITNESS', nationality: 'ITA', age: 54, rating: 87, specialty: 'Yoğun Sezon Laktat Kontrolü' },
    { realName: 'Piero Ausilio', fictionalName: 'Paolo Ausili', role: 'CHIEF_SCOUT', nationality: 'ITA', age: 51, rating: 89, specialty: 'Serbest & Stratejik Serie A Pazarı' },
    { realName: 'Dr. Piero Volpi', fictionalName: 'Dr. Pietro Volpi', role: 'HEAD_PHYSIO', nationality: 'ITA', age: 69, rating: 88, specialty: 'Elit Kas & Diz Rehabilitasyonu' },
    { realName: 'Massimo Tarantino', fictionalName: 'Matteo Taranto', role: 'YOUTH_DIRECTOR', nationality: 'ITA', age: 55, rating: 85, specialty: 'Primavera Yetenek Gelişimi' },
  ],
  ita_mil: [
    { realName: 'Carlos Fernandes', fictionalName: 'Caio Fernandes', role: 'ASSISTANT', nationality: 'POR', age: 32, rating: 85, specialty: 'Portekiz Ekolü Hücum Presi' },
    { realName: 'Geoffrey Moncada', fictionalName: 'Gabriel Moncada', role: 'CHIEF_SCOUT', nationality: 'FRA', age: 40, rating: 88, specialty: 'Veri & Genç Avrupa Keşfi' },
  ],
  ita_nap: [
    { realName: 'Marco Landucci', fictionalName: 'Mauro Landucci', role: 'ASSISTANT', nationality: 'ITA', age: 62, rating: 85, specialty: 'Pragmatik Savunma & Skor Koruma' },
    { realName: 'Giovanni Manna', fictionalName: 'Giulio Manna', role: 'CHIEF_SCOUT', nationality: 'ITA', age: 38, rating: 85, specialty: 'Serie A & Premier Lig Fırsatları' },
  ],
  ita_juv: [
    { realName: 'Marco Domenichini', fictionalName: 'Matteo Domenici', role: 'ASSISTANT', nationality: 'ITA', age: 68, rating: 86, specialty: 'İtalyan Topa Sahip Olma & Alan Savunması' },
    { realName: 'Francesco Sinatti', fictionalName: 'Fabrizio Sinatti', role: 'FITNESS', nationality: 'ITA', age: 40, rating: 86, specialty: 'Yüksek Hızlı İnterval Yükleme' },
  ],
  ita_ata: [
    { realName: 'Marco Ianni', fictionalName: 'Mirko Ianni', role: 'ASSISTANT', nationality: 'ITA', age: 44, rating: 84, specialty: 'Sarriball & Hızlı Dikine Pas' },
    { realName: 'Roberto Samaden', fictionalName: 'Riccardo Samaden', role: 'YOUTH_DIRECTOR', nationality: 'ITA', age: 60, rating: 90, specialty: 'Zingonia Akademi Şampiyonları' },
  ],
  ita_rom: [
    { realName: 'Tullio Gritti', fictionalName: 'Tommaso Gritti', role: 'ASSISTANT', nationality: 'ITA', age: 68, rating: 85, specialty: 'Birebir Adam Adama Baskı' },
    { realName: 'Domenico Borelli', fictionalName: 'Dario Borelli', role: 'FITNESS', nationality: 'ITA', age: 48, rating: 84, specialty: '90 Dakika Dinamik Dayanıklılık' },
  ],
  ita_laz: [
    { realName: 'Luigi Riccio', fictionalName: 'Lorenzo Riccio', role: 'ASSISTANT', nationality: 'ITA', age: 49, rating: 82, specialty: 'Agresif Orta Blok & Geçiş' },
  ],
  ita_com: [
    { realName: 'Dani Guindos', fictionalName: 'Diego Guindos', role: 'ASSISTANT', nationality: 'ESP', age: 42, rating: 80, specialty: 'İspanyol Pozisyon Oyunu' },
  ],

  // German Bundesliga 2026-27
  ger_fcb: [
    { realName: 'Aaron Danks', fictionalName: 'Adrian Danks', role: 'ASSISTANT', nationality: 'ENG', age: 43, rating: 87, specialty: 'Pozisyon Oyunu & Yarı Alan Kombinasyonları' },
    { realName: 'Walter Gfrerer', fictionalName: 'Werner Gfrerer', role: 'FITNESS', nationality: 'AUT', age: 53, rating: 88, specialty: 'Yüksek Şiddetli Sprint & Performans' },
    { realName: 'Christoph Freund', fictionalName: 'Christian Freund', role: 'CHIEF_SCOUT', nationality: 'AUT', age: 49, rating: 91, specialty: 'Avrupa Wonderkid & Red Bull Ekolü' },
    { realName: 'Dr. Jochen Hahne', fictionalName: 'Dr. Jonas Hahne', role: 'HEAD_PHYSIO', nationality: 'GER', age: 47, rating: 89, specialty: 'Elit Ortopedi & Bağ Koruması' },
    { realName: 'Jochen Sauer', fictionalName: 'Jörg Sauer', role: 'YOUTH_DIRECTOR', nationality: 'GER', age: 54, rating: 87, specialty: 'FC Bayern Campus Akademi Modeli' },
  ],
  ger_b04: [
    { realName: 'Sebastián Parrilla', fictionalName: 'Santiago Parrilla', role: 'ASSISTANT', nationality: 'ARG', age: 49, rating: 87, specialty: '3-4-2-1 Dinamik Üçgenler' },
    { realName: 'Tim Steidten-S', fictionalName: 'Timo Steidten', role: 'CHIEF_SCOUT', nationality: 'GER', age: 47, rating: 88, specialty: 'Güney Amerika & Benelüks Yetenek Ağı' },
  ],
  ger_bvb: [
    { realName: 'Nuri Şahin-A', fictionalName: 'Nadir Şahin', role: 'ASSISTANT', nationality: 'TUR', age: 38, rating: 85, specialty: 'Geçiş Hücumu & Sarı Duvar Presi' },
    { realName: 'Sven Mislintat', fictionalName: 'Stefan Mislintat', role: 'CHIEF_SCOUT', nationality: 'GER', age: 54, rating: 90, specialty: 'Elmas Göz: U20 Süper Yetenek Keşfi' },
    { realName: 'Lars Ricken', fictionalName: 'Lukas Ricken', role: 'YOUTH_DIRECTOR', nationality: 'GER', age: 50, rating: 88, specialty: 'BVB U19 Şampiyonluk Akademisi' },
  ],
  ger_rbl: [
    { realName: 'Zsolt Lőw', fictionalName: 'Zoltán Lőw', role: 'ASSISTANT', nationality: 'HUN', age: 47, rating: 86, specialty: 'Red Bull Gegenpress & Dikey Koşular' },
    { realName: 'Marcel Schäfer', fictionalName: 'Markus Schäfer', role: 'CHIEF_SCOUT', nationality: 'GER', age: 42, rating: 86, specialty: 'Yüksek Hızlı Genç Profilleme' },
  ],
  ger_vfb: [
    { realName: 'David Krecidlo', fictionalName: 'Daniel Krecidlo', role: 'ASSISTANT', nationality: 'GER', age: 43, rating: 84, specialty: 'Hoeneß Pozisyon & Topa Sahip Olma' },
  ],
  ger_sge: [
    { realName: 'Stefan Buck', fictionalName: 'Simon Buck', role: 'ASSISTANT', nationality: 'GER', age: 46, rating: 82, specialty: 'Hızlı Kontra & Duran Top' },
  ],
  ger_scf: [
    { realName: 'Lars Voßler', fictionalName: 'Lukas Vossler', role: 'ASSISTANT', nationality: 'GER', age: 50, rating: 82, specialty: 'Freiburg Disiplini & Kompakt Blok' },
  ],
  ger_s04: [
    { realName: 'Norbert Elgert', fictionalName: 'Niklas Elgert', role: 'YOUTH_DIRECTOR', nationality: 'GER', age: 69, rating: 92, specialty: 'Knappenschmiede Efsane Akademi' },
  ],
  ger_hsv: [
    { realName: 'Loïc Favé', fictionalName: 'Lukas Favé', role: 'ASSISTANT', nationality: 'GER', age: 33, rating: 79, specialty: 'Dinamik Hücum Geçişleri' },
  ],
  ger_scp: [
    { realName: 'Michél Kniat', fictionalName: 'Michael Kniat', role: 'ASSISTANT', nationality: 'GER', age: 40, rating: 77, specialty: 'Cesur Yüksek Pres Organizasyonu' },
  ],
  ger_elb: [
    { realName: 'Rudi Bommer-A', fictionalName: 'Ralf Bommer', role: 'ASSISTANT', nationality: 'GER', age: 45, rating: 76, specialty: 'Sürpriz Takım Taktik Kompaktlığı' },
  ],

  // English EFL Championship 2026-27
  chp_whu: [
    { realName: 'Billy McKinlay', fictionalName: 'Brian McKinlay', role: 'ASSISTANT', nationality: 'SCO', age: 57, rating: 81, specialty: 'Premier Lig Tecrübesi & Fiziksel Blok' },
    { realName: 'Mark Noble', fictionalName: 'Matt Noble', role: 'YOUTH_DIRECTOR', nationality: 'ENG', age: 39, rating: 82, specialty: 'Academy of Football Mirası' },
  ],
  chp_wol: [
    { realName: 'Ian Burchnall', fictionalName: 'Ivan Burchnall', role: 'ASSISTANT', nationality: 'ENG', age: 43, rating: 80, specialty: 'Portekiz Ekolü Geçiş Oyunu' },
  ],
  chp_bur: [
    { realName: 'Craig Bellamy-A', fictionalName: 'Callum Bellamy', role: 'ASSISTANT', nationality: 'WAL', age: 47, rating: 81, specialty: 'Championship Yüksek Tempo Baskı' },
  ],
  chp_sou: [
    { realName: 'Matt Gill', fictionalName: 'Mark Gill', role: 'ASSISTANT', nationality: 'ENG', age: 45, rating: 79, specialty: 'Topa Sahip Olma & Sabırlı Kurulum' },
  ],
  chp_shu: [
    { realName: 'Alan Knill', fictionalName: 'Alistair Knill', role: 'ASSISTANT', nationality: 'WAL', age: 61, rating: 80, specialty: 'Bramall Lane Bindirmeli Stoperler' },
  ],
  chp_mid: [
    { realName: 'Jonathan Woodgate', fictionalName: 'Julian Woodgate', role: 'ASSISTANT', nationality: 'ENG', age: 46, rating: 79, specialty: 'Savunma Çizgisi & Paslaşma' },
  ],
  chp_bir: [
    { realName: 'Ashley Cole', fictionalName: 'Adam Cole', role: 'ASSISTANT', nationality: 'ENG', age: 45, rating: 80, specialty: 'Bek Savunması & Modern Baskı' },
  ],
  chp_wre: [
    { realName: 'Steve Parkin', fictionalName: 'Simon Parkin', role: 'ASSISTANT', nationality: 'ENG', age: 60, rating: 78, specialty: 'Duran Top & Uzun Taç Stratejisi' },
  ],
};

const POOL_NAMES_BY_REGION: Record<'TR' | 'ENG' | 'ESP' | 'ITA' | 'GER', Partial<Record<StaffRole, Array<[string, string, string]>>>> = {
  TR: {
    ASSISTANT: [
      ['Serkan Rençber', 'Selim Rençber', 'TUR'],
      ['İbrahim Toraman', 'İlker Toraman', 'TUR'],
      ['Volkan Arslan', 'Vedat Arslan', 'TUR'],
      ['Uğur Tütüneker', 'Utku Tütüneker', 'TUR'],
      ['Bayram Bektaş', 'Barış Bektaş', 'TUR'],
      ['Orhan Ak', 'Ozan Ak', 'TUR'],
    ],
    FITNESS: [
      ['Murat Öztürk', 'Mert Öztürk', 'TUR'],
      ['Çağatay Şahin', 'Can Şahin', 'TUR'],
      ['Alper Aşçı', 'Arda Aşçı', 'TUR'],
      ['Tolga Şen', 'Tarkan Şen', 'TUR'],
      ['Emrah Kara', 'Eren Kara', 'TUR'],
    ],
    CHIEF_SCOUT: [
      ['Saffet Sancaklı', 'Sinan Sancak', 'TUR'],
      ['Serhat Ulusoy', 'Selçuk Ulusoy', 'TUR'],
      ['Tolunay Kafkas-S', 'Tuna Kafkas', 'TUR'],
      ['Kaan Kural-S', 'Kerem Kural', 'TUR'],
      ['Fatih Tekke-S', 'Furkan Tekke', 'TUR'],
    ],
    HEAD_PHYSIO: [
      ['Dr. Murat Aksoy', 'Dr. Mustafa Aksoy', 'TUR'],
      ['Dr. Selin Arslan', 'Dr. Seda Arslan', 'TUR'],
      ['Dr. Cemil Taş', 'Dr. Caner Taş', 'TUR'],
      ['Dr. Deniz Aydın', 'Dr. Derya Aydın', 'TUR'],
    ],
    YOUTH_DIRECTOR: [
      ['Tuncay Şanlı', 'Turgay Şanlı', 'TUR'],
      ['Semih Şentürk', 'Serhat Şentürk', 'TUR'],
      ['Hamza Hamzaoğlu', 'Haluk Hamza', 'TUR'],
      ['Oğuz Çetin', 'Onur Çetin', 'TUR'],
    ],
  },
  ENG: {
    ASSISTANT: [
      ['Steve Holland', 'Simon Holland', 'ENG'],
      ['Graeme Jones', 'Grant Jones', 'ENG'],
      ['Pepijn Lijnders', 'Pieter Lijnders', 'NED'],
      ['Carlos Cuesta', 'César Cuesta', 'ESP'],
    ],
    FITNESS: [
      ['Conall Murtagh', 'Colin Murtagh', 'NIR'],
      ['Jordan Milsom', 'Jack Milsom', 'ENG'],
      ['Matt Reeves', 'Mark Reeves', 'ENG'],
    ],
    CHIEF_SCOUT: [
      ['Paul Mitchell', 'Peter Mitchell', 'ENG'],
      ['Sam Jewell', 'Scott Jewell', 'ENG'],
      ['Stuart Webber', 'Simon Webber', 'WAL'],
    ],
    HEAD_PHYSIO: [
      ['Dr. Gary O’Driscoll', 'Dr. Gavin O’Connor', 'IRL'],
      ['Dr. Eva Carneiro', 'Dr. Elena Carneiro', 'ENG'],
      ['Dr. Steve Kemp', 'Dr. Sean Kemp', 'ENG'],
    ],
    YOUTH_DIRECTOR: [
      ['Per Mertesacker', 'Paul Mertesacker', 'GER'],
      ['Alex Inglethorpe', 'Adam Inglethorpe', 'ENG'],
      ['Neil Bath', 'Nick Bath', 'ENG'],
    ],
  },
  ESP: {
    ASSISTANT: [
      ['Eder Sarabia', 'Eneko Sarabia', 'ESP'],
      ['Domènec Torrent', 'Daniel Torrent', 'ESP'],
      ['Rubén Uría', 'Raúl Uría', 'ESP'],
    ],
    FITNESS: [
      ['Óscar Ortega', 'Omar Ortega', 'URU'],
      ['Ismael Fernández', 'Iker Fernández', 'ESP'],
      ['Pepe Conde', 'Pablo Conde', 'ESP'],
    ],
    CHIEF_SCOUT: [
      ['Monchi Rodríguez', 'Manuel Rodríguez', 'ESP'],
      ['Víctor Orta', 'Vicente Orta', 'ESP'],
      ['Roberto Olabe', 'Rafael Olabe', 'ESP'],
    ],
    HEAD_PHYSIO: [
      ['Dr. Niko Mihic', 'Dr. Nikola Mihic', 'CRO'],
      ['Dr. Ricard Pruna', 'Dr. Raúl Pruna', 'ESP'],
      ['Dr. Juanjo Brau', 'Dr. Jaime Brau', 'ESP'],
    ],
    YOUTH_DIRECTOR: [
      ['Raúl González-Y', 'Rodrigo González', 'ESP'],
      ['Xavi García-P', 'Xavier García', 'ESP'],
      ['Andoni Iraola-Y', 'Aitor Iraola', 'ESP'],
    ],
  },
  ITA: {
    ASSISTANT: [
      ['Cristian Stellini', 'Carlo Stellini', 'ITA'],
      ['Giovanni Martusciello', 'Giulio Martusciello', 'ITA'],
      ['Daniele Baldini', 'Davide Baldini', 'ITA'],
      ['Angelo Alessio', 'Andrea Alessio', 'ITA'],
    ],
    FITNESS: [
      ['Paolo Bertelli', 'Pietro Bertelli', 'ITA'],
      ['Costantino Coratti', 'Carlo Coratti', 'ITA'],
      ['Matteo Osti', 'Marco Osti', 'ITA'],
    ],
    CHIEF_SCOUT: [
      ['Cristiano Giuntoli', 'Carlo Giuntoli', 'ITA'],
      ['Pantaleo Corvino', 'Paolo Corvino', 'ITA'],
      ['Igli Tare', 'Ilir Tare', 'ALB'],
    ],
    HEAD_PHYSIO: [
      ['Dr. Luca Stefanini', 'Dr. Lorenzo Stefanini', 'ITA'],
      ['Dr. Raffaele Canonico', 'Dr. Riccardo Canonico', 'ITA'],
      ['Dr. Gianni Nanni', 'Dr. Giulio Nanni', 'ITA'],
    ],
    YOUTH_DIRECTOR: [
      ['Alberto De Rossi', 'Alessandro De Rossi', 'ITA'],
      ['Federico Guidi', 'Filippo Guidi', 'ITA'],
      ['Vincenzo Vergine', 'Valerio Vergine', 'ITA'],
    ],
  },
  GER: {
    ASSISTANT: [
      ['Peter Hermann', 'Paul Hermann', 'GER'],
      ['Xaver Zembrod', 'Xavier Zembrod', 'GER'],
      ['Danny Röhl', 'Daniel Röhl', 'GER'],
      ['Michael Henke', 'Markus Henke', 'GER'],
    ],
    FITNESS: [
      ['Holger Broich', 'Henrik Broich', 'GER'],
      ['Shad Forsythe', 'Sean Forsythe', 'USA'],
      ['Andreas Beck-F', 'Anton Beck', 'GER'],
    ],
    CHIEF_SCOUT: [
      ['Marcus Mann', 'Marco Mann', 'GER'],
      ['Ben Manga', 'Benoît Manga', 'GER'],
      ['Johannes Spors', 'Jonas Spors', 'GER'],
    ],
    HEAD_PHYSIO: [
      ['Dr. Hans-Wilhelm Müller-W.', 'Dr. Henrik Müller-W.', 'GER'],
      ['Dr. Tim Meyer', 'Dr. Tom Meyer', 'GER'],
      ['Dr. Peter Ueblacker', 'Dr. Paul Ueblacker', 'GER'],
    ],
    YOUTH_DIRECTOR: [
      ['Hannes Wolf', 'Henrik Wolf', 'GER'],
      ['Meikel Schönweitz', 'Michael Schönweitz', 'GER'],
      ['Benjamin Glück', 'Bastian Glück', 'GER'],
    ],
  },
};

const SPECIALTY_BY_ROLE: Record<StaffRole, string[]> = {
  ASSISTANT: ['Taktik Diziliş & Maç İçi Analiz', 'Duran Top & Blok Geçiş Disiplini', 'Rakip Analizi & Pres Tetikleyicileri'],
  FITNESS: ['Yüksek Şiddetli Kondisyon & Dayanıklılık', 'Laktat Eşiği & Çift İdman', 'Patlayıcı Güç & Sakatlık Önleme'],
  GK_COACH: ['Refleks & Çizgi Kurtarışı', 'Ayakla Oyun Kurma & Yan Top Hakimiyeti', 'Penaltı Analizi & Pozisyon Alma'],
  CHIEF_SCOUT: ['Wonderkid & U21 Yetenek Avcılığı', 'Değerinin Altındaki Gizli Cevherler', 'Lig İçi ve Kıtasal Gözlem Ağı'],
  HEAD_PHYSIO: ['Kas Yırtığı Önleme & Rehabilitasyon', 'Hızlı Sahaya Dönüş Protokolü', 'Ortopedik Yük Yönetimi'],
  DOCTOR: ['Ağır Sakatlık Cerrahi Takip', 'Biyomekanik Yük & Risk Analizi', 'Spor Hekimliği & Kardiyo Kontrol'],
  YOUTH_DIRECTOR: ['Akademi A Takım Entegrasyonu', 'Genç Oyuncu Mentorluk Sistemi', 'Pozisyon Oyunu & Teknik Altyapı'],
};

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function resolveRegion(clubId: string, leagueId?: LeagueId): 'TR' | 'ENG' | 'ESP' | 'ITA' | 'GER' {
  if (leagueId === 'PREMIER_LEAGUE' || leagueId === 'EFL_CHAMPIONSHIP') return 'ENG';
  if (leagueId === 'LA_LIGA') return 'ESP';
  if (leagueId === 'SERIE_A') return 'ITA';
  if (leagueId === 'BUNDESLIGA') return 'GER';
  if (leagueId === 'SUPER_LIG' || leagueId === 'TR_1_LIG' || leagueId === 'TR_2_LIG_BEYAZ' || leagueId === 'TR_2_LIG_KIRMIZI') {
    return 'TR';
  }
  if (clubId.startsWith('ger_')) return 'GER';
  if (clubId.startsWith('chp_')) return 'ENG';
  if (clubId.startsWith('ita_')) return 'ITA';
  if (clubId.startsWith('tr1_') || clubId.startsWith('tr2')) return 'TR';
  if (['ars', 'mci', 'liv', 'che', 'mun', 'tot', 'avl', 'new', 'bha', 'whu', 'eve', 'ful', 'bre', 'cry', 'not', 'bou', 'lee', 'ips', 'sun', 'hul', 'cov'].includes(clubId)) return 'ENG';
  if (['rma', 'rm', 'fcb', 'atm', 'ath', 'vil', 'rbb', 'rso', 'sev', 'val', 'cel', 'osa', 'get', 'ray', 'esp', 'ala', 'lev', 'elc', 'rac', 'dep', 'mal'].includes(clubId)) return 'ESP';
  return 'TR';
}

export function createResearchedClubStaff(
  clubId: string,
  reputation: number,
  leagueId?: LeagueId
): StaffMember[] {
  const roles: StaffRole[] = ['ASSISTANT', 'FITNESS', 'CHIEF_SCOUT', 'HEAD_PHYSIO', 'YOUTH_DIRECTOR'];
  const region = resolveRegion(clubId, leagueId);
  const overrides = CLUB_STAFF_OVERRIDES[clubId] ?? [];
  const baseRating = Math.max(58, Math.min(91, Math.round(reputation * 0.96)));
  const h = hashSeed(clubId);

  return roles.map((role, idx) => {
    const custom = overrides.find((o) => o.role === role);
    if (custom) {
      const wageScale =
        leagueId === 'TR_2_LIG_BEYAZ' || leagueId === 'TR_2_LIG_KIRMIZI'
          ? 68
          : leagueId === 'TR_1_LIG'
          ? 105
          : leagueId === 'EFL_CHAMPIONSHIP'
          ? 150
          : leagueId === 'BUNDESLIGA'
          ? 215
          : 195;
      const wage = Math.round((custom.rating * wageScale) / 100) * 100;
      return {
        id: `stf_${clubId}_${role.toLowerCase()}`,
        name: custom.realName,
        fictionalName: custom.fictionalName,
        role,
        nationality: custom.nationality,
        age: custom.age,
        rating: custom.rating,
        weeklyWage: Math.max(1200, wage),
        specialty: custom.specialty,
      };
    }

    const pool = POOL_NAMES_BY_REGION[region][role] ?? POOL_NAMES_BY_REGION[region].ASSISTANT ?? [['Mert Yılmaz', 'Murat Yılmaz', 'TUR']];
    const [realName, fictionalName, nationality] = pool[(h + idx * 3) % pool.length];
    const rating = Math.max(55, Math.min(89, baseRating + ((h + idx) % 5) - 2));
    const scale =
      leagueId === 'TR_2_LIG_BEYAZ' || leagueId === 'TR_2_LIG_KIRMIZI'
        ? 62
        : leagueId === 'TR_1_LIG'
        ? 100
        : leagueId === 'EFL_CHAMPIONSHIP'
        ? 145
        : leagueId === 'PREMIER_LEAGUE'
        ? 235
        : leagueId === 'BUNDESLIGA'
        ? 215
        : leagueId === 'LA_LIGA' || leagueId === 'SERIE_A'
        ? 210
        : 175;
    const weeklyWage = Math.max(1100, Math.round((rating * scale) / 100) * 100);
    const specs = SPECIALTY_BY_ROLE[role];

    return {
      id: `stf_${clubId}_${role.toLowerCase()}`,
      name: realName,
      fictionalName,
      role,
      nationality,
      age: 36 + ((h + idx * 7) % 24),
      rating,
      weeklyWage,
      specialty: specs[(h + idx) % specs.length],
    };
  });
}

export function createExpandedStaffMarketPool(): StaffMember[] {
  const candidates: Array<[string, string, StaffRole, string, number, number, string]> = [
    // ASSISTANT MANAGERS (9)
    ['Hakan Şimşek', 'Harun Şimşek', 'ASSISTANT', 'TUR', 46, 84, 'Gegenpress & Hücum Geçişleri'],
    ['Tugay Kerimoğlu', 'Tuna Kerimoğlu', 'ASSISTANT', 'TUR', 56, 82, 'Merkez Pas & Taktik Denge'],
    ['Davide Ancelotti Jr.', 'Dario Antonelli', 'ASSISTANT', 'ITA', 37, 89, 'Şampiyonlar Ligi Taktik Esnekliği'],
    ['Albert Stuivenberg', 'Arthur Steenberg', 'ASSISTANT', 'NED', 55, 86, 'Duran Top & Blok Savunması'],
    ['Cristian Stellini', 'Carlo Stellini', 'ASSISTANT', 'ITA', 52, 83, '3-5-2 Savunma Organizasyonu'],
    ['Danny Röhl', 'Daniel Röhl', 'ASSISTANT', 'GER', 37, 85, 'Alman Ekolü Gegenpress & Şablon'],
    ['Zsolt Lőw', 'Zoltán Lőw', 'ASSISTANT', 'HUN', 47, 87, 'Dikey Geçiş & Yüksek Blok'],
    ['Billy McKinlay', 'Brian McKinlay', 'ASSISTANT', 'SCO', 57, 79, 'Championship Fiziksel Savunma'],
    ['Ömer Erdoğan-A', 'Özgür Erdoğan', 'ASSISTANT', 'TUR', 49, 77, 'Süper Lig & 1. Lig Kompakt Blok'],

    // FITNESS COACHES (8)
    ['Antonio Pintus', 'Andrea Pinti', 'FITNESS', 'ITA', 64, 93, 'Elit Seviye Laktat & Çift İdman'],
    ['Julio Tous', 'Julián Tous', 'FITNESS', 'ESP', 52, 88, 'Patlayıcı Güç & Sakatlık Önleme'],
    ['Kaan Öztürk', 'Koray Öztürk', 'FITNESS', 'TUR', 36, 79, 'Genç Oyuncu Fizik Gelişimi'],
    ['Murat Şahin-F', 'Mert Şahin-F', 'FITNESS', 'TUR', 41, 74, '1. Lig & 2. Lig Dayanıklılık Kampı'],
    ['Paolo Bertelli', 'Pietro Bertelli', 'FITNESS', 'ITA', 59, 85, 'Serie A Sezon İçi Kondisyon'],
    ['Holger Broich', 'Henrik Broich', 'FITNESS', 'GER', 51, 89, 'Bundesliga Yüksek Hızlı İnterval'],
    ['Shad Forsythe', 'Sean Forsythe', 'FITNESS', 'USA', 53, 86, 'Sprint Dayanıklılığı & Toparlanma'],
    ['Jordan Milsom', 'Jack Milsom', 'FITNESS', 'ENG', 40, 81, '46 Haftalık Championship Yüklemesi'],

    // CHIEF SCOUTS (9)
    ['Juni Calafat', 'João Calafat', 'CHIEF_SCOUT', 'BRA', 53, 94, 'Elit Wonderkid & Küresel Gözlem'],
    ['Monchi Verde', 'Manuel Verde', 'CHIEF_SCOUT', 'ESP', 57, 90, 'Değerinin Altındaki Gizli Cevherler'],
    ['Cristiano Giuntoli', 'Carlo Giuntoli', 'CHIEF_SCOUT', 'ITA', 54, 88, 'Serie A Stratejik Yetenek Havuzu'],
    ['Serhat Ulusoy', 'Selçuk Ulusoy', 'CHIEF_SCOUT', 'TUR', 42, 81, 'Balkanlar & Süper Lig Pazar Uzmanı'],
    ['Erdem Kılıç', 'Emir Kılıç', 'CHIEF_SCOUT', 'TUR', 38, 75, 'Anadolu 1. Lig & 2. Lig Tarama Ağı'],
    ['Sven Mislintat', 'Stefan Mislintat', 'CHIEF_SCOUT', 'GER', 54, 91, 'Bundesliga & U20 Süper Yetenek Avcısı'],
    ['Ben Manga', 'Benoît Manga', 'CHIEF_SCOUT', 'GER', 52, 87, 'Afrika & 2. Bundesliga Fırsat Pazarı'],
    ['Paul Mitchell', 'Peter Mitchell', 'CHIEF_SCOUT', 'ENG', 45, 86, 'Premier Lig & Championship Veri Ağı'],
    ['Stuart Webber', 'Simon Webber', 'CHIEF_SCOUT', 'WAL', 42, 80, 'Serbest Oyuncu & Ucuz Bonservis Ağı'],

    // HEAD PHYSIO (8)
    ['Dr. Hans-Wilhelm Müller', 'Dr. Henrik Müller', 'HEAD_PHYSIO', 'GER', 54, 92, 'Rejeneratif Tıp & Bağ Dokusu'],
    ['Dr. Eva Carneiro', 'Dr. Elena Carneiro', 'HEAD_PHYSIO', 'ENG', 52, 87, 'Hızlı Sahaya Dönüş Protokolü'],
    ['Dr. Luca Stefanini', 'Dr. Lorenzo Stefanini', 'HEAD_PHYSIO', 'ITA', 51, 86, 'İtalyan Spor Hekimliği'],
    ['Dr. Murat Aksoy', 'Dr. Mustafa Aksoy', 'HEAD_PHYSIO', 'TUR', 41, 82, 'Yüksek Tempo Kondisyon Takibi'],
    ['Dr. Defne Kaya', 'Dr. Derya Kaya', 'HEAD_PHYSIO', 'TUR', 35, 76, 'Alt Lig Rehabilitasyon Uzmanı'],
    ['Dr. Tim Meyer', 'Dr. Tom Meyer', 'HEAD_PHYSIO', 'GER', 58, 89, 'Milli Takım Spor Hekimliği & Kan Analizi'],
    ['Dr. Gary O’Driscoll', 'Dr. Gavin O’Connor', 'HEAD_PHYSIO', 'IRL', 55, 88, 'Kas Yırtığı Önleme & İyileşme'],
    ['Dr. Cemil Taş', 'Dr. Caner Taş', 'HEAD_PHYSIO', 'TUR', 46, 79, 'Ortopedik Doku & Diz Rehabilitasyonu'],

    // YOUTH DIRECTORS (8)
    ['Patrick Kluivert-Y', 'Pieter Kluivert', 'YOUTH_DIRECTOR', 'NED', 50, 88, 'Akademi Müfredatı & Teknik Gelişim'],
    ['Xavi García-P', 'Xavier García', 'YOUTH_DIRECTOR', 'ESP', 52, 90, 'Pozisyon Oyunu & La Masia Modeli'],
    ['Roberto Samaden', 'Riccardo Samaden', 'YOUTH_DIRECTOR', 'ITA', 60, 89, 'İtalyan Primavera Akademi Sistemi'],
    ['Tuncay Şanlı', 'Turgay Şanlı', 'YOUTH_DIRECTOR', 'TUR', 44, 80, 'Mental Dayanıklılık & Mentorluk'],
    ['İlhan Mansız-Y', 'İsmail Mansız', 'YOUTH_DIRECTOR', 'TUR', 50, 76, 'Forvet Bitiricilik & Akademi'],
    ['Norbert Elgert', 'Niklas Elgert', 'YOUTH_DIRECTOR', 'GER', 69, 92, 'Alman Akademi Yıldız Fabrikası'],
    ['Hannes Wolf', 'Henrik Wolf', 'YOUTH_DIRECTOR', 'GER', 45, 85, 'U19 Teknik & Bireysel Gelişim'],
    ['Neil Bath', 'Nick Bath', 'YOUTH_DIRECTOR', 'ENG', 59, 88, 'Cobham / Championship Akademi İhracatı'],
  ];

  return candidates.map(([name, fictionalName, role, nationality, age, rating, specialty], idx) => ({
    id: `stf_mkt_${idx}`,
    name,
    fictionalName,
    role,
    nationality,
    age,
    rating,
    weeklyWage: Math.max(1600, Math.round((rating * 215) / 100) * 100),
    specialty,
  }));
}
