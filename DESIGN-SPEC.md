# Visual & UX Specification

### 1. Brief Inference & Vibe Read
- Vibe sentence: "Reading this as: a high-converting, premium AI-powered job application helper (resume parsing, ATS matching, mock interviews, tracker) for modern professionals, with a tactile editorial/dark-tech visual language, leaning toward a high-end, structured design system utilizing warm tones, amber-gold accents, and clean dividers."
- Core Dials: VARIANCE = 4/5 (asymmetrical bento grids, tactile widgets, and clean overlays), MOTION = 3/5 (precise framer-motion reveals, smooth toggles, and zero-gravity transitions), DENSITY = 4/5 (compact typography, clean structural headers, and focused spacing controls).

### 2. Colors & Typography
- Primary Brand Color: Amber-Gold (`#EFC94C`)
- Background Theme: Dark Mode (Default) = `#121316` / `#0E0E10`; Light Mode (Toggle) = `#F7F6F2` / `#FAFAF7` (warm paper theme)
- Font Families: Sans = `Satoshi` or `Geist` (Modern sans-serif with tight tracking: `tracking-[-0.03em]`), Serif Display = `Cabinet Grotesk` or `Instrument Serif` (for high-end display headings), Mono = `JetBrains Mono` (for matching scores, tags, and stats).

### 3. Page Layout & Component Grid

- **Navbar**: Replace generic nav with a premium, floatable responsive navbar:
  - Component: `Floating Dock` or `Glass Navbar`
  - URL: `https://21st.dev/r/shadcn/dock`
  - Customization: Custom-mapped colors. Primary buttons use `#EFC94C` (Amber-Gold) as the base glow rather than purple. Dark theme background uses `#1E2024` with `backdrop-blur`.

