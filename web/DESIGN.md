# PollarBridge Portal — DESIGN.md

> AI-readable design system for the PollarBridge web portal (Next.js + Tailwind v4).
> Any agent editing `web/` must follow this file. Inspired by high-quality
> `DESIGN.md` examples (styles.refero.design): tokens first, components second.

## 1. Style thesis

**"Deep-navy ledger under violet neon"** — a dark fintech operations console.
Trust is communicated through mono-spaced references, escrow-amber warnings,
and emerald confirmations. Violet is the brand/action color; emerald means
money moved; amber means a human must act; rose means failure.

- Dark only. No light mode. Background `#080B14`, surfaces `#0D1324`→`#16203E`.
- Dense but breathable: data-dense tables and stat grids (kage.design fintech
  influence) with generous card radii (`rounded-2xl`/`rounded-3xl`).
- All exhibit copy is honest about demo state: `TESTNET DEMO`, `Simulated
  Sandbox Rates`, `BOB payout simulated`.

## 2. Tokens (see `src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--bg-navy-950` | `#080B14` | page background |
| `--bg-navy-900` | `#0D1224` | raised surface |
| `--card-surface` | `#11172C` | default card |
| `--primary-violet` | `#8B5CF6` | primary actions, brand |
| `--success-mint` | `#10B981` | settled / healthy / funded |
| `--warning-amber` | `#F59E0B` | needs operator action |
| `--error-coral` | `#EF4444` | failed / rejected |
| `--text-secondary` | `#94A3B8` | secondary copy |
| `--text-muted` | `#64748B` | captions, labels |

Status → tone mapping (single source: `components/ui/StatusBadge.tsx`):

| Status family | Tone | Example states |
|---|---|---|
| ok | emerald | `COMPLETED`, `PAYMENT_VERIFIED`, `Active`, `Healthy` |
| warn | amber | `PAYMENT_DETECTED`, `IN_REVIEW`, `pending`, `Coming soon` |
| info | violet | quoted / in-flight settlement states |
| bad | rose | `REJECTED`, `FAILED`, `REFUNDED` |
| mute | slate | unknown / disabled |

## 3. Typography

- Sans (default): system stack, `font-feature-settings "cv02","cv03","cv04","cv11"`.
- Mono (`font-mono`): **all** references, amounts, hashes, timestamps, badges,
  step labels. Rule: *if a user would copy-paste it, it is mono.*
- Scale: hero `text-4xl→6xl extrabold tracking-tight`; section `text-2xl→3xl
  bold`; card title `text-sm semibold`; body `text-xs→sm slate-400`; eyebrow
  `text-[11px]/text-xs mono uppercase tracking-wider violet-400`.

## 4. Layout patterns (vibeprompts / kage influence)

- **Search-first hero** (`/track`): centered headline + one command-style input
  (`AgentInput`) + recent-item shortcuts below.
- **Gradient-spotlight hero** (`/`): centered headline, dual CTA, stat strip
  below the fold, estimator card.
- **Bento / 4-up steps** (`/#how-it-works`): numbered tiles, one accent per tile
  (violet → indigo → emerald → amber).
- **Four-metric stat row** (operator): `Stat` cards with CSS sparkline + delta
  line; each card links to its filtered queue.
- **Dense data tables** (operator lists): `DataTable` shell — sticky header,
  mono cells, row hover, horizontal scroll on mobile.
- **Approval cards** (operator queue): one card per actionable payment —
  context left, Approve/Reject right, irreversible-action copy.
- **Checklist timeline** (`/track/[token]`): `Timeline` steps with
  done / current / pending states; never more than 6 steps visible.
- **Streaming status line**: `StreamingText` (typewriter + caret) for live
  verification feed copy. Pure CSS/JS, original implementation.

## 5. Components (all in `src/components/ui/`)

`SectionHeading` · `Stat` · `StatusBadge` · `Timeline` · `StreamingText` ·
`ApprovalCard` · `AgentInput` · `DataTable` · `EmptyState` · `Faq`

Rules:
- Import from `@/components/ui/<Name>`, never copy-paste markup between pages.
- Icons: `lucide-react` only. No emoji in UI (flag glyphs in corridor cards
  are the single exception — they are content, not chrome).
- Interactive elements must have `:focus-visible` rings (see globals).
- Honor `prefers-reduced-motion`: keyframes in globals are gated behind
  `@media (prefers-reduced-motion: no-preference)` equivalents where it matters
  (streaming caret keeps blinking — it is status, not decoration).

## 6. Motion

- `animate-fade-up` on section entry (staggered via inline `animation-delay`).
- `animate-pulse-dot` for live/pending dots; `stream-caret` blink for
  `StreamingText`; `shimmer` for skeleton loaders; `marquee` reserved for
  logo/rail strips.
- Durations ≤ 300ms for hovers (`transition-all`), 500–700ms for entries.
- Never animate layout-affecting properties on tables.

## 7. Accessibility & honesty

- Live regions: status changes use `aria-live="polite"` (`StreamingText`,
  `Timeline` current step).
- Color is never the only signal — every dot has adjacent text.
- Every mock/simulated value is labeled (`simulated`, `sandbox`, `mocked`).
- Error shape in UI mirrors API: human sentence, no stacks, no secrets.

## 8. What NOT to do

- No light surfaces, no pure-black `#000` cards, no gradients on body text
  except the hero brand span.
- No new color hues — stay in violet/indigo/emerald/amber/rose/slate.
- Do not reconstruct third-party Pro components (aicss.dev Pro, 21st paid
  templates). Patterns and concepts only; all code here is original.
- Do not add dependencies for UI — Tailwind + lucide-react only.
