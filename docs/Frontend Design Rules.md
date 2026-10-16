# 17 - Frontend Design Rules (HIGHEST PRIORITY)

## 0. Status of this file
This is the highest-priority rule for the entire frontend. It overrides docs/09, every library default, every
habit, and every idea for "improving" the look. If this file conflicts with any other document, this file wins;
list each conflict in your report. When unsure, choose the plainer option.

## 1. Goal
The site must look like an internal product from a large, established enterprise software company: quiet, dense,
neutral, predictable, built for people who use it all day. Take inspiration from the general design principles of
enterprise systems (IBM Carbon, Microsoft Fluent / Azure portal, SAP Fiori, Salesforce Lightning, Atlassian).
Take principles only. Never copy any company's logo, name, wordmark, icons or other proprietary assets, and never
imitate one product's branding.

Test: a screenshot should look like it belongs in a procurement or quality-management suite, not a startup landing
page or a template gallery.

## 2. Absolute bans (zero tolerance, every screen, start to end)

### Visual effects
- Gradients of any kind (backgrounds, buttons, text, borders, chart fills)
- Glassmorphism, blur, frosted panels, glow, neon, coloured shadows
- Drop shadows of any kind (separate surfaces with 1px borders instead)
- Purple, violet, indigo-to-pink palettes
- Dark mode and theme toggles
- Large radii or pill shapes (maximum radius: 2px; most surfaces 0)
- Decorative backgrounds: grids, dots, noise, mesh, blobs, orbs, particles
- Illustrations, 3D, stock photos, mascots, hero sections, marketing panels, onboarding carousels
- Emojis anywhere in the UI

### The "AI look"
- Sparkle, star, magic-wand, robot, brain or chat-bubble icons
- Labels such as "AI", "AI-powered", "smart", "magic", "assistant", "copilot"
- "Generating..." or "thinking" indicators, typewriter or streaming text
- The word "AI" must not appear anywhere in the product UI (the long project title belongs only in README and the submission)

### Motion
NO animation or transition of any kind:
- No CSS transitions or keyframes; no hover lift, scale or colour fades
- No fade or slide on modals, menus, dropdowns, toasts, tabs or accordions
- No page transitions, skeleton shimmer, spinners, count-up numbers, animated charts or gauges
- No smooth scrolling, parallax or scroll effects
- State changes are instant. Loading is shown with static text ("Loading...") and static grey placeholder blocks.
- Banned libraries: framer-motion, motion, react-spring, gsap, lottie, aos, three, tsparticles, animejs,
  auto-animate, react-transition-group, tailwindcss-animate, tw-animate-css

### Fonts
- Banned: Inter, Space Grotesk, Poppins, Sora, Outfit, DM Sans, Manrope, Plus Jakarta Sans, Geist, Montserrat,
  Lexend, Syne, and any display, decorative or handwriting font
- No gradient text, no letter-spacing tricks
- No external font CDNs or any external asset requests (the CSP is default-src 'self'; fonts are self-hosted)

## 3. Typography
- UI font: IBM Plex Sans. Mono font: IBM Plex Mono (IDs, recall numbers, codes).
- Self-hosted via npm: `@fontsource/ibm-plex-sans` (weights 400 and 600) and `@fontsource/ibm-plex-mono` (400).
- Fallback stack: "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif
- Only weights 400 and 600.

| Use | Size / line height | Weight |
|---|---|---|
| Body, table text, inputs | 14 / 20 | 400 |
| Caption, helper text, tags | 12 / 16 | 400 |
| Section title | 16 / 24 | 600 |
| Page title | 20 / 28 | 600 |
| KPI number | 28 / 36 | 600 |

- Sentence case everywhere ("Add vendor", "Official", "Unverified"). No all-caps styling.
- Numbers use `font-variant-numeric: tabular-nums` and are right-aligned in tables.

## 4. Colour tokens (define as CSS variables; use only these)
| Token | Value | Use |
|---|---|---|
| --bg-page | #F4F4F4 | Page background |
| --bg-surface | #FFFFFF | Panels, tables, inputs |
| --bg-hover | #E8E8E8 | Row/item hover and selected nav item |
| --bg-header | #161616 | Top bar (text #FFFFFF) |
| --border | #E0E0E0 | Dividers, table lines, surface borders |
| --border-input | #8D8D8D | Input borders |
| --text-primary | #161616 | Main text |
| --text-secondary | #525252 | Labels, captions |
| --accent | #0F62FE | Primary button, links, focus |
| --accent-hover | #0050E6 | Primary hover (instant change) |
| --danger | #DA1E28 | Destructive button, errors |

