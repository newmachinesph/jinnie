// Turn optimized svg/*.min.svg into ../../src/logos.ts: one string
// per provider id, with the Commons source and licence recorded per entry.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';

const dir = new URL('./svg/', import.meta.url);
const report = JSON.parse(readFileSync(new URL('./logo-report.json', import.meta.url)));
const UNSUPPORTED = ['<text', '<image', '<style', '<filter', '<foreignObject', '<pattern', '<switch', 'data:image'];

const entries = [];
for (const file of readdirSync(dir).filter(f => f.endsWith('.min.svg')).sort()) {
  const id = file.replace(/\.min\.svg$/, '');
  let svg = readFileSync(new URL(file, dir), 'utf8').trim();
  // A <style> block that only restates fills already inlined on the elements
  // is dead weight; a class with no inline style would lose its fill.
  if (svg.includes('<style')) {
    const stripped = svg.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/ class="[^"]*"/g, '');
    const orphan = [...svg.matchAll(/<(\w+)[^>]*class="[^"]*"[^>]*>/g)].some(m => !/style="[^"]*fill/.test(m[0]) && !/ fill="/.test(m[0]));
    if (orphan) { console.error(`skip ${id}: class-driven styles`); continue; }
    svg = stripped;
  }
  // No text is rendered, and quoted font names (&quot;…&quot;) trip the
  // renderer's attribute tokenizer.
  svg = svg.replace(/ font-(family|weight|size|style|stretch|variant)="[^"]*"/g, '');
  // Typography-only style attributes (Inkscape leftovers) carry nothing the
  // renderer draws; keep a style only if it sets a fill, stroke, or opacity.
  svg = svg.replace(/ style="([^"]*)"/g, (m, css) => (/(^|;)s*(fill|stroke|opacity|fill-opacity|stroke-opacity)s*:/.test(css) ? m : ''));
  svg = svg.replace(/ (letter|word)-spacing="[^"]*"/g, '').replace(/ line-height="[^"]*"/g, '');
  if (svg.includes('&quot;')) { console.error(`skip ${id}: unhandled &quot;`); continue; }
  const bad = UNSUPPORTED.filter(f => svg.includes(f));
  if (bad.length) { console.error(`skip ${id}: ${bad.join(', ')}`); continue; }
  if (!/viewBox="/.test(svg)) {
    // No viewBox: derive one from the intrinsic size so the mark scales.
    const w = svg.match(/<svg[^>]*\swidth="([\d.]+)/)?.[1];
    const h = svg.match(/<svg[^>]*\sheight="([\d.]+)/)?.[1];
    if (!w || !h) { console.error(`skip ${id}: no viewBox or size`); continue; }
    svg = svg.replace(/<svg\b/, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  // The renderer sizes by props; intrinsic width/height would fight it.
  svg = svg.replace(/^(<svg\b[^>]*?)\s(width|height)="[^"]*"/g, '$1').replace(/^(<svg\b[^>]*?)\s(width|height)="[^"]*"/g, '$1');
  const meta = report[id] ?? {};
  entries.push({id, svg, title: meta.title ?? '?', license: meta.license ?? '?'});
}

const lines = [
  '/*',
  ' * Institution and biller logos, bundled as SVG markup and drawn with',
  ' * react-native-svg. Every file is from Wikimedia Commons; the source file',
  ' * and its licence are recorded beside each entry. Marks are used only to',
  ' * identify the institution the user selected.',
  ' *',
  ' * Regenerate with the logo pipeline rather than editing by hand.',
  ' */',
  '',
  '/** Provider or biller id → SVG markup. Absent ids fall back to the monogram. */',
  'export const logos: Record<string, string> = {',
];
for (const e of entries) {
  lines.push(`  // ${e.title.replace(/^File:/, '')} — ${e.license}`);
  lines.push(`  '${e.id}': ${JSON.stringify(e.svg)},`);
}
lines.push('};', '');
writeFileSync(new URL('../../src/logos.ts', import.meta.url), lines.join('\n'));
const total = entries.reduce((n, e) => n + e.svg.length, 0);
console.error(`${entries.length} logos, ${(total / 1024).toFixed(1)} KB`);
