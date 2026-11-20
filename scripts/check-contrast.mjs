// WCAG AA contrast check for the design tokens in src/styles/index.css.
// Parses only `--name: #RRGGBB;` declarations inside :root (color-mix tokens are skipped).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const cssPath = fileURLToPath(new URL('../src/styles/index.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

const tokens = {}
for (const m of rootBlock.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  tokens[m[1]] = m[2]
}

const MIN = 4.5
// [foreground, background]; '#FFFFFF' is a literal, anything else is a token name.
const pairs = [
  ['#FFFFFF', 'belly'],
  ['belly', 'stone-page'],
  ['ink-2', 'stone-page'],
  ['ink-3', 'stone-page'],
  ['ink-3', 'stone-raised'],
  ['ink-3', 'stone-card'],
  ['olive', 'stone-page'],
  ['stone-page', 'haze-5'],
  ['belly-ink', 'stone-page'],
  ['belly-ink', 'stone-raised'],
  ['#FFFFFF', 'negative'],
  ['negative', 'stone-page'],
  ['haze-5', 'fit-wash'],
  ['dorsal-band', 'recommended-wash'],
]

const resolve = (ref) => (ref.startsWith('#') ? ref : tokens[ref])

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

let failed = false
for (const [fg, bg] of pairs) {
  const f = resolve(fg)
  const b = resolve(bg)
  const missing = [f ? null : fg, b ? null : bg].filter(Boolean)
  if (missing.length) {
    console.log(`MISSING  ${fg} / ${bg}  (no token: ${missing.join(', ')})`)
    failed = true
    continue
  }
  const r = ratio(f, b)
  const ok = r >= MIN
  if (!ok) failed = true
  console.log(`${ok ? 'ok     ' : 'FAIL   '}  ${fg} / ${bg}  ${r.toFixed(2)}`)
}
process.exit(failed ? 1 : 0)
