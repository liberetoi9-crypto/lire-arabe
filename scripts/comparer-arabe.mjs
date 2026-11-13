// Propriétaire : Claude Code. Double vérification des phrases d'arabe (méthode validée par Zakou le 11/11) :
// Claude et Codex écrivent chacun l'arabe à partir du français, sans voir l'autre.
// Identiques lettre par lettre ET voyelle par voyelle (seules la ponctuation et les espaces sont ignorés) → la phrase est gardée.
// Différentes → listées dans le rapport, Zakou choisit. Rien n'est inventé ici : le script ne fait que comparer.
// Usage : node scripts/comparer-arabe.mjs <claude.json> <codex.json> <rapport.md>
import { readFile, writeFile } from 'node:fs/promises';

const [fClaude, fCodex, fRapport] = process.argv.slice(2);
if (!fRapport) { console.error('Usage : node scripts/comparer-arabe.mjs <claude.json> <codex.json> <rapport.md>'); process.exit(1); }
const fLecons = new URL('../data/arabe/lecons.json', import.meta.url);
const lecons = JSON.parse(await readFile(fLecons, 'utf8'));
const claude = JSON.parse(await readFile(fClaude, 'utf8'));
const codex = JSON.parse(await readFile(fCodex, 'utf8'));

// Ponctuation (arabe et latine) et espaces ignorés ; tout le reste (lettres, voyelles, shadda, hamza…) doit être identique.
export const normaliser = (t) => t.normalize('NFC').replace(/[؟،؛.,!?;:«»"'()\-]/gu, ' ').replace(/\s+/g, ' ').trim();

let gardees = 0; let total = 0;
const differences = [];
lecons.lecons.forEach((l, i) => l.phrases.forEach((p, k) => {
  total++;
  const a = claude[i]?.[k]; const b = codex[i]?.[k];
  delete p.ar;
  if (typeof a === 'string' && typeof b === 'string' && normaliser(a) === normaliser(b)) { p.ar = a.normalize('NFC'); gardees++; }
  else differences.push({ lecon: i + 1, fr: p.fr, claude: a ?? '(rien)', codex: b ?? '(rien)' });
}));
lecons.verifie = gardees > 0;
await writeFile(fLecons, JSON.stringify(lecons, null, 2) + '\n');
const rapport = [`# Phrases d'arabe : ${gardees} / ${total} identiques (gardées)`, '',
  differences.length ? 'Différentes (Zakou choisit, ou on les laisse de côté) :' : 'Aucune différence.', '',
  ...differences.map((d) => `- Leçon ${d.lecon} · ${d.fr}\n  - Claude : ${d.claude}\n  - Codex : ${d.codex}`)].join('\n');
await writeFile(fRapport, rapport + '\n');
console.log(`${gardees} / ${total} gardées, ${differences.length} différentes → ${fRapport}`);