Risk level tags (text on tint; always with label AND icon):
| Level | Text | Background |
|---|---|---|
| Low | #0E6027 | #DEFBE6 |
| Medium | #684E00 | #FCF4D6 |
| High | #8A3800 | #FFD9BE |
| Critical | #A2191F | #FFD7D9 |

Chart fills (flat, solid): Low #24A148, Medium #F1C21B, High #FF832B, Critical #DA1E28, single series #0F62FE.
Banner backgrounds: info #EDF5FF, warning #FCF4D6, error #FFF1F1, success #DEFBE6, each with a 1px border in its own colour.
Verify every text/background pair at 4.5:1 or better with a contrast checker; adjust a value if it fails and report it.

## 5. Layout, spacing and components
Spacing scale: 4, 8, 12, 16, 24, 32, 48 px only.

**Shell**
- Top header 48px, fixed: product name as plain text on the left (no logo graphic, no icon); signed-in email and "Sign out" on the right.
- Left navigation 240px, fixed, white, 1px right border. Items 40px tall. The active item has a 3px left accent border and --bg-hover.
- Content area padding 24px, max width 1280px.
- Page header: title (20/28), one line of secondary description, primary action right-aligned.

**Surfaces:** white, 1px border, radius 0, no shadow. Do not nest more than two levels.

**Buttons:** 40px high, radius 0. Primary (accent fill, white text), secondary (white, accent text and border), danger (red fill), ghost (text only).
Hover is an instant background change. Disabled: grey fill, grey text, cursor not-allowed. Labels are verb + object ("Confirm match").

**Inputs:** 40px high, 1px border, label above (12px secondary), helper or error text below. Focus uses outline only.

**Tables:** 40px rows, header row #E0E0E0 with weight 600, hover --bg-hover, 1px bottom borders, no zebra stripes.
Toolbar above (search left, filters, actions right). Pagination below ("1-25 of 312", page-size select, previous/next).
Sortable headers use a simple static chevron.

**Tags:** 24px high, 2px radius, icon + label. Risk icons are distinct simple shapes (circle, diamond, triangle, octagon).
"Official" tag: neutral grey with a check icon. "Unverified" tag: outlined with a caution icon.

**Modals:** centred, white, 1px border, solid overlay rgba(22,22,22,0.5), appear instantly, Esc closes, focus is trapped. Footer buttons right-aligned.

**Feedback:** inline banners at the top of the content area, dismissible, instant. No toasts that slide or fade.

**Empty states:** a title, one sentence, and one action button. No illustrations or icons.
**Error states:** an error banner with a "Retry" button.
**Loading:** the text "Loading..." plus static grey blocks (#E0E0E0), with no shimmer.

**Focus:** `:focus-visible { outline: 2px solid #0F62FE; outline-offset: 2px; }`

## 6. Data visualisation
- Recharts with `isAnimationActive={false}` on EVERY series element (Line, Bar, Area, Pie, Scatter, etc.).
- Flat solid fills only: no gradients, no rounded bars, no glow, no shadows. Horizontal gridlines only in #E0E0E0. Axis labels at 12px.
- Tooltips: white box, 1px border, plain text, no shadow.
- Every chart has a title and a "View as table" toggle that swaps instantly.
- **Risk score display: not a radial gauge.** Show the number large (for example "79.8") above a horizontal bar from 0 to 100
  split into four flat bands (Low, Medium, High, Critical) labelled at the cutoffs 25, 50 and 75, with a static marker line at the score.
- Score history: line chart with points; a vertical dashed line labelled "Rules version N" where the config version changed.
- Level distribution: horizontal stacked bar with a legend showing labels and counts. No donut or pie charts.
- Dashboard KPIs: a row of four flat tiles (12px secondary label, 28px number, optional one-line caption). No icons, trend arrows or sparklines.

## 7. Content and tone
- Neutral and factual. No exclamation marks, emojis, slang, first person, marketing copy or taglines.
- Dates: 16 Oct 2025 (DD MMM YYYY). Numbers with thousands separators. Scores to one decimal. Empty values show an em dash.
- Recall dates are labelled "Initiated" and "FDA reported". The raw openFDA status is never shown as current.
- Vendor detail shows a neutral banner: "News monitoring is not enabled in this version."
- Login page: grey page background, one centred white panel 400px wide with the product name, "Sign in", email, password, button. Nothing else.

## 8. Accessibility (still required)
Fully keyboard operable, visible focus, AA contrast, semantic landmarks, proper table markup, labels bound to inputs,
risk never conveyed by colour alone.

## 9. Enforcement (mandatory)

### 9.1 Global override
Create `apps/web/src/styles/no-effects.css`, import it FIRST in `main.tsx`:
```css
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
  box-shadow: none !important;
  text-shadow: none !important;
  backdrop-filter: none !important;
}
```

### 9.2 Automated check
Create `scripts/design-check.mjs`, add `"design:check": "node scripts/design-check.mjs"` to the root package.json,
run it in CI and before every report:
```js
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOTS = ['apps/web/src', 'apps/web/index.html'];
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const SKIP_FILES = new Set(['no-effects.css']);

const RULES = [
  ['motion', /\banimate-|@keyframes|\banimation\s*:|\btransition(-|\s*:)|\bduration-\d|\bease-(in|out|linear)/],
  ['gradient', /gradient|bg-clip-text/],
  ['blur or glass', /backdrop-|\bblur-|blur\(/],
  ['shadow', /shadow/],
  ['radius', /\brounded(-(md|lg|xl|2xl|3xl|full))?(?=[\s"'`])|border-radius\s*:\s*(?!0|1px|2px)[\d.]+/],
  ['font', /\bInter\b|Space Grotesk|Poppins|\bSora\b|Outfit|DM Sans|Manrope|Jakarta|Geist|Montserrat|Lexend|\bSyne\b|fonts\.googleapis|fonts\.gstatic/],
  ['ai look', /sparkle|Sparkle|\bWand|wand-|[Rr]obot|\bBot\b|\bBrain\b|[Cc]opilot|[Mm]agic|Generating|\bAI\b/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['dark mode', /\bdark:|prefers-color-scheme/],
];

