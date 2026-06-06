// WhaleWatch design tokens — bold & energetic, dark + neon.
// Mobile-first: every size below is tuned for a 390px-wide phone.

export const colors = {
  // Surfaces
  bg: '#06070D', // near-black app background
  surface: '#0F1220', // card background
  surfaceAlt: '#161A2C', // raised / pressed
  border: '#222843',

  // Text
  text: '#F4F6FF',
  textDim: '#9AA3C7',
  textFaint: '#5C6488',

  // Neon accents
  neon: '#00E5FF', // primary cyan
  neonPurple: '#A35BFF',
  neonPink: '#FF4D9D',

  // Mood scale (fearful -> greedy)
  fearful: '#FF3B5C', // red
  neutral: '#FFC24B', // amber
  greedy: '#22E0A1', // green

  // Whale tiers
  tierFish: '#5C6488', // $1M+
  tierWhale: '#00E5FF', // $5M+
  tierFire: '#FF4D9D', // $10M+
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const font = {
  // sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
} as const;

// Inter family (loaded in App.tsx). Use these instead of fontWeight so the
// type looks consistent and premium across iOS / Android / web.
export const type = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

// Map a mood score in [0,100] (0 = max fear, 100 = max greed) to a color.
export function moodColor(score: number): string {
  if (score < 40) return colors.fearful;
  if (score < 60) return colors.neutral;
  return colors.greedy;
}

export function moodLabel(score: number): 'Fearful' | 'Neutral' | 'Greedy' {
  if (score < 40) return 'Fearful';
  if (score < 60) return 'Neutral';
  return 'Greedy';
}
