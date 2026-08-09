# Example: Story Status Chip

A focused example showing the chip + data attribute + Stylus pattern.

## Before

```html
<v-chip
  :color="status_colors[item.status]"
  class="text-uppercase"
  size="small"
  @click="story_detail(item)">
  {{ item.status }}
</v-chip>
```

## After

```html
<span
  :data-status="item.status"
  @click="story_detail(item)">
  {{ item.status }}
</span>
```

## Stylus

```stylus
span[data-status] {
  text-transform: uppercase;
  font-size: calc(base-line * 0.65);
  padding: calc(base-line * 0.15) calc(base-line * 0.4);
  border-radius: calc(base-line * 0.75);
  cursor: pointer;
  font-weight: 500;
}

span[data-status="pending"] { background-color: var(--color-warning); color: var(--text); }
span[data-status="submitted"] { background-color: var(--color-primary); color: white; }
span[data-status="approved"] { background-color: var(--color-success); color: white; }
span[data-status="rejected"] { background-color: var(--color-error); color: white; }
span[data-status="flagged"] { background-color: var(--color-secondary); color: white; }
```

## What changed

- `v-chip` -> `<span>` - no wrapper component needed
- `:color` prop removed - color is driven by `data-status` attribute via CSS
- `class="text-uppercase"` removed - expressed in Stylus on the element selector
- `size="small"` removed - size expressed via font-size in Stylus
- All visual styling moves to Stylus, zero classes on the element
