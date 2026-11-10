// Propriétaire : Claude Code. Vérifie que les fichiers du Coran n'ont pas été touchés depuis le téléchargement.
// (La comparaison avec quran.com et Tanzil en ligne est faite par scripts/telecharger-coran.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dossier = new URL('../../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));

test('114 sourates et 6236 versets', () => {
  assert.equal(manifeste.sourates.length, 114);
  assert.equal(manifeste.sourates.reduce((s, x) => s + x.nbVersets, 0), 6236);
  assert.equal(manifeste.differencesTanzil, 0);
});

test('chaque fichier est identique au téléchargement (empreinte) et bien numéroté', async () => {
  for (const s of manifeste.sourates) {
    const brut = await readFile(new URL(s.fichier, dossier), 'utf8');
    assert.equal(createHash('sha256').update(brut).digest('hex'), s.sha256, `empreinte ${s.fichier}`);
    const d = JSON.parse(brut);
    assert.equal(d.numero, s.numero);
    assert.equal(d.versets.length, d.nbVersets);
    d.versets.forEach((v, i) => {
      assert.equal(v.cle, `${s.numero}:${i + 1}`);
      assert.equal(v.sourate, s.numero);
      assert.equal(v.verset, i + 1);
      assert.equal(v.mots.map((m) => m.texte).join(' '), v.texte, `mots de ${v.cle}`);
    });
  }
});
