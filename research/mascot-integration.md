# Mascot Integration Research — Modern SaaS Patterns 2026

## Problem Statement
Current mascot ("Jobby") uses a simple CSS `translateY(-12px)` float animation that makes it look like a 2D sticker bouncing up and down — detached from the page, not integrated into the design system.

## Key Findings

### 1. Duolingo (Duo the Owl) — The Gold Standard
- **NOT floating randomly** — Duo is always contextually positioned: peeking from behind cards, sitting inside UI frames, reacting to user actions
- **3D-rendered** (not 2D PNG) — gives depth and presence
- **Contextual states**: happy (streak), sad (missed lesson), excited (level up)
- **Part of the layout**: sits IN the design grid, not overlaid on top
- **Minimal animation**: subtle breathing/bob, NOT constant up-down floating
- **Key insight**: Duo feels like a CHARACTER in the app, not a decorative sticker

### 2. Modern SaaS Mascot Patterns (2026)

**Pattern A: "Peeking" (Sentry, Statuspage)**
- Mascot peeks from behind a card/section edge
- Only partially visible (head + shoulders)
- Creates depth illusion — mascot is "behind" the UI layer
- Static or very subtle parallax on scroll
- CSS: `position: absolute; bottom: -20%; clip-path or overflow: hidden on parent`

**Pattern B: "Inline Hero Companion" (Duolingo, Headspace)**
- Mascot sits BESIDE the hero text, same z-index
- Not floating — standing/sitting naturally
- Part of the hero composition, not an afterthought
- Animation: idle breathing (scale 1.0→1.02), occasional blink, NOT bounce
- CSS: subtle `transform: scale()` keyframe, 4s+ duration

**Pattern C: "Embedded in Product Mockup" (Notion, Linear)**
- Mascot appears INSIDE the product screenshot/mockup as an avatar
- Feels native to the product UI
- Used as AI assistant avatar, empty state illustration, loading state
- No standalone floating — always within a UI container

**Pattern D: "Scroll-Reactive" (Stripe, Pitch)**
- Mascot appears at specific scroll positions
- Changes pose/expression based on section
- Creates a narrative journey down the page
- Implementation: Intersection Observer + CSS transforms

### 3. Anti-Patterns to Avoid

1. **Constant floating bounce** (current implementation) — feels cheap, distracting, "AI slop"
2. **2D sticker on 3D-ish UI** — if UI uses depth/shadows, flat PNG looks pasted
3. **Too many mascots on one page** — current landing has 4+ mascot instances
4. **Generic glow blobs** — the `blur-3xl opacity-60` glow looks like every AI-generated site
5. **Mascot not respecting layout grid** — floating absolute on top of content

### 4. Technical Implementation Patterns

#### Breathing Animation (instead of float)
```css
@keyframes mascot-breathe {
  0%, 100% { transform: scale(1) translateY(0); }
  50%      { transform: scale(1.02) translateY(-3px); }
}
/* 4-5s duration, subtle */
```

#### Peek-from-behind (Sentry style)
```css
.mascot-peek {
  position: absolute;
  bottom: -30%; /* hidden behind card bottom */
  z-index: 0; /* behind card content */
}
.parent-card {
  position: relative;
  overflow: visible; /* let mascot peek out */
}
```

#### Scroll-reactive parallax
```tsx
// Mascot moves slightly based on scroll position
const [offset, setOffset] = useState(0)
useEffect(() => {
  const handler = () => setOffset(window.scrollY * 0.02)
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
// Apply: style={{ transform: `translateY(${offset}px)` }}
```

### 5. Recommendations for Job For Sure

**Current mascots**: Jobby (hero), Scrappy (job search), Resuby (resume), Preppy (interview)

**Issue**: Too many mascots + float animation = chaotic

**Proposed approach**:
1. **Hero**: Jobby as "Inline Hero Companion" — sitting naturally beside the mockup card, breathing animation (not floating). Part of the composition.
2. **How It Works steps**: Keep mascots as small inline step markers (current approach is OK)
3. **Features Bento**: Scrappy embedded inside the job-search card (current approach OK)
4. **Interview Section**: Preppy as "Peeking" from behind the mockup card (partially visible, not full body floating)
5. **Replace float with breathe**: Kill `translateY(-12px)` constant bounce, replace with subtle `scale(1.02)` breathing
6. **Remove ambient glow blobs** — replace with a soft directional shadow or no glow at all

### 6. Additional Issues to Address

**Interview Section layout bug**:
- User reports "Question 3 of 5" section has mascot head not fitting properly
- The Preppy mascot at `absolute -bottom-8 -left-8` may be clipping or overlapping the mockup card content
- Need to verify mascot size/position relative to the interview mockup card
