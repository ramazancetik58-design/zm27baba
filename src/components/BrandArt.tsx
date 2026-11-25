import React, { useId } from 'react';
import { Club, ClubEmblemType, LicenseMode, ManagerAppearance, PlayerAppearance } from '../engine/types';

export const ZephyrManagerShieldSvg: React.FC<{
  size?: number;
  showWordmark?: boolean;
  className?: string;
}> = ({ size = 96, showWordmark = true, className = '' }) => {
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size * 1.12}
        viewBox="0 0 120 134"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Zephyr Manager Logo"
      >
        <defs>
          <linearGradient id="zmCyanGrad" x1="16" y1="10" x2="104" y2="122" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="zmNavyFill" x1="60" y1="8" x2="60" y2="124" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0E1A3D" />
            <stop offset="100%" stopColor="#060B1E" />
          </linearGradient>
        </defs>
        <path
          d="M60 8L106 24V64C106 92.5 85.8 115.2 60 126C34.2 115.2 14 92.5 14 64V24L60 8Z"
          fill="url(#zmNavyFill)"
          stroke="url(#zmCyanGrad)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M60 16L98 29.5V63.5C98 87.5 81 106.8 60 116.5C39 106.8 22 87.5 22 63.5V29.5L60 16Z"
          stroke="#00E5FF"
          strokeOpacity="0.24"
          strokeWidth="1.5"
        />
        <path
          d="M32 42H85L44 82H76C84 82 90 77 90 70.5C90 65 85.5 61 80 61C75.5 61 72 64.2 72 68.2"
          stroke="url(#zmCyanGrad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M27 54H58" stroke="#00E5FF" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M29 66H49" stroke="#00E5FF" strokeOpacity="0.82" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <div className="mt-2.5 text-center leading-none">
          <div className="font-display font-bold tracking-[0.14em] text-white text-2xl sm:text-3xl">
            ZEPHYR
          </div>
          <div className="font-display font-bold tracking-[0.22em] text-white text-lg sm:text-xl mt-0.5">
            MANAGER
          </div>
        </div>
      )}
    </div>
  );
};

export const ZephyrStudioGoldSvg: React.FC<{ size?: number }> = ({ size = 128 }) => {
  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Zephyr Studio Gold Emblem"
      >
        <defs>
          <linearGradient id="goldSplashGrad" x1="20" y1="15" x2="120" y2="125" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#F5B82E" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="58" stroke="url(#goldSplashGrad)" strokeWidth="2.5" strokeOpacity="0.35" />
        <circle
          cx="70"
          cy="70"
          r="50"
          stroke="url(#goldSplashGrad)"
          strokeWidth="1"
          strokeDasharray="4 6"
          strokeOpacity="0.45"
        />
        <path
          d="M36 44H102L50 94H90C100 94 107 87.5 107 79.5C107 72.5 101 67.5 94 67.5C88.5 67.5 84.5 71.2 84.5 76"
          stroke="url(#goldSplashGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M28 59H67" stroke="url(#goldSplashGrad)" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M31 74H55" stroke="url(#goldSplashGrad)" strokeOpacity="0.78" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
      <div className="mt-4 font-display font-bold tracking-[0.36em] text-xl sm:text-2xl text-[#F5B82E]">
        ZEPHYR STUDIO
      </div>
    </div>
  );
};

