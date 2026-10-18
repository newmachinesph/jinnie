# Brand

**Jinnie** — offline-first personal finance.

## The mark

A genie lamp carrying **金** (jīn — gold, wealth). The lamp is the promise; the
character is what it holds.

It is drawn, not typeset. `JIN_PATHS` in `packages/sdk/src/icons` renders 金 as
strokes because the launcher icon is rasterised off-device, where no CJK font
is guaranteed — and a mark that renders differently in two places is not a
mark. The same coordinates drive the in-app component, `assets/logo.svg`, and
`scripts/make-icons.mjs`.

The character is drawn only at 28pt and above. Below that its strokes merge, so
the lamp silhouette carries the mark alone.

## Positioning

> Wealth, in order.

Financial clarity that does not need a signal. The app holds the whole picture —
accounts, bills, budget, debts, remittances — on the device, and shows the one
number that matters at the top of Home.

## Voice

- Formal but plain. Short declarative sentences. No exclamation marks, no slang.
- Money words are precise: "record", "post", "settle", "commitment".
- Never shame the user about debt or spending. Insights reports; it does not judge.
- Say what the product does, not what the user should feel.

## Colour

The palette follows the mark: a deep indigo night for surfaces that hold a
total, and a single lamp-gold accent spent sparingly. Light is the primary
presentation; dark follows the system setting.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#4338CA` | `#A5B4FC` | Actions, links, brand |
| `primaryDeep` | `#312E81` | `#C7D2FE` | Headings, pressed states |
| `accent` | `#A16207` | `#FBBF24` | Lamp gold — highlights and warnings only |
| `night` / `onNight` | `#1E1B4B` / `#FFFFFF` | `#181735` / `#EEF0FF` | Net-worth card, budget plan, splash |
| `ink` / `muted` | `#111827` / `#6B7280` | `#F3F4F6` / `#9AA0AE` | Text |
| `surface` / `card` / `line` | `#F7F7FB` / `#FFFFFF` / `#E4E4ED` | `#0B0B14` / `#15162A` / `#262740` | Backgrounds, borders |
| `positive` / `negative` | `#047857` / `#B91C1C` | `#34D399` / `#F87171` | Money in / money out |

Defined in `packages/sdk/src/theme.ts`. Never hardcode a colour in a mini app —
read it from `useTheme()`, or name a `Tone` and let `toneColors()` resolve it
for the active scheme.

Gold is never a default. It marks the brand surfaces and warnings, and nothing
else. Green and red mean money in and money out — they are never decorative.

## Typography

System font throughout. Headings are bold with tight tracking. Every money
figure carries `tnum` (tabular numerals) so columns of amounts line up.

## Iconography

Custom stroke set in `packages/sdk/src/icons` — 24 grid, 1.75 stroke, round
caps, single colour. The brand mark is the exception: a 100 grid, because it
must stay legible from a 20pt placement to a 1024px launcher icon.

**No emoji anywhere in the product.**

## Radius and depth

Controls and cards use a 4pt radius. The exceptions are deliberate and few: the
net-worth card, the budget plan, the launcher key, and brand tiles. Depth comes
from borders and background contrast, not drop shadows.
