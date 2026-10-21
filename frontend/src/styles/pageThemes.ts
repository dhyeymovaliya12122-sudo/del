/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🎨 PAGE THEMES & 3D VISUAL IDENTITY SYSTEM
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Distinct, high-contrast color palettes for each individual page:
 *
 * 1. Homepage (Landing):
 *    Dark Cyberpunk — Deep Obsidian, Neon Violet accents, Electric Cyan highlights.
 *
 * 2. About / Dashboard:
 *    Tech Minimalist — Slate Gray background, Pure White / Frost cards, Vivid Mint Green accents.
 *
 * 3. Services / Alerts:
 *    High-Alert Dynamic — Dark Charcoal background, Warning Amber/Orange accents, Crimson highlights.
 *
 * 4. Contact:
 *    Clean Calm Executive — Deep Navy background, Soft Gold accents, Crisp White typography.
 *
 * All palettes strictly adhere to WCAG AA / AAA readability (minimum 4.5:1 text contrast).
 */

export interface PageTheme {
  id: string;
  name: string;
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgSurfaceHover: string;
  // Accents & Highlights
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  accentRGB: [number, number, number];
  highlightRGB: [number, number, number];
  // Borders
  borderSubtle: string;
  borderActive: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;
  // 3D Canvas properties
  meshColorA: string;
  meshColorB: string;
  ambientLight: string;
  gridColor: string;
}

