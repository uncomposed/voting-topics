import React from 'react';

type Props = React.SVGProps<SVGSVGElement> & { size?: number };

const S = { w: 24, h: 24, stroke: 'currentColor', fill: 'none', sw: 1.8, lc: 'round', lj: 'round' } as const;

export const IconShare: React.FC<Props> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" {...rest}>
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj} fill={S.fill}
      d="M12 3v12m0-12 4 4m-4-4-4 4M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" />
  </svg>
);

export const IconBraces: React.FC<Props> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" {...rest}>
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj} fill={S.fill}
      d="M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3" />
  </svg>
);

export const IconFile: React.FC<Props> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" {...rest}>
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj} fill={S.fill}
      d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} d="M14 3v5h5" />
  </svg>
);

export const IconImage: React.FC<Props> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" {...rest}>
    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke={S.stroke} strokeWidth={S.sw} fill={S.fill} />
    <circle cx="9" cy="10" r="1.6" fill={S.stroke} />
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj}
      d="M21 15l-4.5-3.5L12 16l-3-2.5L3 17" />
  </svg>
);

export const IconLink: React.FC<Props> = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" {...rest}>
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} strokeLinejoin={S.lj} fill={S.fill}
      d="M10 14 8.5 15.5a4 4 0 1 1-5.7-5.6L5 8.7M14 10l1.5-1.5a4 4 0 1 1 5.7 5.6L19 15.3" />
    <path stroke={S.stroke} strokeWidth={S.sw} strokeLinecap={S.lc} d="M9 12h6" />
  </svg>
);

