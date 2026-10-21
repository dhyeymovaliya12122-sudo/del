# Website Design & Production Guidelines

All user-facing web applications, landing pages, and marketing views in this repository must strictly adhere to the following principles:

## 1. Visual Styling
- **No green gradients**: Do not use generic AI green gradients (`linear-gradient(135deg, #10b981, #00e5ff)`, radial greens, or neon fades). Use solid, high-contrast, intentional colors (e.g., `#0f172a`, `#1e293b`, `#10b981`).
- **No pill-shaped buttons**: Never use `rounded-full`, `borderRadius: 9999px`, or `borderRadius: 24px–30px` on action buttons and cards. Standardize strictly on geometric modern corner radiuses: `4px` to `8px`.
- **No over-the-top scroll animations or custom cursor effects**: Avoid artificial cursor trackers, heavy parallax jank, and bouncy CSS physics. Keep transitions snappy and subtle (`0.15s ease`).

## 2. Copy & Typography
- **No vague hero copy**: State exactly what the engine does directly and concisely. Avoid generic AI buzzwords ("Quantum Scale", "Next-Gen Paradigm", "Cyberpunk Magic").
- **No emoji icons**: Never use Unicode emoji characters (`🚀`, `✨`, `💡`, `⭐`, `🌌`, `👻`) in UI headers, buttons, navigation links, or status badges. Use clean Lucide SVG icons exclusively.
- **No em dashes (`—`)**: Replace em dashes with hyphens (`-`), colons (`:`), or clear sentence structures.
- **No AI stock copy**: Write factual, engineering-first documentation and interface microcopy.
- **No AI stock photography**: Use clean SVGs, interactive code terminals, and inspectable interface elements instead of generic stock imagery.

## 3. Trust & Authenticity
- **No fake reviews**: Never inject fabricated customer testimonials or generated reviews.
- **No fake metrics**: Replace inflated counters ("250M+ Messages", "+34% MoM") with real, verifiable technical specifications (protocols, queues, storage mechanisms).
- **No fake customer counters**: Never add synthetic "X users viewing right now" tickers.

## 4. Pre-Launch Checklist
- Favicon configured and verified (no 404s).
- Custom domain connected.
- Zero "Made with AI" badges or platform watermarks.
- Functional, dedicated Privacy Policy page.
- Functional, dedicated Terms and Conditions page.
- Clean TypeScript build with zero compilation errors.
