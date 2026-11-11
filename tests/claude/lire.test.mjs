// Propriétaire : Claude Code. Partie « Lire » : logique pure + moments des mots de Husary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { groupes, motAuTemps, questionFlash, nouvelleDuree, motsPourNiveau, nbLettres, vitesseSuivante, DUREE_FLASH } from '../../js/lire/logique.js';
import { sansVoyelles } from '../../js/core/arabe.js';

const racine = new URL('../../', import.meta.url);
const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
const SOURATES = [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)];

test('groupes : 2 ou 3 mots, jamais un mot seul, rien perdu ni déplacé', () => {
  for (let n = 1; n <= 30; n++) {
    const mots = Array.from({ length: n }, (_, i) => i);
    const g = groupes(mots);
    assert.deepEqual(g.flat(), mots);
    if (n >= 2) assert.ok(g.every((x) => x.length >= 2 && x.length <= 3), `n=${n} : ${g.map((x) => x.length)}`);
  }
});

test('motAuTemps : le bon mot, le mot d’avant reste allumé entre deux mots, 0 avant et après', () => {
  const sg = [[150, 710], [720, 1170], [1180, 2450]];
  assert.equal(motAuTemps(sg, 0), 0);
  assert.equal(motAuTemps(sg, 150), 1);
  assert.equal(motAuTemps(sg, 715), 1);
  assert.equal(motAuTemps(sg, 720), 2);
  assert.equal(motAuTemps(sg, 2449), 3);
  assert.equal(motAuTemps(sg, 2450), 0);
});

test('mot flash : 3 choix différents à l’œil, le bon dedans, mots copiés de la source', async () => {
  const sourates = await Promise.all(SOURATES.map(source));
  const tous = new Set(sourates.flatMap((s) => s.versets.flatMap((v) => v.mots.map((m) => m.texte))));
  for (const niveau of ['court', 'moyen', 'long']) {
    const mots = motsPourNiveau(sourates, niveau);
    assert.ok(mots.length > 50, `${niveau} : ${mots.length} mots`);
    assert.ok(mots.every((m) => tous.has(m.texte)), 'chaque mot vient du texte officiel');
    for (let k = 0; k < 200; k++) {
      const q = questionFlash(mots);
      assert.equal(q.choix.length, 3);
      assert.ok(q.choix.includes(q.bon));
      assert.equal(new Set(q.choix.map((m) => sansVoyelles(m.texte))).size, 3);
    }
  }
  assert.ok(motsPourNiveau(sourates, 'court').every((m) => nbLettres(m.texte) <= 3));
});

test('durée du mot flash : -100 ms après 3 justes de suite, +100 ms après une erreur, entre 300 et 1500', () => {
  assert.equal(nouvelleDuree(1000, true, 1), 1000);
  assert.equal(nouvelleDuree(1000, true, 3), 900);
  assert.equal(nouvelleDuree(1000, false, 0), 1100);
  assert.equal(nouvelleDuree(DUREE_FLASH.min, true, 3), DUREE_FLASH.min);
  assert.equal(nouvelleDuree(DUREE_FLASH.max, false, 0), DUREE_FLASH.max);
  assert.equal(vitesseSuivante(0.75), 0.85);
  assert.equal(vitesseSuivante(1.25), 1.25);
});

test('moments de Husary : un moment par mot pour chaque verset de la Fatiha et du Juz Amma, dans l’ordre', async () => {
  const d = JSON.parse(await readFile(new URL('data/coran/segments-husary-muallim.json', racine), 'utf8'));
  assert.equal(d.recitateur, 'husary_muallim');
  let total = 0;
  for (const n of SOURATES) {
    const s = await source(n);
    for (const v of s.versets) {
      const sg = d.sourates[n][v.cle];
      assert.ok(sg, `${v.cle} absent`);
      assert.equal(sg.length, v.mots.length, v.cle);
      sg.forEach(([a, b], i) => { assert.ok(a < b); if (i) assert.ok(a >= sg[i - 1][1], v.cle); });
      total++;
    }
  }
  assert.equal(total, 571);
});