const BAD_DEPS = /^(framer-motion|motion|react-spring|@react-spring\/.*|gsap|lottie-.*|@lottiefiles\/.*|aos|three|@react-three\/.*|tsparticles|react-tsparticles|@tsparticles\/.*|animejs|@formkit\/auto-animate|react-transition-group|tailwindcss-animate|tw-animate-css)$/;
const ALLOWED_FONTS = new Set(['@fontsource/ibm-plex-sans', '@fontsource/ibm-plex-mono']);

let problems = 0;
const report = (file, line, rule, text) => {
  problems++;
  console.log(`${file}:${line} [${rule}] ${String(text).trim().slice(0, 120)}`);
};

function* walk(p) {
  if (!existsSync(p)) return;
  if (statSync(p).isFile()) { yield p; return; }
  for (const f of readdirSync(p)) yield* walk(join(p, f));
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!EXT.has(extname(file)) || SKIP_FILES.has(basename(file))) continue;
    if (/\.test\.|__tests__|fixtures/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((text, i) => {
      for (const [rule, re] of RULES) if (re.test(text)) report(file, i + 1, rule, text);
    });
    if (/from ['"]recharts['"]/.test(src)) {
      const els = (src.match(/<(Line|Bar|Area|Pie|Scatter|Radar|RadialBar|Treemap|Funnel|Sankey)\b/g) || []).length;
      const off = (src.match(/isAnimationActive=\{false\}/g) || []).length;
      if (off < els) report(file, 0, 'chart animation', `${els} chart elements, only ${off} with isAnimationActive={false}`);
    }
  }
}

const pkg = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (BAD_DEPS.test(name) || (name.startsWith('@fontsource') && !ALLOWED_FONTS.has(name))) {
    report('apps/web/package.json', 0, 'banned dependency', name);
  }
}

if (problems) {
  console.log(`\n${problems} design violation(s). Fix them before reporting.`);
  process.exit(1);
}
console.log('Design check passed.');
```

## 10. Process rules for the agent
1. Re-read this file before every batch of UI work.
2. Every report ends with a "Design compliance" section: the raw output of `npm run design:check` plus the checklist in section 11.
3. Library defaults that add effects must be overridden and checked in the browser (chart animation, modal and menu fades,
   toast slides, tooltip transitions, hover transitions, focus glows).
4. Add no visual polish beyond this spec. If a screen looks too plain, that is correct.
5. If something is not specified here, use the plainest, most conventional enterprise pattern, and note the choice in the report. Do not invent styling.
6. Overrides of docs/09 (Inter font, radial gauge, toasts, shadows on cards): this file wins. List them in the report.

## 11. Acceptance checklist (per page, answer yes or no with evidence)
- [ ] No gradients, shadows, blur, glow, or radius above 2px
- [ ] Zero motion: hover, click, open/close, loading, charts
- [ ] Only IBM Plex Sans and Plex Mono, self-hosted; the Network tab shows no external requests
- [ ] No "AI" wording or icons, no emojis
- [ ] Grayscale screenshot looks like an enterprise admin console
- [ ] Spacing uses only the scale; numbers right-aligned with tabular figures
- [ ] Keyboard-only walkthrough works; focus is always visible
- [ ] Every risk level shows a label and an icon
- [ ] `npm run design:check` passes (raw output pasted)