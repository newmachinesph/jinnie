# Component library

Everything in `packages/sdk/src/ui`, exported from `@jinnie/sdk`. Plain
StyleSheet on top of the tokens in `theme.ts` — no UI framework, and nothing a
mini app needs to restyle.

## Tokens

```ts
import {useTheme, useIsDark, space, radius, tnum, toneColors, withAlpha} from '@jinnie/sdk';

const t = useTheme();          // the active palette
<Text style={{color: t.ink}}/>
<Text style={[tnum, {color: t.ink}]}>{peso(1234)}</Text>   // tabular numerals
```

`space`: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`.
`radius`: `control 4 · card 4 · brand 14 · pill 999`.

`toneColors(tone, isDark)` turns a named `Tone` (`indigo`, `gold`, `emerald`,
`blue`, `sky`, `violet`, `amber`, `rose`, `slate`) into `{fg, bg}` for the
active scheme. Use it instead of writing a colour.

## Layout

| Component | Purpose |
|---|---|
| `Stack` | Vertical rhythm. Replaces the web build's `space-y-*`. `gap` defaults to 16 |
| `Row` | Horizontal group with even columns and a gap |
| `Card` | Bordered surface. `padded={false}` for edge-to-edge lists |
| `CardTitle` | Section title inside a card |
| `SectionHeader` | `title` + optional `description` and `action` |
| `AppBar` | `leading` / `title` / `subtitle` / `trailing`. The host renders this |

## Content

| Component | Purpose |
|---|---|
| `Body`, `Muted` | Themed text at the two standard sizes |
| `Stat` | Labelled figure in a card. Privacy-aware, tabular |
| `Badge` | `neutral` · `positive` · `negative` · `warning` · `accent` |
| `Progress` | 0–100, clamped. Optional `color` and `trackColor` |
| `InlineAlert` | `info` · `success` · `warning` · `danger`, with optional `action` |
| `EmptyState` | Icon, title, one sentence. Every list needs one |
| `Skeleton` | Loading placeholder |

## Controls

| Component | Purpose |
|---|---|
| `Button` | `primary` · `secondary` · `ghost` · `danger`, optional `icon` |
| `IconButton` | 44pt icon-only action. `label` is required |
| `PressableCard` | A card that is the tap target. Every list row |
| `Input` | Themed `TextInput`. `money` gives a decimal keypad and right alignment |
| `Textarea` | Multi-line `Input` |
| `Label` | Field label |
| `Switch` | Labelled boolean with an optional description |
| `Segmented` | 2–3 mutually exclusive options |
| `SearchInput` | Search field with a clear button |
| `Select` | See below |

### `Select`

There is no native `<select>` here, and a picker wheel hides long lists behind
scrolling. So a Select is a field that opens the standard sheet, with search
once the list passes twelve options, and grouping via `option.group`.

```tsx
<Select
  label="Type"
  value={typeFilter}
  onChange={setTypeFilter}
  options={[
    {value: 'all', label: 'All types'},
    {value: 'expense', label: 'Expenses'},
  ]}
/>
```

## Overlays

| Component | Purpose |
|---|---|
| `Sheet` | Bottom sheet. Handles the scrim, keyboard, and safe area |
| `Dialog` | Centred modal |
| `ConfirmDialog` | Cancel / confirm. `tone="danger"` by default |
| `ActionSheet` | A row's actions, each with a label, description, icon, and tone |

Every form and picker opens in a `Sheet`, so keyboard avoidance and the bottom
inset are solved in exactly one place.

## Catalog pickers

`ProviderPicker` · `AccountTypePicker` · `CurrencyPicker` · `CategorySelect` ·
`BillerPicker` · `BillerCategoryPicker` · `AccountPicker` · `ProviderMark`.

All are `Select`s backed by the public catalogs. `ProviderMark` draws the
two-character monogram for an institution or biller, so a row never renders a
hole.

## Privacy

| Component | Purpose |
|---|---|
| `PrivateValue` | Wraps a figure. Renders `••••` when values are hidden |
| `PrivateText` | Inline variant, for use inside a surrounding `<Text>` run |
| `PrivacyToggle` | The eye control. The host puts one in every app bar |

Wrap **every** money figure in `PrivateValue`. When privacy is on, the screen
reader is told only that a value is hidden — never the amount.

## Accessibility

The components carry the roles and states; do not hand-roll around them.

- 44pt minimum on every tap target — `Button`, `IconButton`, `PressableCard`,
  `Switch`, and `Select` all enforce it.
- `IconButton` and `PressableCard` require a `label`.
- `Segmented` is a `radiogroup`; `Switch` is a `switch`; `Progress` reports its
  value.
- Both colour schemes are defined explicitly. Nothing relies on a default.