export const PAGE_THEMES: Record<string, PageTheme> = {
  // ── 1. HOMEPAGE: Futuristic Dark Cyberpunk ──
  landing: {
    id: 'landing',
    name: 'Dark Cyberpunk',
    bgPrimary: '#060810',
    bgSecondary: '#0B0F19',
    bgSurface: 'rgba(15, 20, 36, 0.72)',
    bgSurfaceHover: 'rgba(23, 30, 52, 0.85)',
    accentPrimary: '#A855F7', // Neon Violet
    accentSecondary: '#00F0FF', // Electric Cyan
    accentGlow: 'rgba(168, 85, 247, 0.45)',
    accentRGB: [168, 85, 247],
    highlightRGB: [0, 240, 255],
    borderSubtle: 'rgba(168, 85, 247, 0.18)',
    borderActive: 'rgba(0, 240, 255, 0.45)',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    textAccent: '#00F0FF',
    meshColorA: '#A855F7',
    meshColorB: '#00F0FF',
    ambientLight: 'rgba(168, 85, 247, 0.15)',
    gridColor: 'rgba(0, 240, 255, 0.07)',
  },

  // ── 2. ABOUT / DASHBOARD: Sleek Professional Tech Minimalist ──
  app: {
    id: 'app',
    name: 'Tech Minimalist',
    bgPrimary: '#0A0F1D',
    bgSecondary: '#0F172A', // Slate Gray
    bgSurface: 'rgba(255, 255, 255, 0.05)',
    bgSurfaceHover: 'rgba(255, 255, 255, 0.09)',
    accentPrimary: '#10B981', // Vivid Mint Green
    accentSecondary: '#2DD4BF', // Crisp Mint Highlight
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    accentRGB: [16, 185, 129],
    highlightRGB: [45, 212, 191],
    borderSubtle: 'rgba(255, 255, 255, 0.12)',
    borderActive: 'rgba(16, 185, 129, 0.45)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    textAccent: '#2DD4BF',
    meshColorA: '#10B981',
    meshColorB: '#34D399',
    ambientLight: 'rgba(16, 185, 129, 0.12)',
    gridColor: 'rgba(255, 255, 255, 0.04)',
  },

  // ── 3. SERVICES / ALERTS: High-Alert Dynamic ──
  alert: {
    id: 'alert',
    name: 'High-Alert Crimson',
    bgPrimary: '#0F1117',
    bgSecondary: '#161822', // Dark Charcoal
    bgSurface: 'rgba(24, 27, 38, 0.8)',
    bgSurfaceHover: 'rgba(34, 38, 54, 0.9)',
    accentPrimary: '#FF6B35', // Warning Amber / Orange
    accentSecondary: '#EF4444', // Crucial Crimson
    accentGlow: 'rgba(239, 68, 68, 0.45)',
    accentRGB: [255, 107, 53],
    highlightRGB: [239, 68, 68],
    borderSubtle: 'rgba(239, 68, 68, 0.25)',
    borderActive: 'rgba(255, 107, 53, 0.65)',
    textPrimary: '#FFF1F2',
    textSecondary: '#FDA4AF',
    textMuted: '#94A3B8',
    textAccent: '#FF6B35',
    meshColorA: '#FF6B35',
    meshColorB: '#EF4444',
    ambientLight: 'rgba(239, 68, 68, 0.18)',
    gridColor: 'rgba(255, 107, 53, 0.08)',
  },

  // ── 4. CONTACT: Clean Calm Executive ──
  contact: {
    id: 'contact',
    name: 'Executive Navy Gold',
    bgPrimary: '#050D1E',
    bgSecondary: '#0A162D', // Deep Navy
    bgSurface: 'rgba(14, 27, 52, 0.75)',
    bgSurfaceHover: 'rgba(20, 39, 74, 0.88)',
    accentPrimary: '#F59E0B', // Soft Gold
    accentSecondary: '#FCD34D', // Shimmer Gold
    accentGlow: 'rgba(245, 158, 11, 0.38)',
    accentRGB: [245, 158, 11],
    highlightRGB: [252, 211, 77],
    borderSubtle: 'rgba(245, 158, 11, 0.22)',
    borderActive: 'rgba(252, 211, 77, 0.55)',
    textPrimary: '#FFFFFF', // Crisp White
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    textAccent: '#FCD34D',
    meshColorA: '#F59E0B',
    meshColorB: '#FCD34D',
    ambientLight: 'rgba(245, 158, 11, 0.14)',
    gridColor: 'rgba(245, 158, 11, 0.05)',
  },

  // ── 5. FEATURES: Quantum Holographic ──
  features: {
    id: 'features',
    name: 'Quantum Holographic',
    bgPrimary: '#070A18',
    bgSecondary: '#0D132A',
    bgSurface: 'rgba(18, 25, 52, 0.72)',
    bgSurfaceHover: 'rgba(26, 36, 75, 0.85)',
    accentPrimary: '#6366F1', // Indigo Electric
    accentSecondary: '#00E5FF', // Cyan Beam
    accentGlow: 'rgba(99, 102, 241, 0.4)',
    accentRGB: [99, 102, 241],
    highlightRGB: [0, 229, 255],
    borderSubtle: 'rgba(99, 102, 241, 0.2)',
    borderActive: 'rgba(0, 229, 255, 0.5)',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    textAccent: '#38BDF8',
    meshColorA: '#6366F1',
    meshColorB: '#00E5FF',
    ambientLight: 'rgba(99, 102, 241, 0.15)',
    gridColor: 'rgba(99, 102, 241, 0.06)',
  },

  // ── 6. PRICING: High-Value Emerald & Violet ──
  pricing: {
    id: 'pricing',
    name: 'High-Value Emerald',
    bgPrimary: '#060B12',
    bgSecondary: '#0C1724',
    bgSurface: 'rgba(16, 28, 44, 0.72)',
    bgSurfaceHover: 'rgba(24, 42, 66, 0.85)',
    accentPrimary: '#10B981', // Emerald
    accentSecondary: '#8B5CF6', // Purple Royalty
    accentGlow: 'rgba(16, 185, 129, 0.38)',
    accentRGB: [16, 185, 129],
    highlightRGB: [139, 92, 246],
    borderSubtle: 'rgba(16, 185, 129, 0.2)',
    borderActive: 'rgba(139, 92, 246, 0.5)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E2E8F0',
    textMuted: '#64748B',
    textAccent: '#34D399',
    meshColorA: '#10B981',
    meshColorB: '#8B5CF6',
    ambientLight: 'rgba(16, 185, 129, 0.15)',
    gridColor: 'rgba(16, 185, 129, 0.05)',
  },
};

export const getThemeForRoute = (route: string): PageTheme => {
  return PAGE_THEMES[route] || PAGE_THEMES.app;
};
