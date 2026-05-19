export interface BackgroundOption {
  id: string;
  label: string;
  color: string | null;
  swatch: string;
}

export interface PaletteSwatch {
  id: string;
  label: string;
  h: number;
  s: number;
  l: number;
  hex: string;
}
