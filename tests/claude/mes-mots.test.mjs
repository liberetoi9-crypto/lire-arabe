// Propriétaire : Claude Code (C6). « Mes mots » et découpage des traductions (sans Internet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajouter, retirer, aReviser, noterRevision, idMot } from '../../js/mots/mesmots.js';
import { decouperNotes, TRADUCTIONS } from '../../js/coran/traductions.js';

const jour = new Date('2026-11-10T10:00:00Z');

test('un mot ajouté garde sa sourate, son verset et sa position', () => {
  const l = ajouter([], { cle: '112:1', position: 3, sens: 'Allah', langue: 'en', source: 'quran.com' }, jour);
  assert.equal(l.length, 1);
  assert.equal(l[0].sourate, 112);
  assert.equal(l[0].verset, 1);
  assert.equal(l[0].position, 3);
  assert.equal(l[0].id, idMot('112:1', 3));
  assert.equal(l[0].texte, undefined, 'le texte arabe n\'est pas recopié : il est relu dans la source');
});

test('pas de doublon, retrait, mots invalides refusés', () => {
  let l = ajouter([], { cle: '1:2', position: 1 }, jour);
  l = ajouter(l, { cle: '1:2', position: 1 }, jour);
  assert.equal(l.length, 1);
  l = ajouter(l, { cle: '1:2', position: 2 }, jour);
  assert.equal(retirer(l, idMot('1:2', 1)).length, 1);
  assert.throws(() => ajouter([], { cle: 'abc', position: 1 }));
  assert.throws(() => ajouter([], { cle: '1:1', position: 0 }));
});

test('révision en cartes : su → revu plus tard ; pas su → revu tout de suite', () => {
  let l = ajouter([], { cle: '1:2', position: 1 }, jour);
  assert.equal(aReviser(l, jour).length, 1);
  const id = l[0].id;
  l = noterRevision(l, id, true, jour);            // boîte 2 → demain
  assert.equal(l[0].boite, 2);
  assert.equal(aReviser(l, jour).length, 0);
  assert.equal(aReviser(l, new Date('2026-11-11T10:00:00Z')).length, 1);
  l = noterRevision(l, id, false, jour);           // pas su → boîte 1, aujourd'hui
  assert.equal(l[0].boite, 1);
  assert.equal(aReviser(l, jour).length, 1);
});

test('notes Hamidullah : le texte est gardé tel quel, seul l\'appel de note est séparé', () => {
  const brut = 'Début du texte. <sup foot_note=211620>1</sup> fin';
  const m = decouperNotes(brut);
  assert.deepEqual(m, [{ texte: 'Début du texte. ' }, { note: 211620, numero: '1' }, { texte: ' fin' }]);
  assert.equal(m.map((x) => x.texte ?? '').join(''), 'Début du texte.  fin');
  assert.throws(() => decouperNotes('texte <b>gras</b>'), /inattendu/);
});

test('les 2 traductions françaises : Hamidullah (quran.com n° 31) et Rachid Maach (QuranEnc)', () => {
  assert.deepEqual(Object.keys(TRADUCTIONS), ['hamidullah', 'rachid']);
  assert.equal(TRADUCTIONS.hamidullah.quranComId, 31);
  assert.equal(TRADUCTIONS.rachid.cleQuranEnc, 'french_rashid');
  assert.match(TRADUCTIONS.rachid.credit, /QuranEnc\.com/);
});
