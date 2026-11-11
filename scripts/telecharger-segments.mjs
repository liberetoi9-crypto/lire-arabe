// Propriétaire : Claude Code. Moments où Husary (mu'allim) dit chaque mot, pris sur quran.com (API v4, récitation 12).
// Servent SEULEMENT à allumer le mot pendant le karaoké : le son et le texte ne sont jamais coupés ni changés.
// Contrôles : même fichier son que l'appli, un moment par mot, positions 1..n dans l'ordre, temps croissants.
// Un verset qui échoue à un contrôle n'est pas gardé (le karaoké allume alors le verset entier).
// Usage : node scripts/telecharger-segments.mjs
import { readFile, writeFile } from 'node:fs/promises';

const SOURATES = [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)]; // Fatiha + Juz Amma (ordre de la séance)
const racine = new URL('../', import.meta.url);
const sortie = { source: 'https://api.quran.com/api/v4/recitations/12/by_chapter/{n}?fields=segments', recitateur: 'husary_muallim', unite: 'ms', sourates: {} };
let gardes = 0; const rejetes = [];

for (const n of SOURATES) {
  const sourate = JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
  const r = await fetch(`https://api.quran.com/api/v4/recitations/12/by_chapter/${n}?fields=segments&per_page=300`);
  if (!r.ok) throw new Error(`quran.com ${n} : ${r.status}`);
  const { audio_files: fichiers } = await r.json();
  const parCle = new Map(fichiers.map((f) => [f.verse_key, f]));
  const s = {};
  for (const v of sourate.versets) {
    const f = parCle.get(v.cle);
    const fichier = `Husary_Muallim_128kbps/${String(n).padStart(3, '0')}${String(v.verset).padStart(3, '0')}.mp3`;
    const segs = f?.segments ?? [];
    const raison =
      !f ? 'absent' :
      !f.url.endsWith(fichier) ? `autre fichier son (${f.url})` :
      segs.length !== v.mots.length ? `${segs.length} moments pour ${v.mots.length} mots` :
      segs.some((x, i) => x.length !== 4 || x[1] !== i + 1 || x[2] >= x[3] || (i && x[2] < segs[i - 1][3])) ? 'moments dans le désordre' : null;
    if (raison) { rejetes.push(`${v.cle} : ${raison}`); continue; }
    s[v.cle] = segs.map((x) => [x[2], x[3]]);
    gardes++;
  }
  sortie.sourates[n] = s;
}
await writeFile(new URL('data/coran/segments-husary-muallim.json', racine), JSON.stringify(sortie));
console.log(`Versets gardés : ${gardes}. Rejetés : ${rejetes.length}`);
for (const x of rejetes) console.log('  ' + x);
