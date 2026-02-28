"use client";

import React from "react";

/** FIFA code → ISO 3166-1 alpha-2 lowercase (with subdivisions for UK nations) */
export const fifaToIso2: Record<string, string> = {
  // UEFA (16)
  GER: "de",
  ESP: "es",
  FRA: "fr",
  ENG: "gb-eng",
  POR: "pt",
  NED: "nl",
  BEL: "be",
  CRO: "hr",
  SUI: "ch",
  AUT: "at",
  DEN: "dk",
  SRB: "rs",
  POL: "pl",
  UKR: "ua",
  TUR: "tr",
  SCO: "gb-sct",
  // CONMEBOL (6)
  BRA: "br",
  ARG: "ar",
  URU: "uy",
  COL: "co",
  ECU: "ec",
  CHI: "cl",
  // CAF (9)
  MAR: "ma",
  SEN: "sn",
  NGA: "ng",
  CIV: "ci",
  CMR: "cm",
  EGY: "eg",
  ALG: "dz",
  RSA: "za",
  TUN: "tn",
  // AFC (7)
  JPN: "jp",
  KOR: "kr",
  IRN: "ir",
  AUS: "au",
  KSA: "sa",
  QAT: "qa",
  CHN: "cn",
  UZB: "uz",
  // CONCACAF (7)
  USA: "us",
  MEX: "mx",
  CAN: "ca",
  CRC: "cr",
  PAN: "pa",
  JAM: "jm",
  HON: "hn",
  TRI: "tt",
  HAI: "ht",
  CUW: "cw",
  // OFC (1)
  NZL: "nz",
  // New WC2026 teams
  CPV: "cv",
  NOR: "no",
  JOR: "jo",
  PAR: "py",
  GHA: "gh",
};

/** FIFA code → country / team display name */
const fifaToName: Record<string, string> = {
  GER: "Germany",
  ESP: "Spain",
  FRA: "France",
  ENG: "England",
  POR: "Portugal",
  NED: "Netherlands",
  BEL: "Belgium",
  CRO: "Croatia",
  SUI: "Switzerland",
  AUT: "Austria",
  DEN: "Denmark",
  SRB: "Serbia",
  POL: "Poland",
  UKR: "Ukraine",
  TUR: "Turkey",
  SCO: "Scotland",
  BRA: "Brazil",
  ARG: "Argentina",
  URU: "Uruguay",
  COL: "Colombia",
  ECU: "Ecuador",
  CHI: "Chile",
  MAR: "Morocco",
  SEN: "Senegal",
  NGA: "Nigeria",
  CIV: "Ivory Coast",
  CMR: "Cameroon",
  EGY: "Egypt",
  ALG: "Algeria",
  RSA: "South Africa",
  TUN: "Tunisia",
  JPN: "Japan",
  KOR: "South Korea",
  IRN: "Iran",
  AUS: "Australia",
  KSA: "Saudi Arabia",
  QAT: "Qatar",
  CHN: "China",
  UZB: "Uzbekistan",
  USA: "USA",
  MEX: "Mexico",
  CAN: "Canada",
  CRC: "Costa Rica",
  PAN: "Panama",
  JAM: "Jamaica",
  HON: "Honduras",
  TRI: "Trinidad and Tobago",
  HAI: "Haiti",
  CUW: "Curaçao",
  NZL: "New Zealand",
  CPV: "Cape Verde",
  NOR: "Norway",
  JOR: "Jordan",
  PAR: "Paraguay",
  GHA: "Ghana",
  POA: "UEFA Playoff A",
  POB: "UEFA Playoff B",
  POC: "UEFA Playoff C",
  POD: "UEFA Playoff D",
  IP1: "FIFA IC Playoff 1",
  IP2: "FIFA IC Playoff 2",
};

/**
 * Returns a flagcdn.com PNG URL for the given FIFA code.
 * flagcdn.com supports specific widths: 20, 40, 80, 160, 320, 640, 1280, 2560.
 * We pick the smallest width that is >= requested display width.
 */
export function getFlagUrl(fifaCode: string, width?: number): string {
  const iso = fifaToIso2[fifaCode];
  if (!iso) return "";
  const requested = width || 80;
  const supported = [20, 40, 80, 160, 320, 640, 1280, 2560];
  const w = supported.find((s) => s >= requested) || 80;
  return `https://flagcdn.com/w${w}/${iso}.png`;
}

export interface FlagImgProps {
  fifaCode: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Renders a flag <img> for a FIFA country code. */
export function FlagImg({
  fifaCode,
  width = 40,
  height = 30,
  className,
  style,
}: FlagImgProps) {
  const url = getFlagUrl(fifaCode, width);
  if (!url) return null;

  const name = fifaToName[fifaCode] ?? fifaCode;

  return React.createElement("img", {
    src: url,
    alt: `Flag of ${name}`,
    width,
    height,
    className,
    style,
  });
}
