// Fetch curated Commons SVG logos, record their licences, and flag features
// react-native-svg cannot render. Input: logo-picks.json {id: "File:..."}.
// Output: svg/<id>.svg + logo-report.json
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const API = 'https://commons.wikimedia.org/w/api.php';
const headers = {'User-Agent': 'jinnie-logo-fetch/1.0 (personal finance app)'};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const picks = JSON.parse(readFileSync(new URL('./logo-picks.json', import.meta.url)));
mkdirSync(new URL('./svg/', import.meta.url), {recursive: true});

const UNSUPPORTED = ['<text', '<image', '<style', '<filter', '<foreignObject', '<pattern', '<switch', 'data:image'];
let report = {};
try { report = JSON.parse(readFileSync(new URL('./logo-report.json', import.meta.url))); } catch {}

// Commons rate-limits bursts; back off and retry rather than fail the brand.
async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const text = await fetch(url, {headers}).then(r => r.text());
    try { return JSON.parse(text); } catch { await sleep(10000 * (attempt + 1)); }
  }
  throw new Error('rate-limited');
}

for (const [id, title] of Object.entries(picks)) {
  // Keep only entries whose saved file really is an SVG (an earlier run saved
  // rate-limit HTML pages under a few ids).
  if (report[id] && !report[id].error) {
    try {
      if (readFileSync(new URL(`./svg/${id}.svg`, import.meta.url), 'utf8').includes('<svg')) continue;
    } catch {}
  }
  try {
    const info = await getJson(
      `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo|categories&cllimit=20&iiprop=url|size|extmetadata&format=json`,
    );
    const page = Object.values(info.query.pages)[0];
    const ii = page?.imageinfo?.[0];
    if (!ii) throw new Error('no imageinfo');
    const meta = ii.extmetadata ?? {};
    // Categories disambiguate same-named brands (BPI France vs BPI Philippines).
    const categories = (page.categories ?? []).map(c => c.title.replace(/^Category:/, ''));
    let svg = '';
    for (let attempt = 0; attempt < 4 && !svg.includes('<svg'); attempt++) {
      if (attempt) await sleep(10000 * attempt);
      svg = await fetch(ii.url, {headers}).then(r => r.text());
    }
    if (!svg.includes('<svg')) throw new Error('rate-limited (file)');
    const flags = UNSUPPORTED.filter(f => svg.includes(f));
    writeFileSync(new URL(`./svg/${id}.svg`, import.meta.url), svg);
    report[id] = {
      title,
      url: ii.url,
      bytes: svg.length,
      width: ii.width,
      height: ii.height,
      license: meta.LicenseShortName?.value ?? '?',
      attribution: (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 80),
      categories,
      flags,
    };
    console.error(`${id}: ${svg.length}B ${report[id].license}${flags.length ? ' FLAGS ' + flags.join(',') : ''}`);
  } catch (error) {
    report[id] = {title, error: String(error)};
    console.error(`${id}: ERROR ${error}`);
  }
  await sleep(3000);
}
writeFileSync(new URL('./logo-report.json', import.meta.url), JSON.stringify(report, null, 2));
