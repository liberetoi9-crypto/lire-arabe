// Propriétaire : Claude Code. Prépare la liste de travail pour traduire en français le sens mot à mot.
// Pour chaque verset : traduction Hamidullah + chaque mot avec son sens anglais (quran.com). Le texte arabe n'est pas changé.
// Usage : node scripts/liste-sens-a-traduire.mjs <fichier-sortie.json> [sourates séparées par des virgules]
import { readFile, writeFile } from 'node:fs/promises';
import { chargerQuranCom } from '../js/coran/traductions.js';

const [sortie, liste] = process.argv.slice(2);
const sourates = liste ? liste.split(',').map(Number) : [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)];
const racine = new URL('../', import.meta.url);
const res = {};
let nb = 0;
for (const n of sourates) {
  const s = JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
  const d = await chargerQuranCom(s);
  for (const v of s.versets) {
    const x = d.get(v.cle);
    res[v.cle] = { hamidullah: x.hamidullah.morceaux.filter((m) => m.texte !== undefined).map((m) => m.texte).join(''), mots: v.mots.map((m, i) => [m.texte, x.sens[i].sens]) };
    nb += v.mots.length;
  }
}
await writeFile(sortie, JSON.stringify(res, null, 0));
console.log(`${Object.keys(res).length} versets, ${nb} mots`);