const ClubEmblemIcon: React.FC<{ emblem: ClubEmblemType; accent: string }> = ({ emblem, accent }) => {
  switch (emblem) {
    case 'STARS_4':
      return (
        <g fill={accent} opacity="0.92">
          <path d="M32 13L34 18H39L35 21L36.5 26L32 23L27.5 26L29 21L25 18H30Z" />
        </g>
      );
    case 'CANARY':
      return (
        <g stroke={accent} strokeWidth="2" fill="none">
          <path d="M24 22C28 16 36 16 40 22" strokeLinecap="round" />
          <path d="M27 25L32 19L37 25" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'EAGLE':
      return (
        <g fill={accent} opacity="0.92">
          <path d="M18 22L28 17L32 21L36 17L46 22L38 25L32 22L26 25Z" />
        </g>
      );
    case 'STORM_T':
      return (
        <g stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M22 18C26 14 38 14 42 18" />
          <path d="M25 23C29 20 35 20 39 23" />
        </g>
      );
    case 'OWL':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none">
          <circle cx="27" cy="20" r="3" />
          <circle cx="37" cy="20" r="3" />
          <path d="M30 22L32 25L34 22" />
        </g>
      );
    case 'GOZ':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none">
          <path d="M20 20C26 14 38 14 44 20C38 26 26 26 20 20Z" />
          <circle cx="32" cy="20" r="2.8" fill={accent} />
        </g>
      );
    case 'ATATURK':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M24 23L32 14L40 23" />
          <circle cx="32" cy="20" r="2.5" fill={accent} />
        </g>
      );
    case 'TEA_LEAF':
      return (
        <g fill={accent} opacity="0.9">
          <path d="M32 13C37 16 38 22 32 26C26 22 27 16 32 13Z" />
        </g>
      );
    case 'SUN_WAVE':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <circle cx="32" cy="18" r="4" fill={accent} />
          <path d="M20 25Q26 22 32 25T44 25" />
        </g>
      );
    case 'ANCHOR':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <line x1="32" y1="14" x2="32" y2="25" />
          <path d="M25 22C27 26 37 26 39 22" />
          <circle cx="32" cy="14" r="1.8" />
        </g>
      );
    case 'EAGLE_DOUBLE':
      return (
        <g fill={accent} opacity="0.92">
          <path d="M20 20L27 15L32 20L37 15L44 20L37 24L32 21L27 24Z" />
        </g>
      );
    case 'FALCON':
      return (
        <g stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M22 22L32 14L42 22" />
          <path d="M26 25L32 19L38 25" />
        </g>
      );
    case 'WAVE':
      return (
        <g stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M20 19Q26 14 32 19T44 19" />
          <path d="M22 24Q27 20 32 24T42 24" />
        </g>
      );
    case 'WINDMILL':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <line x1="25" y1="15" x2="39" y2="25" />
          <line x1="39" y1="15" x2="25" y2="25" />
          <circle cx="32" cy="20" r="2" fill={accent} />
        </g>
      );
    case 'CHIMNEY':
      return (
        <g fill={accent} opacity="0.9">
          <rect x="25" y="18" width="4" height="8" rx="1" />
          <rect x="35" y="18" width="4" height="8" rx="1" />
          <path d="M23 24H41" stroke={accent} strokeWidth="1.8" />
        </g>
      );
    case 'STAR_GREEN':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M32 13L34.3 18.2L40 18.8L35.7 22.5L37 28L32 25L27 28L28.3 22.5L24 18.8L29.7 18.2Z" />
        </g>
      );
    case 'CASTLE':
      return (
        <g fill={accent} opacity="0.92">
          <path d="M23 25V17H27V19H30V16H34V19H37V17H41V25H23Z" />
        </g>
      );
    case 'CANNON':
      return (
        <g fill={accent} opacity="0.95">
          <rect x="20" y="17" width="18" height="4" rx="1.5" />
          <circle cx="29" cy="22.5" r="3.2" fill="none" stroke={accent} strokeWidth="1.8" />
          <path d="M38 18L44 16.5V20.5L38 20Z" />
        </g>
      );
    case 'LION_AV':
    case 'LION_CFC':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M26 25L24 18L29 14L33 16L37 14L39 19L35 25H26Z" />
          <circle cx="31" cy="18" r="1.1" fill="#080d11" />
        </g>
      );
    case 'CHERRIES':
      return (
        <g stroke={accent} strokeWidth="1.6" fill={accent}>
          <circle cx="27" cy="22.5" r="2.8" />
          <circle cx="37" cy="22.5" r="2.8" />
          <path d="M27 19.5L32 13.5L37 19.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'BEE':
      return (
        <g fill={accent} stroke={accent} strokeWidth="1.4">
          <ellipse cx="32" cy="21" rx="5.5" ry="3.2" />
          <path d="M27 17C24 14 27 12 31 16M37 17C40 14 37 12 33 16" fill="none" />
        </g>
      );
    case 'SEAGULL':
      return (
        <g stroke={accent} strokeWidth="2.1" fill="none" strokeLinecap="round">
          <path d="M19 20Q25.5 14 32 19Q38.5 14 45 20" />
        </g>
      );
    case 'ELEPHANT':
      return (
        <g fill={accent} opacity="0.93">
          <rect x="24" y="17" width="13" height="7" rx="2.5" />
          <path d="M37 19C41 19 42 23 39 25" stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'EAGLE_CP':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M18 19L28 15L32 19L36 15L46 19L37 24L32 21L27 24Z" />
          <circle cx="32" cy="23.5" r="2" />
        </g>
      );
    case 'TOWER_EFC':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M27 25V16L32 12L37 16V25H27Z" />
          <rect x="30.5" y="19" width="3" height="6" fill="#080d11" />
        </g>
      );
    case 'CROWN_FFC':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M21 24L23 15L28 19L32 13L36 19L41 15L43 24H21Z" />
        </g>
      );
    case 'TIGER_HCA':
    case 'CAT_SAFC':
      return (
        <g stroke={accent} strokeWidth="1.9" fill="none" strokeLinecap="round">
          <path d="M24 23L26 15L30 18H34L38 15L40 23Z" />
          <circle cx="29" cy="20" r="1" fill={accent} />
          <circle cx="35" cy="20" r="1" fill={accent} />
        </g>
      );
    case 'HORSE_ITFC':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M25 25L27 16L34 13L39 17L35 20L37 25H25Z" />
        </g>
      );
    case 'ROSE_LUFC':
      return (
        <g fill={accent} opacity="0.94">
          <circle cx="32" cy="19.5" r="5" />
          <circle cx="32" cy="19.5" r="2.1" fill="#080d11" />
        </g>
      );
    case 'LIVERBIRD':
      return (
        <g stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M25 24C27 18 30 15 35 14C34 17 37 19 40 21C35 23 30 24 25 24Z" fill={accent} />
        </g>
      );
    case 'SHIP_MCFC':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M22 22H42L39 25H25Z" fill={accent} />
          <path d="M32 13V21M26 19L32 14L38 19" />
        </g>
      );
    case 'TRIDENT_MUFC':
      return (
        <g stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round">
          <line x1="32" y1="13" x2="32" y2="25" />
          <path d="M26 14V18C26 20 38 20 38 18V14" />
        </g>
      );
    case 'CASTLE_NUFC':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M22 25V16H26V19H29V15H35V19H38V16H42V25H22Z" />
        </g>
      );
    case 'TREE_NFFC':
      return (
        <g fill={accent} opacity="0.94">
          <circle cx="32" cy="17.5" r="4.8" />
          <rect x="30.5" y="21" width="3" height="5" />
        </g>
      );
    case 'COCKEREL':
      return (
        <g stroke={accent} strokeWidth="1.9" fill="none" strokeLinecap="round">
          <path d="M28 24C28 19 31 15 35 15C36 17 35 20 37 22" />
          <circle cx="32" cy="24.5" r="2.2" />
        </g>
      );
    // La Liga 2026-27 emblems
    case 'CROWN_RM':
    case 'CROWN_RBB':
    case 'CROWN_RSO':
    case 'CROWN_OSA':
    case 'CROWN_ESP':
    case 'CROWN_RAC':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M21 24L23 15L28 19L32 12.5L36 19L41 15L43 24H21Z" />
          <circle cx="32" cy="12" r="1.4" />
        </g>
      );
    case 'STRIPE_FCB':
    case 'CROSS_CEL':
      return (
        <g stroke={accent} strokeWidth="2.2" strokeLinecap="round">
          <line x1="32" y1="12.5" x2="32" y2="25.5" />
          <line x1="25" y1="17.5" x2="39" y2="17.5" />
        </g>
      );
    case 'BEAR_ATM':
    case 'LION_ATH':
      return (
        <g fill={accent} opacity="0.94">
          <circle cx="32" cy="19.5" r="4.8" />
          <circle cx="28" cy="14.8" r="2.1" />
          <circle cx="36" cy="14.8" r="2.1" />
        </g>
      );
    case 'SUBMARINE_VIL':
      return (
        <g fill={accent} opacity="0.95">
          <ellipse cx="32" cy="20.5" rx="9" ry="3.6" />
          <rect x="29" y="14.5" width="6" height="3.5" rx="1" />
        </g>
      );
    case 'BALL_SFC':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none">
          <circle cx="32" cy="19" r="5.8" />
          <path d="M27.5 16.5L32 14L36.5 16.5L35 22H29Z" fill={accent} fillOpacity="0.45" />
        </g>
      );
    case 'BAT_VAL':
    case 'BAT_LEV':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M18 17C22 14 27 16 32 20C37 16 42 14 46 17C43 21 38 22 32 24C26 22 21 21 18 17Z" />
        </g>
      );
    case 'SHIELD_GET':
    case 'PENNANT_ALA':
      return (
        <g stroke={accent} strokeWidth="1.9" fill="none">
          <path d="M25 14H39V20C39 23.5 32 26 32 26C32 26 25 23.5 25 20V14Z" />
        </g>
      );
    case 'BOLT_RAY':
      return (
        <g fill={accent} opacity="0.96">
          <path d="M35 12L25 20H31L29 26.5L39 18H33L35 12Z" />
        </g>
      );
    case 'TOWER_ELC':
    case 'CASTLE_MAL':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M23 25V16H27V18.5H30V14.5H34V18.5H37V16H41V25H23Z" />
        </g>
      );
    case 'ANCHOR_DEP':
      return (
        <g stroke={accent} strokeWidth="1.9" fill="none" strokeLinecap="round">
          <line x1="32" y1="13" x2="32" y2="24" />
          <line x1="27" y1="16" x2="37" y2="16" />
          <path d="M25 21C26 24.5 38 24.5 39 21" />
        </g>
      );
    case 'SERPENT_INT':
      return (
        <g stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M24 23C24 18 30 16 32 19C34 22 40 20 40 15" />
          <circle cx="40" cy="14" r="1.5" fill={accent} />
        </g>
      );
    case 'DEVIL_MIL':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M24 24L22 14L29 18H35L42 14L40 24H24Z" />
        </g>
      );
    case 'ZEBRA_JUV':
      return (
        <g fill={accent} opacity="0.94">
          <rect x="23" y="14" width="3" height="11" rx="1" />
          <rect x="30.5" y="13" width="3" height="12" rx="1" />
          <rect x="38" y="14" width="3" height="11" rx="1" />
        </g>
      );
    case 'WOLF_ROM':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M24 23L25 14L30 18L34 18L39 14L40 23L32 25L24 23Z" />
        </g>
      );
    case 'CROWN_NAP':
      return (
        <g stroke={accent} strokeWidth="2" fill="none">
          <circle cx="32" cy="19" r="5.5" />
          <path d="M29 22V16L35 22V16" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'LILY_FIO':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M32 12L35 19L41 17L36 24H28L23 17L29 19L32 12Z" />
        </g>
      );
    case 'CROC_BUR':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M20 22C24 16 32 15 44 19L38 24H20Z" />
        </g>
      );
    case 'DIAMOND_BVB':
      return (
        <g stroke={accent} strokeWidth="2" fill="none">
          <polygon points="32,12 40,19 32,26 24,19" fill={accent} fillOpacity="0.3" />
        </g>
      );
    case 'BULL_RBL':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M22 19C25 15 29 16 32 19C35 16 39 15 42 19L39 24H25Z" />
        </g>
      );
    case 'HORSE_BMG':
      return (
        <g stroke={accent} strokeWidth="2" fill="none">
          <polygon points="32,13 39,20 32,26 25,20" />
          <circle cx="32" cy="19.5" r="2" fill={accent} />
        </g>
      );
    case 'HORN_KOE':
      return (
        <g fill={accent} opacity="0.94">
          <path d="M24 22C23 15 28 13 30 17L32 23L34 17C36 13 41 15 40 22Z" />
        </g>
      );
    case 'SHIP_HSV':
      return (
        <g stroke={accent} strokeWidth="2" fill="none">
          <rect x="25" y="14" width="14" height="11" />
          <polygon points="32,15 37,19.5 32,24 27,19.5" fill={accent} />
        </g>
      );
    case 'HAMMERS_WHU':
      return (
        <g stroke={accent} strokeWidth="2.2" strokeLinecap="round">
          <line x1="25" y1="24" x2="39" y2="14" />
          <line x1="39" y1="24" x2="25" y2="14" />
        </g>
      );
    case 'WOLF_WOL':
      return (
        <g fill={accent} opacity="0.94">
          <polygon points="24,14 32,18 40,14 37,24 27,24" />
        </g>
      );
    case 'DRAGON_WRE':
      return (
        <g fill={accent} opacity="0.95">
          <path d="M21 23L26 14L32 18L39 13L43 22L32 25Z" />
        </g>
      );
    case 'SWORD_SHU':
      return (
        <g stroke={accent} strokeWidth="2" strokeLinecap="round">
          <line x1="26" y1="24" x2="38" y2="13" />
          <line x1="38" y1="24" x2="26" y2="13" />
          <line x1="28" y1="22" x2="36" y2="22" />
        </g>
      );
    case 'GLOBE_BIR':
      return (
        <g stroke={accent} strokeWidth="1.8" fill="none">
          <circle cx="32" cy="19" r="5.5" />
          <ellipse cx="32" cy="19" rx="2.5" ry="5.5" />
          <line x1="26.5" y1="19" x2="37.5" y2="19" />
        </g>
      );
    case 'SNOW_PEAK':
    default:
      return (
        <g fill={accent} opacity="0.94">
          <path d="M18 25L28 14L34 21L38 16L46 25H18Z" />
        </g>
      );
  }
};