- **Hero**: Tactile two-column layout with real interactive preview features:
  - Component: `Hero Section with Interactive Mockup` (inspired by Kokonut Baffier's designs or `SaaSify` hero models)
  - URL: `https://21st.dev/r/kokonutd/designer-template` (adapted parts)
  - Layout: Left: High-impact display header (Cabinet Grotesk, max 2 lines, tracking-[-0.04em]), subhead, and prominent CTAs (Primary in Amber-Gold `#EFC94C` with a strong offset shadow). Right: An interactive mock file upload node showcasing a real-time parsed state transitions.

- **Section 2 (Trust Cloud)**: Moving marquee of tech logos (Vercel, Supabase, Stripe, Neon, Resend):
  - Component: `Marquee`
  - URL: `https://21st.dev/r/magicui/marquee`
  - Visuals: Monochromatic greyed-out client logos using Simple Icons (`https://cdn.simpleicons.org/{slug}`) that colorize on hover.

- **Section 3 (Features Grid)**: A structured Bento Grid that replaces standard card templates with interactive micro-previews of features:
  - Component: `Bento Grid` by `@kokonutd`
  - URL: `https://21st.dev/r/kokonutd/bento-grid`
  - Customization: Custom cards representing:
    1. *Resume Parser*: Visual parser block showing a file drag-and-drop state.
    2. *ATS Reviewer*: Match meter running on real-time simulated sliders (from 40% to 92%).
    3. *AI Co-Pilot*: Clean chat message component with an interactive rewrite bubble.
    4. *Mock Interviewer*: An active recording/voice visualizer wave animation.

- **Section 4 (Interactive Mock Interview Showcase)**: A dedicated section demonstrating the voice mock interview prep:
  - Component: `AI Voice Input` by `@kokonutd`
  - URL: `https://21st.dev/r/kokonutd/ai-voice-input`
  - Customization: Styled in dark charcoal (#1E2024) with glowing golden audio wave state rings using the `#EFC94C` primary accent.

- **Section 5 (Pricing Section)**: Interactive pricing comparison with billing interval toggles:
  - Component: `Pricing Table` by `@kokonutd`
  - URL: `https://21st.dev/r/kokonutd/pricing-table`
  - Customization: Toggle with NumberFlow animations for fluid transitions. Pro plan features an elegant gold border wash and amber accent badges.

- **Section 6 (Testimonials)**: Premium review cards showing verified user outcomes:
  - Component: `Animated Testimonials` by Manu Arora (Aceternity)
  - URL: `https://21st.dev/r/aceternity/animated-testimonials`
  - Customization: Clean quote layers utilizing serif displays for quotes, sans-serif for metadata.

- **Footer**: Detailed, structured index layout:
  - Component: `Footer with Social Links and Newsletter`
  - URL: `https://21st.dev/r/kokonutd/designer-template` (adapted footer component)
  - Styling: Neutral dark grey dividers, structured columns, minimal bottom copyright anchor.

---

### 4. Interactive & Motion Blueprints
- **Transitions**: Frame-based entry reveals utilizing spring dynamics: `stiffness: 150`, `damping: 18`. Elements cascade using staggered delays.
- **Card Hover States**: Cards elevate with a translation of `translate-y-[-4px]` accompanied by a soft primary glow shadow (`shadow-primary/10`).
- **Toggles**: Pricing selector uses framer-motion layout animations (`layoutId`) for the active state wash.

---

### 5. Visual Asset Plan
- **Mascot Details**: Clean SVG or lottie asset of Jobby the robot placed inline within the hero CTA and the onboarding steps.
- **SVG Logos (Simple Icons)**: `https://cdn.simpleicons.org/vercel`, `https://cdn.simpleicons.org/stripe`, `https://cdn.simpleicons.org/supabase`, `https://cdn.simpleicons.org/neon`, `https://cdn.simpleicons.org/posthog`.
- **Seeded Photos**: Custom-themed Unsplash placeholder photos (e.g. `https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80`) for testimonials, ensuring professional headshots match the premium vibe.
- **Mock Screenshots**: Ditch default div-based blocks. Render highly tactile, nested HTML mockup widgets showing actual resume editors and scoring bars.

---

## Token Specification: Tailwind v4 / CSS Globals

Below is the complete CSS replacement sheet for `src/app/globals.css` that maps our custom brand colors (warm off-white light theme and charcoal-gold dark theme) using Tailwind CSS v4 syntax.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../components/agent-elements/agent-ui.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Custom Brand Tokens */
  --color-brand-amber: var(--brand-amber);
  --color-brand-navy: var(--brand-navy);
  --color-brand-gold: var(--brand-gold);
  --color-hero-wash: var(--hero-wash);

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
}

:root {
  /* ── Light Theme (Warm Paper #F7F6F2) ── */
  --background: #F7F6F2;
  --foreground: #2A2D33;
  --card: #FFFFFF;
  --card-foreground: #2A2D33;
  --popover: #FFFFFF;
  --popover-foreground: #2A2D33;
  --primary: #EFC94C;
  --primary-foreground: #121316;
  --secondary: #EFEEE9;
  --secondary-foreground: #2A2D33;
  --muted: #F0EFEA;
  --muted-foreground: #6F727A;
  --accent: rgba(239, 201, 76, 0.1);
  --accent-foreground: #C9A24B;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #E6E5DF;
  --input: #E6E5DF;
  --ring: #C9A24B;

  /* Brand Specifics */
  --brand-amber: #DAA520;
  --brand-navy: #1E2A4A;
  --brand-gold: #C9A24B;
  --hero-wash: linear-gradient(135deg, #E8F0F7 0%, rgba(255,255,255,0) 100%);

  /* Typography */
  --font-sans: 'Satoshi', var(--font-inter, 'Inter Variable'), 'Inter', sans-serif;
  --font-display: 'Cabinet Grotesk', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Dark Mode (Default) */
.dark, :root {
  /* ── Dark Theme (Near-Black #121316) ── */
  --background: #121316;
  --foreground: #EDEDE8;
  --card: #1E2024;
  --card-foreground: #EDEDE8;
  --popover: #1E2024;
  --popover-foreground: #EDEDE8;
  --primary: #EFC94C;
  --primary-foreground: #121316;
  --secondary: #26282D;
  --secondary-foreground: #EDEDE8;
  --muted: #26282D;
  --muted-foreground: #8B8E95;
  --accent: rgba(239, 201, 76, 0.15);
  --accent-foreground: #EFC94C;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #33363B;
  --input: #33363B;
  --ring: #EFC94C;

  /* Brand Specifics */
  --brand-amber: #DAA520;
  --brand-navy: #1E2A4A;
  --brand-gold: #C9A24B;
  --hero-wash: radial-gradient(circle at 50% 50%, rgba(239, 201, 76, 0.05) 0%, transparent 80%);
}
```

---

## Redesign Action Summary

### Component Installation Map
| Area | Old Component | Replacement Component | Install URL / Source |
|---|---|---|---|
| Navbar | Simple static header | Floating Dock | `https://21st.dev/r/shadcn/dock` |
| Hero | Div-based mock panels | Designer Template Hero & Mockup | `https://21st.dev/r/kokonutd/designer-template` |
| Features | Standard CSS column grids | Bento Grid | `https://21st.dev/r/kokonutd/bento-grid` |
| Interview Prep | Text layout blocks | AI Voice Input Visualizer | `https://21st.dev/r/kokonutd/ai-voice-input` |
| Pricing Section| Custom grids | Pricing Table with NumberFlow | `https://21st.dev/r/kokonutd/pricing-table` |
| Testimonials | None / Simple comments | Animated Testimonials | `https://21st.dev/r/aceternity/animated-testimonials` |

### Cleanup & Deletion Roadmap
1. **Remove generic assets**: Drop any generic visual CSS grid patterns and static image boxes inside `/src/app/components/marketing/grid-pattern.tsx` that look like templated AI stock.
2. **Consolidate layout wrappers**: Scrap the separate static dashboard layout structures in `/src/app/components/layout/sidebar.tsx` and replace them with a responsive collapsing wrapper based on Aceternity Sidebar patterns to allow seamless canvas sizing.
3. **Clean up manual CSS overrides**: Prune custom layout variables in `app/globals.css` and use native Tailwind CSS classes exclusively.
