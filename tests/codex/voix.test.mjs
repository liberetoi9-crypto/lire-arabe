import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ajouterTexte, signalerTexte } from '../../js/textes/api.js';
import { creerVoixTexte, morceauxTexte, phrasesTexte } from '../../js/textes/voix.js';

beforeEach(() => {
  const donnees = new Map();
  globalThis.localStorage = { getItem: k => donnees.get(k) ?? null, setItem: (k, v) => donnees.set(k, v) };
});

function preparer(texte = ' Premier test.\nDeuxième test ? ') {
  // Charge technique française, aucun arabe ni traduction écrits pour les tests.
  const t = ajouterTexte({ titre: 'Essai voix', arabe: texte, source: 'Source de test', verifie: true });
  const lus = [], etats = [];
  let annulations = 0;
  let voix = [{ lang: 'fr-FR' }, { lang: 'ar-SA', name: 'Voix arabe de test' }];
  const synthese = { getVoices: () => voix, speak: u => lus.push(u), cancel: () => { annulations++; } };
  class Utterance { constructor(contenu) { this.text = contenu; } }
  const lecteur = creerVoixTexte(t.id, { synthese, Utterance, etat: e => etats.push(e) });
  return { lecteur, lus, etats, t, synthese, Utterance, changerVoix: v => { voix = v; }, annulations: () => annulations };
}

test('lecture exacte du texte personnel avec une voix arabe explicite', () => {
  const p = preparer();
  assert.equal(p.lus.length, 0);
  p.lecteur.ecouter();
  assert.equal(p.lus[0].text, p.t.arabe);
  assert.equal(p.lus[0].lang, 'ar-SA');
  assert.equal(p.lus[0].voice.name, 'Voix arabe de test');
  assert.equal(p.lus[0].rate, 1);
});

test('aucun repli vers une voix française, ni lecture automatique après chargement des voix', () => {
  const p = preparer();
  p.changerVoix([{ lang: 'fr-FR' }]);
  assert.equal(p.lecteur.disponible(), false);
  assert.throws(() => p.lecteur.ecouter(), /Aucune voix arabe/);
  assert.equal(p.lus.length, 0);
  p.changerVoix([{ lang: 'ar' }]);
  assert.equal(p.lecteur.disponible(), true);
  assert.equal(p.lus.length, 0);
  p.lecteur.ecouter();
  assert.equal(p.lus[0].lang, 'ar');
});

test('écoute du mot demandé seulement ; espaces et sauts de ligne conservés à l’affichage', () => {
  const p = preparer();
  assert.equal(morceauxTexte(p.t.arabe).join(''), p.t.arabe);
  p.lecteur.mot(1);
  assert.equal(p.lus[0].text, 'test.');
  assert.throws(() => p.lecteur.mot(-1), /introuvable/);
  assert.throws(() => p.lecteur.mot(100), /introuvable/);
  assert.equal(p.lus.length, 1);
});

test('vitesse lente et normale, arrêt avant changement et rejet des valeurs inconnues', () => {
  const p = preparer();
  p.lecteur.ecouter();
  p.lecteur.vitesse('lent');
  assert.equal(p.lus.length, 1);
  p.lecteur.ecouter();
  assert.equal(p.lus.at(-1).rate, 0.7);
  p.lecteur.vitesse('normal'); p.lecteur.ecouter();
  assert.equal(p.lus.at(-1).rate, 1);
  assert.throws(() => p.lecteur.vitesse('rapide'));
  assert.ok(p.annulations() >= 3);
});

test('répétition : une phrase, pause sans minuterie, suite uniquement au toucher', () => {
  const p = preparer('Premier test. Deuxième test!');
  assert.deepEqual(phrasesTexte(p.t.arabe), ['Premier test.', ' Deuxième test!']);
  p.lecteur.repeter();
  assert.equal(p.lus[0].text, 'Premier test.');
  p.lecteur.suivante(); // pas de saut pendant la phrase
  assert.equal(p.lus.length, 1);
  p.lus[0].onend();
  assert.equal(p.etats.at(-1).suite, true);
  assert.equal(p.lus.length, 1);
  p.lecteur.reecouter();
  assert.equal(p.lus[1].text, 'Premier test.');
  p.lus[1].onend();
  p.lecteur.suivante();
  assert.equal(p.lus[2].text, ' Deuxième test!');
  p.lus[2].onend();
  assert.equal(p.etats.at(-1).suite, false);
  p.lecteur.suivante(); assert.equal(p.lus.length, 3);
});

test('arrêt et anciens événements ne peuvent pas relancer ni changer le nouvel état', () => {
  const p = preparer();
  p.lecteur.repeter();
  const ancien = p.lus[0];
  p.lecteur.arreter();
  const compte = p.etats.length;
  ancien.onend(); ancien.onerror();
  p.lecteur.suivante(); p.lecteur.reecouter();
  assert.equal(p.etats.length, compte);
  assert.equal(p.lus.length, 1);
});

test('un texte signalé ou une clé Coran ne peut pas être envoyé à la synthèse', () => {
  const p = preparer();
  signalerTexte(p.t.id);
  for (const action of ['ecouter', 'repeter', 'reecouter', 'suivante']) assert.throws(() => p.lecteur[action](), /absent ou mis de côté/);
  const interdit = creerVoixTexte('112:1', { synthese: p.synthese, Utterance: p.Utterance });
  assert.throws(() => interdit.ecouter(), /absent ou mis de côté/);
  assert.equal(p.lus.length, 0);
});

test('erreur de voix : message et aucune phrase suivante automatique', () => {
  const p = preparer();
  p.lecteur.repeter();
  p.lus[0].onerror();
  assert.match(p.etats.at(-1).message, /pas pu lire/);
  assert.equal(p.etats.at(-1).enLecture, false);
  p.lecteur.suivante(); assert.equal(p.lus.length, 1);
});

test('navigateur sans synthèse : erreur lisible', () => {
  const p = preparer();
  const absent = creerVoixTexte(p.t.id, { synthese: null, Utterance: null });
  assert.equal(absent.disponible(), false);
  assert.throws(() => absent.ecouter(), /indisponible/);
});