function getCrestPath(shape: Club['crestShape']): string {
  switch (shape) {
    case 'CIRCLE':
      return 'M32 8C46.36 8 58 19.64 58 34C58 48.36 46.36 60 32 60C17.64 60 6 48.36 6 34C6 19.64 17.64 8 32 8Z';
    case 'HEX':
      return 'M32 7L56 19V47L32 63L8 47V19L32 7Z';
    case 'OVAL':
      return 'M32 8C45 8 54 19.5 54 36C54 52.5 45 64 32 64C19 64 10 52.5 10 36C10 19.5 19 8 32 8Z';
    case 'BANNER':
      return 'M10 10H54V38C54 51 43 60 32 65C21 60 10 51 10 38V10Z';
    case 'SHIELD':
    default:
      return 'M32 7L57 16V35C57 50 46.2 60.5 32 65C17.8 60.5 7 50 7 35V16L32 7Z';
  }
}

export const ClubCrest: React.FC<{
  club: Club;
  licenseMode: LicenseMode;
  size?: number;
}> = ({ club, licenseMode, size = 40 }) => {
  const uid = useId().replace(/:/g, '');
  const label = licenseMode === 'FULL_LICENSE' ? club.realShort : club.fictionalShort;
  const clipId = `crest_${club.id}_${uid}`;
  const shapePath = getCrestPath(club.crestShape);
  const starCount = licenseMode === 'FULL_LICENSE' ? club.stars : Math.min(2, club.stars);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-label={licenseMode === 'FULL_LICENSE' ? club.realName : club.fictionalName}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shapePath} />
        </clipPath>
      </defs>

      {/* Championship stars above crest */}
      {starCount > 0 && (
        <g fill="#FACC15">
          {Array.from({ length: starCount }).map((_, idx) => {
            const offset = (idx - (starCount - 1) / 2) * 8.5;
            const cx = 32 + offset;
            return (
              <path
                key={idx}
                d={`M${cx} 0.5L${cx + 1.1} 3.2H${cx + 3.8}L${cx + 1.6} 4.8L${cx + 2.4} 7.4L${cx} 5.8L${cx - 2.4} 7.4L${cx - 1.6} 4.8L${cx - 3.8} 3.2H${cx - 1.1}Z`}
              />
            );
          })}
        </g>
      )}

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="64" height="68" fill={club.primaryColor} />
        {club.kitPattern === 'HALVES' && (
          <rect x="32" y="0" width="32" height="68" fill={club.secondaryColor} />
        )}
        {club.kitPattern === 'STRIPES' && (
          <>
            <rect x="13" y="0" width="9" height="68" fill={club.secondaryColor} />
            <rect x="31" y="0" width="9" height="68" fill={club.secondaryColor} />
            <rect x="49" y="0" width="9" height="68" fill={club.secondaryColor} />
          </>
        )}
        {club.kitPattern === 'HOOPS' && (
          <>
            <rect x="0" y="14" width="64" height="9" fill={club.secondaryColor} />
            <rect x="0" y="32" width="64" height="9" fill={club.secondaryColor} />
            <rect x="0" y="50" width="64" height="9" fill={club.secondaryColor} />
          </>
        )}
        {club.kitPattern === 'SASH' && (
          <path d="M-8 56L56 -8L68 4L4 68Z" fill={club.secondaryColor} />
        )}
        {club.kitPattern === 'CHEVRON' && (
          <path d="M6 26L32 45L58 26V38L32 57L6 38Z" fill={club.secondaryColor} />
        )}
        {/* Upper emblem area scrim + heraldic icon */}
        <rect x="0" y="10" width="64" height="19" fill="#060b14" fillOpacity="0.45" />
        <ClubEmblemIcon emblem={club.emblemType} accent={club.accentColor} />
        {/* Crisp monogram band */}
        <rect x="0" y="29" width="64" height="18" fill="#080d11" fillOpacity="0.82" />
        {/* Founding year micro-tag */}
        <rect x="0" y="47" width="64" height="20" fill="#080d11" fillOpacity="0.52" />
      </g>

      <path d={shapePath} stroke={club.accentColor} strokeWidth="2.8" strokeLinejoin="round" />

      <text
        x="32"
        y="42"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={label.length >= 3 ? '12' : '14'}
        fontWeight="800"
        fontFamily="Chakra Petch, sans-serif"
      >
        {label}
      </text>
      <text
        x="32"
        y="57"
        textAnchor="middle"
        fill={club.accentColor}
        fontSize="7.5"
        fontWeight="700"
        fontFamily="JetBrains Mono, monospace"
      >
        {club.foundedYear}
      </text>
    </svg>
  );
};

