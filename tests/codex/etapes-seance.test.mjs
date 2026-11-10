import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { creerCinqLectures, getRecordChrono } from '../../js/exercices/etapes-logique.js';
import { creerLectureRepetee, getLectures } from '../../js/exercices/lectures.js';

let temps;
beforeEach(() => {
  temps = 0;
  const disque = new Map();
  globalThis.localStorage = { getItem: k => disque.get(k) ?? null, setItem: (k, v) => disque.set(k, v) };
});
const options = () => ({ id: 'coran:112', session: 'seance-test', horloge: () => temps, date: () => '2026-11-10T12:00:00Z' });

test('cinq lectures : un clic par lecture, cinq temps distincts et cinquième case fluide gardée', () => {
  const cinq = creerCinqLectures(options());
  assert.equal(cinq.compteur, 0);
  for (let i = 0; i < 5; i++) { temps += (10 - i) * 1000; cinq.marquer({ sansArret: i === 4 }); }
  assert.equal(cinq.termine, true);
  assert.equal(cinq.compteur, 5);
  assert.deepEqual(cinq.lectures.map(l => l.secondes), [10, 9, 8, 7, 6]);
  assert.equal(cinq.lectures[4].sansArret, true);
  assert.ok(cinq.lectures.every(l => l.session === 'seance-test' && l.etape === 'lecture-cinq'));
  assert.equal(cinq.marquer(), null);
  assert.equal(getLectures().length, 5);
});

test('reprise de la même séance : ronds restaurés ; nouvelle séance ou autre source : zéro rond', () => {
  const cinq = creerCinqLectures(options());
  temps = 1000; cinq.marquer(); temps = 2000; cinq.marquer(); cinq.detruire();
  assert.equal(creerCinqLectures(options()).compteur, 2);
  assert.equal(creerCinqLectures({ ...options(), session: 'autre' }).compteur, 0);
  assert.equal(creerCinqLectures({ ...options(), id: 'coran:113' }).compteur, 0);
});

test('le temps caché ne compte pas dans les lectures', () => {
  const cinq = creerCinqLectures(options());
  temps = 3000; cinq.pause(); temps = 100000; cinq.reprendre(); temps += 2000;
  assert.equal(cinq.marquer().secondes, 5);
});

test('quota dépassé : aucun rond gagné, réessai garde le même temps une fois', () => {
  const cinq = creerCinqLectures(options()); temps = 5000;
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => cinq.marquer(), /ne peut pas garder/);
  assert.equal(cinq.compteur, 0);
  temps += 100000; cinq.reprendre();
  localStorage.setItem = original;
  assert.equal(cinq.marquer().secondes, 5);
  assert.equal(cinq.compteur, 1);
});

test('le record Chrono ne mélange pas les temps des cinq lectures et reste propre à la source', () => {
  const cinq = creerCinqLectures(options()); temps = 1000; cinq.marquer();
  assert.equal(getRecordChrono('coran:112'), null);
  const chrono = creerLectureRepetee({ ...options(), etape: 'chrono' });
  for (const duree of [6, 8, 5]) { chrono.demarrer(); temps += duree * 1000; chrono.terminer(); }
  assert.equal(getRecordChrono('coran:112'), 5);
  assert.equal(getRecordChrono('coran:113'), null);
  assert.equal(creerCinqLectures(options()).compteur, 1);
});

test('fermer une étape ne valide pas la lecture en cours', () => {
  const cinq = creerCinqLectures(options()); temps = 1000; cinq.detruire();
  assert.equal(getLectures().length, 0);
  assert.throws(() => cinq.marquer());
});

test('aucune durée fictive si le chrono n’a pas avancé', () => {
  const cinq = creerCinqLectures(options());
  assert.throws(() => cinq.marquer(), /chronomètre/);
  assert.equal(cinq.compteur, 0);
  cinq.reprendre(); temps = 1000; assert.equal(cinq.marquer().secondes, 1);
});
