import type { SVGProps } from 'react';

const paths: Record<string, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V21h13V9.5', 'M9 21v-7h6v7'],
  scan: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M8 12h8'],
  hand: ['M8 12V6.5a1.5 1.5 0 0 1 3 0V11', 'M11 10V5.5a1.5 1.5 0 0 1 3 0V11', 'M14 10V7a1.5 1.5 0 0 1 3 0v5', 'M17 11a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-1A6.5 6.5 0 0 1 7 18l-2-3a1.7 1.7 0 0 1 2.7-2.1L8 14'],
  library: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z', 'M4 5.5v15.5', 'M8 7h8', 'M8 11h7'],
  arrow: ['M7 17 17 7', 'M7 7h10v10'],
  back: ['m15 18-6-6 6-6', 'M9 12h12'],
  play: ['m8 5 12 7-12 7z'],
  volume: ['M11 5 6 9H3v6h3l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
  camera: ['M14 4H10l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z', 'M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  rotate: ['M20 7v5h-5', 'M4 17v-5h5', 'M5.5 9A7 7 0 0 1 18 6l2 1', 'M4 17l2 1a7 7 0 0 0 12.5-3'],
  reset: ['M3 12a9 9 0 1 0 2.6-6.4L3 8', 'M3 3v5h5'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  check: ['m5 12 4 4L19 6'],
  info: ['M12 16v-4', 'M12 8h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z'],
  chevron: ['m9 18 6-6-6-6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  sun: ['M12 3v2', 'M12 19v2', 'M3 12h2', 'M19 12h2', 'm5.6 5.6 1.4 1.4', 'm17 17 1.4 1.4', 'm18.4 5.6-1.4 1.4', 'M7 17l-1.4 1.4', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof paths;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
