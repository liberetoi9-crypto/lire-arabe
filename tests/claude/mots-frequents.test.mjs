// Propriétaire : Claude Code (C5). Petits mots fréquents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REGLE, squelette, compterMots, choisirPetitsMots } from '../../js/coran/frequents.js';

const dossier = new URL('../../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));
const frequents = JSON.parse(await readFile(new URL('frequents.json', dossier), 'utf8'));
const versets = [];
for (const s of manifeste.sourates) versets.push(...JSON.parse(await readFile(new URL(s.fichier, dossier), 'utf8')).versets);

test('la liste est bien COMPTÉE dans le texte officiel (on refait le calcul, même résultat)', () => {
  const recompte = choisirPetitsMots(compterMots(versets));
  assert.deepEqual(frequents.mots, recompte);
  assert.equal(frequents.totalMots, versets.reduce((a, v) => a + v.mots.length, 0));
  assert.deepEqual(frequents.regle, { ...REGLE });
});

test('règle respectée : 40 mots, 3 lettres max, du plus fréquent au moins fréquent', () => {
  assert.equal(frequents.mots.length, REGLE.nombre);
  for (const m of frequents.mots) assert.ok([...m.forme].length <= REGLE.lettresMax, m.forme);
  for (let i = 1; i < frequents.mots.length; i++) assert.ok(frequents.mots[i - 1].nombre >= frequents.mots[i].nombre);
  assert.ok(frequents.couverture > 15 && frequents.couverture < 40);
});

test('chaque petit mot existe vraiment dans le texte officiel, autant de fois que compté', () => {
  const vrai = new Map();
  for (const v of versets) for (const m of v.mots) { const s = squelette(m.texte); vrai.set(s, (vrai.get(s) ?? 0) + 1); }
  for (const m of frequents.mots) assert.equal(vrai.get(m.forme), m.nombre, m.forme);
});

test('le squelette ne sert qu\'à compter : il ne garde que des lettres, et ne touche pas au texte', () => {
  const v = versets.find((x) => x.cle === '112:1');
  const avant = JSON.stringify(v);
  for (const m of v.mots) {
    const s = squelette(m.texte);
    assert.ok(!/[ً-ٰٟۖ-ۭـ\sٱ]/u.test(s), 'plus aucun signe');
    assert.ok(s.length > 0 && s.length <= m.texte.length);
  }
  assert.equal(JSON.stringify(v), avant, 'le verset est inchangé');
});
