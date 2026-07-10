---
name: 21st-dev-builder-template-v2
description: Build any site using 21st.dev templates and free components. Replicate premium paid templates (from 21st.dev marketplace) using free shadcn/ui components from the registry plus custom code. Covers analyzing template sections, finding free equivalents, and composing full pages. Use when user wants a template from 21st.dev, wants to build a site "like template X", or wants to use 21st.dev templates without paying. Do NOT use for general 21st.dev component installation (use 21st-dev-builder-v2 for that).
---

# 21st.dev Template Builder v2

Build production-ready websites by replicating premium 21st.dev **templates** using free components plus custom code.

## What are 21st.dev Templates?

21st.dev has TWO different kinds of "templates":

| Type | What it is | Price | URL Pattern | Install Method |
|------|-----------|-------|-------------|----------------|
| **Components** | Individual .tsx files you own | **Free** | `/@{author}/components/{name}` | `npx shadcn add "https://21st.dev/r/{author}/{name}"` |
| **Templates** | Full Next.js projects (entire site) | **Paid** ($29-$49) | `/@{author}/templates/{name}` | Buy → download full project |

**Templates are NOT downloadable via `npx shadcn add`.** They are full project repositories sold through the 21st.dev marketplace by authors like Ruixen UI. A typical template is a complete Next.js 15 app with 10-15 sections + inner pages.

## Core Workflow: "Free Template Builder"

When the user wants a premium template:

```
1. LOOK at template: https://21st.dev/@{author}/templates/{name}
   → Check if FREE or PAID (look for "Buy $XX" button)
   
2. If FREE → clone/setup directly
   
3. If PAID → replicate with free components:
   a. List every section the template has (hero, features, pricing, etc.)
   b. For each section → find free 21st.dev component OR build custom
   c. Create new Next.js project
   d. Install free components
   e. Compose the page
   f. Style to match the template's design language
```

### Section Mapping (Premium Template → Free Components)

| Template Section | Free 21st.dev Category | Typical Count |
|-----------------|----------------------|---------------|
| Hero | `hero` | 73 free components |
| Features / Bento | `features` | 36 free components |
| Testimonials | `testimonials` | 15 free components |
| Pricing | `pricing-section` | 17 free components |
| FAQ | `accordions` | many free |
| CTA | `call-to-action` | 34 free components |
| Footer | `footer` | 14 free components |
| Navigation | `navbar-navigation` | 11 free components |
| Clients / Logo Cloud | `clients` | 16 free components |
| Backgrounds | `background` | 33 free components |
| Announcement bar | `announcement` | 10 free components |
| Text sections | `text` | 58 free components |
| Images | `image` | 26 free components |

### Template Categories (use-case tagged component collections)

**What are these?** Template categories at `/community/templates/s/{slug}` are **use-case filters** — they group free components by what kind of site they're useful for. Browsing `landing-page` shows 87 free components tagged for landing pages.

**Marketing:**

| Template Category | Slug | Free Components |
|---|---|---|
| Landing Page | `landing-page` | 87 |
| Marketing | `marketing` | 48 |
| Portfolio | `portfolio` | 20 |
| Startup | `startup` | 20 |
| Personal Website | `personal-website` | 16 |
| Blog | `blog` | 11 |
| Agency | `agency` | 11 |
| Documentation | `documentation` | 10 |

**Applications:**

| Template Category | Slug | Free Components |
|---|---|---|
| Dashboard | `dashboard` | 78 |
| Admin Panel | `admin-panel` | 68 |
| SaaS | `saas` | 57 |
| Boilerplate | `boilerplate` | 45 |
| AI | `ai` | 38 |
| Developer Tool | `developer-tool` | 34 |
| Ecommerce | `ecommerce` | 12 |
| Analytics | `analytics` | 11 |
| Chat | `chat` | 9 |
| Directory | `directory` | 7 |
| Mobile App | `mobile-app` | 5 |
| Authentication | `authentication` | 4 |
| CMS | `cms` | 4 |
| Finance | `finance` | 4 |
| Social | `social` | 4 |
| Booking | `booking` | 3 |
| Productivity | `productivity` | 3 |
| Real Estate | `real-estate` | 3 |
| Education | `education` | 1 |
| Gaming | `gaming` | 1 |
| Travel | `travel` | 1 |

**Design:**

| Template Category | Slug | Free Components |
|---|---|---|
| Animation | `animation` | 1 |

**Integration:**

| Template Category | Slug | Free Components |
|---|---|---|
| Airtable | `airtable` | 1 |
| Stripe | `stripe` | 1 |
| Supabase | `supabase` | 1 |

## URL Patterns

