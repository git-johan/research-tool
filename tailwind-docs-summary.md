# Tailwind CSS Complete Documentation Summary

## Table of Contents
1. [Spacing (Padding & Margin)](#spacing)
2. [Layout](#layout)
3. [Flexbox & Grid](#flexbox--grid)
4. [Sizing](#sizing)
5. [Key Concepts](#key-concepts)

---

## Spacing

### The Spacing Scale
- **Base unit**: 1 spacing unit = `0.25rem` = `4px` (default)
- **Formula**: `calc(var(--spacing) * <number>)`
- **Example**: `p-8` = `calc(var(--spacing) * 8)` = `2rem` = `32px`

### Padding Utilities

| Class Pattern | CSS Property | Description |
|--------------|--------------|-------------|
| `p-<number>` | `padding: calc(var(--spacing) * <number>);` | All sides |
| `px-<number>` | `padding-inline: calc(var(--spacing) * <number>);` | Left + Right (horizontal) |
| `py-<number>` | `padding-block: calc(var(--spacing) * <number>);` | Top + Bottom (vertical) |
| `pt-<number>` | `padding-top` | Top only |
| `pr-<number>` | `padding-right` | Right only |
| `pb-<number>` | `padding-bottom` | Bottom only |
| `pl-<number>` | `padding-left` | Left only |
| `ps-<number>` | `padding-inline-start` | Start (respects text direction) |
| `pe-<number>` | `padding-inline-end` | End (respects text direction) |

**Special Values:**
- `p-px` = `padding: 1px;`
- `p-[<value>]` = Arbitrary value (e.g., `p-[17px]`)
- `p-(<custom-prop>)` = CSS variable (e.g., `p-(--my-padding)`)

### Margin Utilities

| Class Pattern | CSS Property | Description |
|--------------|--------------|-------------|
| `m-<number>` | `margin: calc(var(--spacing) * <number>);` | All sides |
| `mx-<number>` | `margin-inline` | Left + Right (horizontal) |
| `my-<number>` | `margin-block` | Top + Bottom (vertical) |
| `mt-<number>` | `margin-top` | Top only |
| `mr-<number>` | `margin-right` | Right only |
| `mb-<number>` | `margin-bottom` | Bottom only |
| `ml-<number>` | `margin-left` | Left only |
| `ms-<number>` | `margin-inline-start` | Start (respects text direction) |
| `me-<number>` | `margin-inline-end` | End (respects text direction) |

**Negative Margins:**
- Prefix with dash: `-mt-8`, `-ml-4`, `-m-2`
- Useful for overlapping elements

**Auto Margins:**
- `m-auto` = `margin: auto;`
- `mx-auto` = `margin-inline: auto;` (center horizontally)
- `my-auto` = `margin-block: auto;` (center vertically)

**Special Values:**
- `m-px` = `margin: 1px;`
- `m-[<value>]` = Arbitrary value
- `m-(<custom-prop>)` = CSS variable

### Space Between Utilities
- `space-x-<number>` = Horizontal gap between children (adds margin-left to all but first)
- `space-y-<number>` = Vertical gap between children (adds margin-top to all but first)

---

## Layout

### Display Utilities

| Class | CSS | Use Case |
|-------|-----|----------|
| `block` | `display: block;` | Block-level element |
| `inline-block` | `display: inline-block;` | Inline with block properties |
| `inline` | `display: inline;` | Inline element |
| `flex` | `display: flex;` | Flexbox container |
| `inline-flex` | `display: inline-flex;` | Inline flexbox |
| `grid` | `display: grid;` | Grid container |
| `inline-grid` | `display: inline-grid;` | Inline grid |
| `contents` | `display: contents;` | Phantom container |
| `flow-root` | `display: flow-root;` | Block formatting context |
| `hidden` | `display: none;` | Hide element |

**Table Display:**
- `table`, `table-row`, `table-cell`, `table-caption`
- `table-column`, `table-column-group`
- `table-header-group`, `table-row-group`, `table-footer-group`

**Screen Reader Utilities:**
- `sr-only` = Visually hidden, accessible to screen readers
- `not-sr-only` = Reverses sr-only

### Position Utilities

| Class | CSS | Behavior |
|-------|-----|----------|
| `static` | `position: static;` | Normal document flow (default) |
| `relative` | `position: relative;` | Positioned relative to normal position |
| `absolute` | `position: absolute;` | Removed from flow, positioned relative to nearest positioned ancestor |
| `fixed` | `position: fixed;` | Positioned relative to viewport |
| `sticky` | `position: sticky;` | Relative until threshold, then fixed |

**Position Offset Utilities:**

| Pattern | Properties |
|---------|-----------|
| `top-<number>`, `right-<number>`, `bottom-<number>`, `left-<number>` | Individual sides |
| `inset-<number>` | All four sides (top, right, bottom, left) |
| `inset-x-<number>` | Left and right |
| `inset-y-<number>` | Top and bottom |

**Examples:**
- `top-0`, `right-0`, `bottom-0`, `left-0`
- `inset-0` = all sides to 0
- `-top-4` = negative offset

### Overflow Utilities

| Class | CSS | Behavior |
|-------|-----|----------|
| `overflow-visible` | `overflow: visible;` | Content not clipped |
| `overflow-hidden` | `overflow: hidden;` | Clips overflow |
| `overflow-auto` | `overflow: auto;` | Scrollbars when needed |
| `overflow-scroll` | `overflow: scroll;` | Always show scrollbars |
| `overflow-x-*` | Horizontal overflow only |
| `overflow-y-*` | Vertical overflow only |

### Z-Index Utilities
- `z-<number>` = Controls stack order
- `z-auto`, `z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`
- `z-[<value>]` = Arbitrary z-index

---

## Flexbox & Grid

### Flex Container Utilities

**Flex Direction:**
- `flex-row` = Row (horizontal, default)
- `flex-row-reverse` = Row reversed
- `flex-col` = Column (vertical)
- `flex-col-reverse` = Column reversed

**Flex Wrap:**
- `flex-wrap` = Wrap to multiple lines
- `flex-nowrap` = Single line (default)
- `flex-wrap-reverse` = Wrap reversed

**Justify Content (main axis):**
- `justify-start`, `justify-end`, `justify-center`
- `justify-between`, `justify-around`, `justify-evenly`
- `justify-stretch`

**Align Items (cross axis):**
- `items-start`, `items-end`, `items-center`
- `items-baseline`, `items-stretch`

**Align Content (multiple lines):**
- `content-start`, `content-end`, `content-center`
- `content-between`, `content-around`, `content-evenly`
- `content-baseline`, `content-stretch`

**Gap:**
- `gap-<number>` = Gap between all items
- `gap-x-<number>` = Horizontal gap
- `gap-y-<number>` = Vertical gap

### Flex Item Utilities

**Flex Grow/Shrink:**
- `flex-<number>` = `flex: <number> 1 0%;` (e.g., `flex-1`)
- `flex-auto` = `flex: 1 1 auto;` (grow and shrink, consider initial size)
- `flex-initial` = `flex: 0 1 auto;` (shrink but not grow)
- `flex-none` = `flex: none;` (no grow or shrink)

**Grow:**
- `grow` = `flex-grow: 1;`
- `grow-0` = `flex-grow: 0;`

**Shrink:**
- `shrink` = `flex-shrink: 1;`
- `shrink-0` = `flex-shrink: 0;`

**Flex Basis:**
- `basis-<number>` = Initial size before distribution

**Align Self:**
- `self-auto`, `self-start`, `self-end`, `self-center`
- `self-stretch`, `self-baseline`

**Order:**
- `order-<number>` = Visual order
- `order-first` = `-9999`
- `order-last` = `9999`
- `order-none` = `0`

### Grid Utilities

**Grid Template Columns:**
- `grid-cols-<number>` = Number of columns (1-12)
- `grid-cols-none` = No columns
- `grid-cols-[<value>]` = Custom template

**Grid Template Rows:**
- `grid-rows-<number>` = Number of rows
- `grid-rows-none` = No rows
- `grid-rows-[<value>]` = Custom template

**Grid Column Span:**
- `col-span-<number>` = Span multiple columns
- `col-start-<number>` = Start at column
- `col-end-<number>` = End at column
- `col-auto` = Auto placement

**Grid Row Span:**
- `row-span-<number>` = Span multiple rows
- `row-start-<number>` = Start at row
- `row-end-<number>` = End at row
- `row-auto` = Auto placement

**Grid Auto Flow:**
- `grid-flow-row`, `grid-flow-col`
- `grid-flow-dense`

---

## Sizing

### Width Utilities

**Spacing-based:**
- `w-<number>` = `calc(var(--spacing) * <number>)`
- Examples: `w-8` (2rem), `w-64` (16rem), `w-96` (24rem)

**Percentage/Fractional:**
- `w-full` = `width: 100%;`
- `w-1/2`, `w-1/3`, `w-2/3`, `w-1/4`, `w-3/4`
- `w-1/5`, `w-2/5`, `w-3/5`, `w-4/5`
- `w-1/6`, `w-5/6`, `w-1/12`, `w-11/12`

**Container Scale (named sizes):**
- `w-xs` (16rem), `w-sm` (20rem), `w-md` (24rem)
- `w-lg` (28rem), `w-xl` (32rem), `w-2xl` (36rem)
- `w-3xl` through `w-7xl`

**Viewport:**
- `w-screen` = `width: 100vw;`
- `w-dvw` = Dynamic viewport width
- `w-lvw` = Large viewport width
- `w-svw` = Small viewport width

**Content-based:**
- `w-auto` = `width: auto;`
- `w-min` = `width: min-content;`
- `w-max` = `width: max-content;`
- `w-fit` = `width: fit-content;`

**Special:**
- `w-px` = `width: 1px;`
- `w-[<value>]` = Arbitrary value

### Height Utilities
Same patterns as width:
- `h-<number>`, `h-full`, `h-screen`, `h-dvh`, `h-lvh`, `h-svh`
- `h-auto`, `h-min`, `h-max`, `h-fit`
- `h-px`, `h-[<value>]`

### Max Width

**Named scales:**
- `max-w-xs`, `max-w-sm`, `max-w-md`, `max-w-lg`
- `max-w-xl`, `max-w-2xl`, `max-w-3xl`, `max-w-4xl`
- `max-w-5xl`, `max-w-6xl`, `max-w-7xl`

**Screen sizes:**
- `max-w-screen-sm`, `max-w-screen-md`, `max-w-screen-lg`
- `max-w-screen-xl`, `max-w-screen-2xl`

**Content:**
- `max-w-none`, `max-w-full`
- `max-w-min`, `max-w-max`, `max-w-fit`
- `max-w-prose` = Optimal reading width

**Arbitrary:**
- `max-w-[<value>]` (e.g., `max-w-[680px]`)

### Max Height
Same patterns:
- `max-h-<number>`, `max-h-full`, `max-h-screen`
- `max-h-none`, `max-h-min`, `max-h-max`, `max-h-fit`

### Min Width/Height
- `min-w-<number>`, `min-w-full`, `min-w-min`, `min-w-max`, `min-w-fit`
- `min-h-<number>`, `min-h-full`, `min-h-screen`, `min-h-min`, `min-h-max`, `min-h-fit`

### Size Utilities (Width + Height)
Sets both dimensions simultaneously:
- `size-<number>` = Sets both `width` and `height`
- `size-full`, `size-auto`, `size-px`
- `size-[<value>]`

---

## Key Concepts

### The --spacing Variable
- Default: `--spacing: 0.25rem;` (4px)
- All spacing utilities derive from this
- Can be customized in theme configuration
- Affects: padding, margin, width, height, gap, inset, space, translate, scroll-margin, scroll-padding

### Responsive Design

**Breakpoints (mobile-first):**
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

**Usage:**
- Unprefixed = all sizes
- `md:flex` = flex at md breakpoint and above
- `md:w-1/2 lg:w-1/3` = responsive width

**Examples:**
```html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- Full width on mobile, half on md, third on lg -->
</div>

<div class="px-4 md:px-8 lg:px-16">
  <!-- Responsive padding -->
</div>
```

### Arbitrary Values
Use square brackets for custom values:
```html
<div class="w-[680px]">           <!-- Custom width -->
<div class="p-[17px]">            <!-- Custom padding -->
<div class="top-[117px]">         <!-- Custom position -->
<div class="grid-cols-[1fr_500px_2fr]">  <!-- Custom grid -->
```

### CSS Custom Properties
Use parentheses to reference CSS variables:
```html
<div class="w-(--my-width)">      <!-- var(--my-width) -->
<div class="p-(--spacing)">       <!-- var(--spacing) -->
```

### Important Patterns

**Centering with Flexbox:**
```html
<div class="flex items-center justify-center">
  <!-- Centered content -->
</div>
```

**Centering with Margin:**
```html
<div class="mx-auto max-w-[680px]">
  <!-- Centered container with max width -->
</div>
```

**Full Viewport Height:**
```html
<div class="h-screen">
  <!-- 100vh height -->
</div>
```

**Sticky Footer:**
```html
<div class="flex flex-col h-screen">
  <main class="flex-1">Content</main>
  <footer>Footer</footer>
</div>
```

---

## Common Mistakes & Solutions

### ❌ Wrong: `px-8` on parent without content constraint
```html
<div class="px-8">
  <div class="max-w-[680px]">
    <!-- Content flush left, not centered -->
  </div>
</div>
```

### ✅ Correct: Center with mx-auto or parent flex
```html
<!-- Option 1: Auto margins -->
<div class="px-8">
  <div class="max-w-[680px] mx-auto">
    <!-- Centered content -->
  </div>
</div>

<!-- Option 2: Flex parent -->
<div class="flex flex-col items-center">
  <div class="w-full max-w-[680px] px-8">
    <!-- Centered with padding -->
  </div>
</div>
```

### ❌ Wrong: Conflicting utilities
```html
<div class="p-8 px-4">
  <!-- px-4 overwrites horizontal padding from p-8 -->
</div>
```

### ✅ Correct: Use specific utilities
```html
<div class="py-8 px-4">
  <!-- Explicit vertical and horizontal -->
</div>
```

---

## Quick Reference

### Common Spacing Values
| Class | Value | Pixels |
|-------|-------|--------|
| `p-0` | 0 | 0px |
| `p-1` | 0.25rem | 4px |
| `p-2` | 0.5rem | 8px |
| `p-4` | 1rem | 16px |
| `p-6` | 1.5rem | 24px |
| `p-8` | 2rem | 32px |
| `p-12` | 3rem | 48px |
| `p-16` | 4rem | 64px |
| `p-24` | 6rem | 96px |
| `p-32` | 8rem | 128px |

### Layout Patterns

**Full bleed container:**
```html
<div class="w-full h-screen">
```

**Constrained content area:**
```html
<div class="max-w-[680px] mx-auto px-8">
```

**Responsive grid:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Flexbox row with gap:**
```html
<div class="flex gap-4">
```

**Vertical stack:**
```html
<div class="flex flex-col gap-6">
```

---

**Source:** Official Tailwind CSS Documentation (2025)
**Last Updated:** January 2025
