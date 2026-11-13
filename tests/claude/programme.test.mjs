// Propriétaire : Claude Code. « Mon programme » : logique pure (calendrier, règles de lecture, rappels de la Sunna).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LECONS, leconDuJour, estJourRevision, estLeconRevue, reperer, exemples, exercice, rappelsDuJour, RAPPELS, estVendredi } from '../../js/programme/logique.js';

const racine = new URL('../../', import.meta.url);
const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
const SOURATES = [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)];
const ARABE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;
let mots;
const tousLesMots = async () => (mots ??= (await Promise.all(SOURATES.map(source)))
  .flatMap((s) => s.versets.flatMap((v) => v.mots.map((m) => ({ cle: v.cle, position: m.position, texte: m.texte })))));

test('calendrier : 6 jours avec une règle, le 7e = révision ; les règles se suivent sans trou', () => {
  const vues = [];
  for (let n = 1; n <= 7 * 4; n++) {
    if (n % 7 === 0) { assert.ok(estJourRevision(n)); assert.equal(leconDuJour(n), null); continue; }
    assert.ok(!estJourRevision(n));
    vues.push(leconDuJour(n));
  }
  assert.deepEqual(vues.slice(0, LECONS.length), LECONS.map((_, i) => i + 1));
  assert.equal(vues[LECONS.length], 1, 'après la dernière règle, on revoit la 1re');
  assert.ok(!estLeconRevue(1) && estLeconRevue(7 * 4 - 1));
});

test('chaque règle a au moins 6 vrais exemples dans le Coran et un exercice 4 avec / 4 sans', async () => {
  const m = await tousLesMots();
  for (const l of LECONS) {
    const ex = exemples(l, m);
    assert.equal(ex.length, 6, l.id);
    for (const x of ex) assert.ok(m.some((y) => y.cle === x.cle && y.position === x.position && y.texte === x.texte), 'mot recopié tel quel');
    const exo = exercice(l, m);
    assert.equal(exo.filter((x) => x.bon).length, 4, l.id);
    assert.equal(exo.filter((x) => !x.bon).length, 4, l.id);
    for (const x of exo) assert.equal(reperer(l, x.texte).length > 0, x.bon, `${l.id} : ${x.cle}`);
  }
});

test('règles : contrôles sur des mots connus', async () => {
  const m = await tousLesMots();
  const mot = (cle, p) => m.find((x) => x.cle === cle && x.position === p).texte;
  const regle = (id) => LECONS.find((l) => l.id === id);
  assert.ok(reperer(regle('al-solaire'), mot('112:1', 3)).length, 'Allah (112:1) : L muet');
  assert.ok(reperer(regle('al-lunaire'), mot('78:2', 3)).length, '78:2 « al-’azim » : L dit');
  assert.ok(!reperer(regle('al-lunaire'), mot('112:1', 3)).length);
  assert.ok(reperer(regle('shadda'), mot('78:1', 1)).length, '78:1 « ’amma »');
  assert.ok(reperer(regle('qalqala'), mot('112:3', 2)).length, '112:3 « yalid »');
  assert.ok(reperer(regle('ghunna'), mot('78:1', 1)).length, '« ’amma » : mim avec shadda');
});

test('aucun texte arabe écrit à la main dans le programme (code, leçons d’arabe, rappels)', async () => {
  for (const f of ['js/programme/logique.js', 'js/programme/api.js', 'js/programme/index.js', 'data/arabe/lecons.json']) {
    const t = await readFile(new URL(f, racine), 'utf8');
    assert.ok(!ARABE.test(t), f);
  }
  for (const r of RAPPELS) assert.ok(!ARABE.test(JSON.stringify(r)));
});

test('rappels de la Sunna : al-Kahf seulement le vendredi (dès le jeudi soir), chacun avec sa source', () => {
  for (const r of RAPPELS) { assert.ok(r.source && r.titre && r.texte, r.id); if (r.adresse) assert.match(r.adresse, /^#\/coran\/\d+(\/\d+)?$/); }
  const kahf = (d) => rappelsDuJour(d).some((r) => r.id === 'kahf');
  assert.ok(kahf(new Date(2026, 10, 13, 10)), 'vendredi 13/11/2026');
  assert.ok(kahf(new Date(2026, 10, 12, 19)), 'jeudi soir');
  assert.ok(!kahf(new Date(2026, 10, 12, 10)), 'jeudi matin');
  assert.ok(!kahf(new Date(2026, 10, 14, 10)), 'samedi');
  assert.ok(estVendredi(new Date(2026, 10, 13, 10)));
  assert.equal(rappelsDuJour(new Date(2026, 10, 13, 10))[0].quand, 'vendredi', 'le vendredi en premier');
});

test('leçons d’arabe : français seulement tant que ce n’est pas vérifié par 2 IA', async () => {
  const d = JSON.parse(await readFile(new URL('data/arabe/lecons.json', racine), 'utf8'));
  assert.ok(d.lecons.length >= 12);
  if (!d.verifie) for (const l of d.lecons) for (const p of l.phrases) assert.equal(p.ar, undefined);
});