| Purpose | URL Pattern |
|---------|-------------|
| Template detail | `https://21st.dev/@{author}/templates/{template-name}` |
| Template category browse | `https://21st.dev/community/templates/s/{slug}` |
| All templates | `https://21st.dev/community/templates` |
| Component detail | `https://21st.dev/@{author}/components/{component-name}` |
| Component category browse | `https://21st.dev/community/components/s/{slug}` |
| Component install | `https://21st.dev/r/{author}/{component}` |

## How to Analyze a Premium Template

When replicating a premium template:

1. **Open the template page** and look at its preview (in the iframe)
2. **List every section** from top to bottom (hero, navbar, features, pricing, etc.)
3. **Take a screenshot** of the preview for visual reference
4. **Identify the design language**: colors, border-radius, shadow style, font treatment, spacing
5. **Note interactive elements**: tabs, toggles, accordions, animations
6. **Map each section** to a free component category or write custom

### Design Analysis Checklist
- What color scheme? (dark/light, brand color)
- What border radius? (rounded-sm/md/lg/full, sharp/square)
- Typography style? (sans/serif/mono, letter-spacing)
- Animation style? (framer-motion, scroll-triggered, hover effects)
- Card style? (bordered, shadow, gradient background, glass)
- Background style? (solid, gradient, mesh, grid pattern)

## Component Discovery Strategy

For each section, follow this sequence:

**Step 1: Browse the component category**
```
WebFetch: https://21st.dev/community/components/s/{category-slug}
```
This lists all free components in that category.

**Step 2: Deep-dive on promising components**
```
WebFetch: https://21st.dev/@{author}/components/{component-name}
```
View demo, code, dependencies, and install command.

**Step 3: Extract source code if needed**
```bash
node <skill-dir>/../21st-dev-builder-v2/fetch-component.mjs --download "https://21st.dev/@{author}/components/{component-name}"
```

**Step 4: Install the component**
```bash
npx shadcn@latest add "https://21st.dev/r/{author}/{component-name}"
```

## Build Process

### 1. Project Setup
```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app
npx shadcn@latest init -d
```

### 2. Install Components
Install components section by section. Order matters:
- Base components first (buttons, inputs)
- Then composite components (navbar, footer)
- Then section components (hero, features, pricing)

### 3. Compose the Page
```tsx
// app/page.tsx
<Navbar />
<main>
  <Hero />
  <LogoCloud />
  <Features />
  <Testimonials />
  <Pricing />
  <FAQ />
  <CTA />
</main>
<Footer />
```

### 4. Normalize Layout
- Pick one container width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Check each component's internal container — remove or match yours
- Normalize spacing between sections: `py-16 md:py-20 lg:py-24`
- Alternating backgrounds: `bg-background` / `bg-muted/50`

### 5. Style Matching
Match the premium template's design:
- Update `globals.css` with the brand color
- Set consistent border-radius
- Apply consistent shadows
- Match typography (font families, sizes, weights)
- Adjust hero height: `min-h-[80vh]` (not `min-h-screen`)

### 6. Build Custom Sections
For sections where no free component fits:
- Write custom code matching the template's design language
- Use shadcn base components (Button, Card, Badge, etc.)
- Follow the same spacing and color tokens

## Post-Install Fixes (Common Issues)

After installing 21st.dev components, check for these issues:

**Container width mismatch**: Different components may assume different max-widths. Normalize all to your chosen container.

**`render` prop vs `asChild`**: Some components use `render` prop from `@base-ui/react`. Convert to `asChild` pattern if TypeScript errors.

**Missing CSS variables**: Ensure `globals.css` defines: `--border`, `--ring`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`.

**framer-motion typing**: Fix `ease` arrays with `as const`: `ease: [0.16, 1, 0.3, 1] as const`

**Faint/invisible cards**: Background gradients too subtle. Fix: `rounded-xl border border-border/60 bg-card shadow-sm`

**Marquee fade too aggressive**: Reduce from `w-1/3` to `w-1/6`.

**Gradient with oklch()**: Use `rgba()` instead of `oklch()` in `radial-gradient()`.

**z-index gradient trap**: Don't put gradient divs with `-z-10` behind opaque `bg-background` parents.

## Error Recovery

| Problem | Solution |
|---------|----------|
| Template is paid ($39) | Use the Free Template Builder workflow: analyze → find free components → build |
| No good component match | Build the section custom using shadcn base components |
| Component install fails | Check peer deps, verify URL, try `npm install {dep}` first |
| Source code needed | `node ../21st-dev-builder-v2/fetch-component.mjs --download <url>` |
| Page looks wrong | Check CSS variables, container width, hero height |
| Dark mode broken | Ensure `ThemeProvider` with `next-themes` wraps the app |
