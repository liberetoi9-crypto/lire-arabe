import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { creerLectureRepetee, getLectures } from '../../js/exercices/lectures.js';

let disque, maintenant;
beforeEach(() => {
  disque = new Map(); maintenant = 0;
  globalThis.localStorage = { getItem: k => disque.get(k) ?? null, setItem: (k, v) => disque.set(k, v) };
});
const creer = (id = 'coran:112') => creerLectureRepetee({ id, horloge: () => maintenant, date: () => '2026-11-10T12:00:00.000Z' });

test('pas de lecture gardée sans démarrage ni durée', () => {
  const l = creer();
  assert.throws(() => l.terminer());
  l.demarrer(); assert.throws(() => l.terminer());
  assert.equal(l.compteur, 0);
});

test('chronomètre : démarrer deux fois ne remet pas le temps à zéro', () => {
  const l = creer(); l.demarrer(); maintenant = 10000; l.demarrer();
  assert.equal(l.secondes, 10);
  const lecture = l.terminer({ sansArret: true });
  assert.equal(lecture.secondes, 10);
  assert.equal(lecture.sansArret, true);
  assert.equal(l.compteur, 1);
  assert.equal(l.etat, 'terminee');
});

test('pause et reprise : le temps passé en pause ne compte pas', () => {
  const l = creer(); l.demarrer(); maintenant = 7000; l.pause();
  maintenant = 200000; assert.equal(l.secondes, 7);
  l.demarrer(); maintenant += 3000;
  assert.equal(l.terminer().secondes, 10);
});

test('cinq lectures distinctes : ordre, premier et cinquième temps, case fluide conservés', () => {
  const l = creer();
  for (let i = 0; i < 5; i++) { l.demarrer(); maintenant += 10000 - i * 1000; l.terminer({ sansArret: i === 4 }); }
  assert.equal(l.compteur, 5);
  assert.deepEqual(getLectures('coran:112').map(l => l.secondes), [10, 9, 8, 7, 6]);
  assert.equal(getLectures('coran:112')[4].sansArret, true);
  assert.equal(new Set(l.lectures.map(l => l.cle)).size, 5);
  l.demarrer(); maintenant += 5000; l.terminer();
  assert.equal(l.compteur, 5); assert.equal(l.lectures.length, 6);
});

test('retour sur le même texte : compteur restauré, autres textes indépendants', async () => {
  const l = creer(); l.demarrer(); maintenant = 1234; l.terminer();
  const rechargement = await import('../../js/exercices/lectures.js?rechargement=1');
  assert.equal(rechargement.getLectures('coran:112')[0].secondes, 1.234);
  assert.equal(creer().compteur, 1);
  assert.equal(creer('texte:essai').compteur, 0);
  const copie = getLectures(); copie[0].secondes = 999;
  assert.equal(getLectures()[0].secondes, 1.234);
  assert.deepEqual([...disque.keys()], ['la:exercices.lectures']);
});

test('annuler ou quitter ne valide pas de lecture', () => {
  const l = creer(); l.demarrer(); maintenant = 8000; l.annuler();
  assert.equal(l.etat, 'attente'); assert.equal(l.secondes, 0);
  assert.equal(l.compteur, 0);
});

test('sauvegarde échouée : durée gardée en mémoire, réessai unique sans doublon', () => {
  const l = creer(); l.demarrer(); maintenant = 5000;
  const garder = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => l.terminer(), /ne peut pas garder/);
  assert.equal(l.secondes, 5); assert.equal(l.etat, 'pause');
  assert.equal(l.compteur, 0);
  localStorage.setItem = garder; l.terminer();
  assert.equal(l.compteur, 1);
  assert.throws(() => l.terminer());
  assert.equal(l.compteur, 1);
});

test('stockage invalide et options incorrectes refusés', () => {
  disque.set('la:exercices.lectures', '{'); assert.deepEqual(getLectures(), []);
  disque.set('la:exercices.lectures', JSON.stringify([{ id: 'coran:112', cle: 'a', secondes: -1, date: 'invalide' }]));
  assert.deepEqual(getLectures(), []);
  assert.throws(() => creer(''));
  assert.throws(() => creerLectureRepetee({ id: 'texte:essai', objectif: 0 }));
});
