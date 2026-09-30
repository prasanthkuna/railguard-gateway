# @railguard/brand

Single product surface for **railguard-site**, **prebroadcast (operator)**, and **HyperFrames** grant video scenes.

| Export | Use |
|--------|-----|
| `tokens.css` | Marketing + shared color/type tokens |
| `operator-theme.css` | Operator `--rg-*` mapped to marketing dark theme |
| `Logo` | Header / sidebar mark |
| `assets/icon.svg` | Favicon source (copy to each app `app/icon.svg`) |

## HyperFrames

In scene HTML:

```html
<link rel="stylesheet" href="../../../packages/brand/tokens.css" />
```

Use `--bg`, `--mint`, `--font-display` so browser captures match production.