export const ClubKitSvg: React.FC<{ club: Club; size?: number }> = ({ club, size = 72 }) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `kit_${club.id}_${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Team Jersey"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M24 12L10 22L16 36L23 32V68H57V32L64 36L70 22L56 12C52 17 46 19 40 19C34 19 28 17 24 12Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="8" y="10" width="64" height="60" fill={club.primaryColor} />
        {club.kitPattern === 'HALVES' && (
          <rect x="40" y="10" width="32" height="60" fill={club.secondaryColor} />
        )}
        {club.kitPattern === 'STRIPES' && (
          <>
            <rect x="24" y="10" width="7" height="60" fill={club.secondaryColor} />
            <rect x="37" y="10" width="7" height="60" fill={club.secondaryColor} />
            <rect x="50" y="10" width="7" height="60" fill={club.secondaryColor} />
          </>
        )}
        {club.kitPattern === 'HOOPS' && (
          <>
            <rect x="10" y="24" width="60" height="8" fill={club.secondaryColor} />
            <rect x="10" y="40" width="60" height="8" fill={club.secondaryColor} />
            <rect x="10" y="56" width="60" height="8" fill={club.secondaryColor} />
          </>
        )}
        {club.kitPattern === 'SASH' && (
          <path d="M16 62L56 12L66 18L26 70Z" fill={club.secondaryColor} />
        )}
        {club.kitPattern === 'CHEVRON' && (
          <path d="M20 28L40 42L60 28V37L40 51L20 37Z" fill={club.secondaryColor} />
        )}
      </g>
      <path
        d="M24 12L10 22L16 36L23 32V68H57V32L64 36L70 22L56 12C52 17 46 19 40 19C34 19 28 17 24 12Z"
        stroke={club.accentColor}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M28 13C32 19 48 19 52 13" stroke={club.accentColor} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

const HairPath: React.FC<{ styleName: PlayerAppearance['hairStyle']; color: string }> = ({
  styleName,
  color,
}) => {
  if (styleName === 'BALD') return null;
  if (styleName === 'AFRO') {
    return <circle cx="40" cy="24" r="18" fill={color} />;
  }
  if (styleName === 'CURLY') {
    return (
      <path
        d="M22 30C20 18 28 10 40 10C52 10 60 18 58 30C55 24 50 22 45 23C41 20 36 21 33 23C28 22 24 25 22 30Z"
        fill={color}
      />
    );
  }
  if (styleName === 'MOHAWK') {
    return <path d="M35 8H45L43 22H37L35 8Z" fill={color} />;
  }
  if (styleName === 'PONYTAIL') {
    return (
      <g>
        <path d="M24 28C24 16 31 11 40 11C49 11 56 16 56 28C51 22 29 22 24 28Z" fill={color} />
        <path d="M53 20C60 22 61 32 57 38" stroke={color} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }
  if (styleName === 'FADE') {
    return <path d="M24 27C25 16 32 11 40 11C48 11 55 16 56 27C51 20 29 20 24 27Z" fill={color} />;
  }
  return <path d="M23 30C23 16 30 11 40 11C50 11 57 16 57 30C52 22 28 22 23 30Z" fill={color} />;
};

export const ManagerPortraitSvg: React.FC<{
  appearance: ManagerAppearance;
  photoUrl?: string | null;
  size?: number;
}> = ({ appearance, photoUrl, size = 76 }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Manager Portrait"
        style={{ width: size, height: size }}
        className="rounded-xl object-cover bg-[#0a1128] border border-white/20 shrink-0"
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-xl bg-[#0a1128] border border-white/15 shrink-0"
      aria-label="Manager Portrait"
    >
      {appearance.outfit === 'SUIT' && (
        <g>
          <path d="M12 80C14 60 26 54 40 54C54 54 66 60 68 80H12Z" fill="#0f172a" />
          <path d="M33 54L40 74L47 54H33Z" fill="#f8fafc" />
          <path d="M38 56L40 74L42 56H38Z" fill="#00e5ff" />
        </g>
      )}
      {appearance.outfit === 'TRACKSUIT' && (
        <g>
          <path d="M12 80C14 60 26 54 40 54C54 54 66 60 68 80H12Z" fill="#1e293b" />
          <path d="M40 54V80" stroke="#b7ff4a" strokeWidth="2.5" />
          <path d="M24 58L19 78" stroke="#00e5ff" strokeWidth="2" />
          <path d="M56 58L61 78" stroke="#00e5ff" strokeWidth="2" />
        </g>
      )}
      {appearance.outfit === 'TURTLENECK' && (
        <g>
          <path d="M12 80C14 60 26 54 40 54C54 54 66 60 68 80H12Z" fill="#111827" />
          <rect x="31" y="48" width="18" height="10" rx="4" fill="#1f2937" />
        </g>
      )}
      <rect x="34" y="44" width="12" height="12" rx="4" fill={appearance.skinTone} />
      {appearance.hairStyle === 'AFRO' && <HairPath styleName="AFRO" color={appearance.hairColor} />}
      <ellipse cx="40" cy="34" rx="15" ry="17" fill={appearance.skinTone} />
      <circle cx="34" cy="33" r="1.8" fill="#0f172a" />
      <circle cx="46" cy="33" r="1.8" fill="#0f172a" />
      <path d="M35 42C38 44 42 44 45 42" stroke="#7c2d12" strokeWidth="1.6" strokeLinecap="round" />
      {appearance.facialHair === 'STUBBLE' && (
        <path
          d="M27 38C28 48 33 51 40 51C47 51 52 48 53 38"
          stroke={appearance.hairColor}
          strokeOpacity="0.35"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {appearance.facialHair === 'BEARD' && (
        <path
          d="M26 36C26 48 32 53 40 53C48 53 54 48 54 36C51 41 46 43 40 43C34 43 29 41 26 36Z"
          fill={appearance.hairColor}
        />
      )}
      {appearance.hairStyle !== 'AFRO' && (
        <HairPath styleName={appearance.hairStyle} color={appearance.hairColor} />
      )}
      {appearance.glasses && (
        <g stroke="#e2e8f0" strokeWidth="1.5">
          <rect x="29" y="29" width="9" height="7" rx="2" fill="none" />
          <rect x="42" y="29" width="9" height="7" rx="2" fill="none" />
          <line x1="38" y1="32" x2="42" y2="32" />
        </g>
      )}
    </svg>
  );
};

export const PlayerAvatarSvg: React.FC<{
  appearance: PlayerAppearance;
  shirtColor?: string;
  accentColor?: string;
  size?: number;
}> = ({ appearance, shirtColor = '#1e293b', accentColor = '#00e5ff', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-lg bg-[#080d11] border border-white/10 shrink-0"
      aria-label="Player Avatar"
    >
      <path d="M12 80C14 60 26 54 40 54C54 54 66 60 68 80H12Z" fill={shirtColor} />
      <path d="M32 54C35 59 45 59 48 54" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
      <rect x="34" y="44" width="12" height="12" rx="4" fill={appearance.skinTone} />
      {appearance.hairStyle === 'AFRO' && <HairPath styleName="AFRO" color={appearance.hairColor} />}
      <ellipse cx="40" cy="34" rx="15" ry="17" fill={appearance.skinTone} />
      <circle cx="34" cy="33" r="1.8" fill="#0f172a" />
      <circle cx="46" cy="33" r="1.8" fill="#0f172a" />
      <path d="M36 42H44" stroke="#7c2d12" strokeWidth="1.5" strokeLinecap="round" />
      {appearance.facialHair === 'STUBBLE' && (
        <path
          d="M27 38C28 48 33 51 40 51C47 51 52 48 53 38"
          stroke={appearance.hairColor}
          strokeOpacity="0.35"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
      {appearance.facialHair === 'BEARD' && (
        <path
          d="M26 36C26 48 32 53 40 53C48 53 54 48 54 36C51 41 46 43 40 43C34 43 29 41 26 36Z"
          fill={appearance.hairColor}
        />
      )}
      {appearance.hairStyle !== 'AFRO' && (
        <HairPath styleName={appearance.hairStyle} color={appearance.hairColor} />
      )}
    </svg>
  );
};

export const TournamentEmblemSvg: React.FC<{
  cupId: 'LEAGUE' | 'UCL' | 'UEL' | 'UECL' | 'UNL';
  size?: number;
  className?: string;
}> = ({ cupId, size = 64, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  if (cupId === 'UCL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="UEFA Champions League Emblem"
      >
        <defs>
          <radialGradient id={`uclBg_${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="65%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <linearGradient id={`uclSilver_${uid}`} x1="18" y1="12" x2="62" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="35" fill={`url(#uclBg_${uid})`} stroke={`url(#uclSilver_${uid})`} strokeWidth="2.8" />
        <circle cx="40" cy="40" r="29" stroke="#60A5FA" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 3" />
        {/* Starball stars ring */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const sx = 40 + Math.cos(rad) * 20;
          const sy = 34 + Math.sin(rad) * 18;
          return (
            <path
              key={deg}
              d={`M${sx} ${sy - 3.6}L${sx + 1.1} ${sy - 1}L${sx + 3.6} ${sy}L${sx + 1.1} ${sy + 1}L${sx} ${sy + 3.6}L${sx - 1.1} ${sy + 1}L${sx - 3.6} ${sy}L${sx - 1.1} ${sy - 1}Z`}
              fill="#E0F2FE"
              fillOpacity="0.9"
            />
          );
        })}
        {/* Sculpted Big-Ears Trophy Center */}
        <path
          d="M28 24C21 24 19 32 23 38C25 41 29 41 31 39M52 24C59 24 61 32 57 38C55 41 51 41 49 39"
          stroke={`url(#uclSilver_${uid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M29 22H51L48 43C47 48 43.5 51 40 51C36.5 51 33 48 32 43L29 22Z"
          fill={`url(#uclSilver_${uid})`}
          fillOpacity="0.25"
          stroke={`url(#uclSilver_${uid})`}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M35 51H45L47 58H33L35 51Z" fill={`url(#uclSilver_${uid})`} />
        <text
          x="40"
          y="69"
          textAnchor="middle"
          fill="#E0F2FE"
          fontSize="9"
          fontWeight="800"
          fontFamily="Chakra Petch, sans-serif"
          letterSpacing="1.6"
        >
          UCL
        </text>
      </svg>
    );
  }
  if (cupId === 'UEL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="UEFA Europa League Emblem"
      >
        <defs>
          <linearGradient id={`uelGrad_${uid}`} x1="16" y1="10" x2="64" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <path
          d="M40 6L70 20V44C70 59 57 69 40 74C23 69 10 59 10 44V20L40 6Z"
          fill="#1A0E06"
          stroke={`url(#uelGrad_${uid})`}
          strokeWidth="2.8"
        />
        <path d="M22 25L58 34M22 33L58 42" stroke="#F97316" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M30 20H50L46 44C45 48 42.8 50 40 50C37.2 50 35 48 34 44L30 20Z"
          fill={`url(#uelGrad_${uid})`}
          fillOpacity="0.28"
          stroke={`url(#uelGrad_${uid})`}
          strokeWidth="2.4"
        />
        <rect x="34" y="51" width="12" height="6" rx="1.5" fill={`url(#uelGrad_${uid})`} />
        <text
          x="40"
          y="67"
          textAnchor="middle"
          fill="#FDBA74"
          fontSize="9"
          fontWeight="800"
          fontFamily="Chakra Petch, sans-serif"
          letterSpacing="1.6"
        >
          UEL
        </text>
      </svg>
    );
  }
  if (cupId === 'UECL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="UEFA Conference League Emblem"
      >
        <defs>
          <linearGradient id={`ueclGrad_${uid}`} x1="16" y1="10" x2="64" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <path
          d="M40 7L68 18V43C68 58 55 68 40 73C25 68 12 58 12 43V18L40 7Z"
          fill="#031B13"
          stroke={`url(#ueclGrad_${uid})`}
          strokeWidth="2.8"
        />
        <path
          d="M31 21H49L46 44C45 47.5 42.6 50 40 50C37.4 50 35 47.5 34 44L31 21Z"
          fill={`url(#ueclGrad_${uid})`}
          fillOpacity="0.26"
          stroke={`url(#ueclGrad_${uid})`}
          strokeWidth="2.3"
        />
        <path d="M27 25C23 27 23 35 28 38M53 25C57 27 57 35 52 38" stroke="#6EE7B7" strokeWidth="2.1" strokeLinecap="round" />
        <rect x="34" y="51" width="12" height="6" rx="1.5" fill={`url(#ueclGrad_${uid})`} />
        <text
          x="40"
          y="67"
          textAnchor="middle"
          fill="#6EE7B7"
          fontSize="8.5"
          fontWeight="800"
          fontFamily="Chakra Petch, sans-serif"
          letterSpacing="1.2"
        >
          UECL
        </text>
      </svg>
    );
  }
  if (cupId === 'UNL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="UEFA Nations League Emblem"
      >
        <defs>
          <linearGradient id={`unlGrad_${uid}`} x1="15" y1="10" x2="65" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <polygon
          points="40,6 69,22 69,56 40,74 11,56 11,22"
          fill="#061727"
          stroke={`url(#unlGrad_${uid})`}
          strokeWidth="2.8"
        />
        <path d="M24 27L40 19L56 27L48 48H32L24 27Z" fill={`url(#unlGrad_${uid})`} fillOpacity="0.24" stroke={`url(#unlGrad_${uid})`} strokeWidth="2.1" />
        <path d="M28 53H52" stroke="#FACC15" strokeWidth="2.6" strokeLinecap="round" />
        <text
          x="40"
          y="66"
          textAnchor="middle"
          fill="#67E8F9"
          fontSize="8.5"
          fontWeight="800"
          fontFamily="Chakra Petch, sans-serif"
          letterSpacing="1.5"
        >
          UNL
        </text>
      </svg>
    );
  }
  return <ZephyrManagerShieldSvg size={size} showWordmark={false} className={className} />;
};

export const NationalFlagBadge: React.FC<{
  code: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  size?: number;
}> = ({ code, primaryColor, secondaryColor, accentColor = '#ffffff', size = 38 }) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `flag_${code}_${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-label={code}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="4" y="6" width="40" height="36" rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="4" y="6" width="40" height="36" fill={primaryColor} />
        <rect x="4" y="18" width="40" height="12" fill={secondaryColor} fillOpacity="0.88" />
        <rect x="4" y="30" width="40" height="12" fill={accentColor} fillOpacity="0.28" />
        <rect x="4" y="15" width="40" height="18" fill="#060B14" fillOpacity="0.62" />
      </g>
      <rect x="4" y="6" width="40" height="36" rx="8" stroke={accentColor} strokeWidth="2" strokeOpacity="0.7" />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="800"
        fontFamily="Chakra Petch, sans-serif"
        letterSpacing="0.8"
      >
        {code.slice(0, 3)}
      </text>
    </svg>
  );
};

