// X2 : uniquement les textes personnels vérifiés, jamais le module Coran.
import { getTexte } from './api.js';

export const morceauxTexte = texte => texte.split(/(\s+)/u);
export const phrasesTexte = texte => (texte.match(/[^.!?\u061f\n]+[.!?\u061f\n]*|[.!?\u061f\n]+/gu) ?? [])
  .filter(phrase => phrase.trim());

export function creerVoixTexte(id, {
  synthese = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  etat = () => {},
} = {}) {
  let vitesse = 'normal';
  let generation = 0;
  let courant = null; // référence gardée jusqu'à la fin de l'énoncé
  let phrases = [];
  let index = -1;
  let repetition = false;
  let enLecture = false;

  const voixArabe = () => synthese?.getVoices().find(v => /^ar(?:[-_]|$)/i.test(v.lang));
  const annoncer = (message, suite = false) => etat({ message, suite, enLecture, repetition });
  function annuler() {
    generation++;
    courant = null;
    enLecture = false;
    synthese?.cancel();
  }
  function arreter() {
    annuler(); repetition = false; index = -1; phrases = [];
    annoncer('Lecture arrêtée.');
  }
  function source() {
    const texte = getTexte(id);
    if (!texte) throw new Error('Ce texte est absent ou mis de côté.');
    return texte.arabe;
  }
  function dire(texte, repeter = false) {
    annuler();
    if (!synthese || !Utterance) throw new Error('La lecture à voix haute est indisponible sur ce navigateur.');
    const voix = voixArabe();
    if (!voix) throw new Error('Aucune voix arabe disponible. Active une voix arabe sur ton téléphone, puis réessaie.');
    const jeton = generation;
    courant = new Utterance(texte);
    courant.lang = voix.lang;
    courant.voice = voix;
    courant.rate = vitesse === 'lent' ? 0.7 : 1;
    courant.onend = () => {
      if (jeton !== generation) return;
      courant = null; enLecture = false;
      annoncer(repeter ? (index + 1 < phrases.length ? 'À toi ! Répète, puis touche « Phrase suivante ».' : 'À toi ! Répète la dernière phrase.') : 'Écoute terminée.', repeter && index + 1 < phrases.length);
    };
    courant.onerror = () => {
      if (jeton !== generation) return;
      courant = null; enLecture = false; repetition = false;
      annoncer('La voix n’a pas pu lire. Touche « Écouter le texte » pour réessayer.');
    };
    enLecture = true;
    annoncer(repeter ? `Écoute la phrase ${index + 1} sur ${phrases.length}.` : 'Écoute en cours.');
    // Directement dans le geste de l'utilisateur : pas de timer ni d'attente asynchrone.
    try { synthese.speak(courant); }
    catch (e) { arreter(); throw e; }
  }
  return {
    disponible: () => Boolean(synthese && Utterance && voixArabe()),
    ecouter() { const texte = source(); repetition = false; dire(texte); },
    mot(position) {
      const mots = morceauxTexte(source()).filter(m => m && !/^\s+$/u.test(m));
      if (!Number.isInteger(position) || !mots[position]) throw new Error('Mot introuvable.');
      repetition = false; dire(mots[position]);
    },
    repeter() { phrases = phrasesTexte(source()); index = 0; repetition = true; dire(phrases[index], true); },
    suivante() {
      source();
      if (!repetition || enLecture || index + 1 >= phrases.length) return;
      index++; dire(phrases[index], true);
    },
    reecouter() {
      source();
      if (repetition && index >= 0) dire(phrases[index], true);
    },
    vitesse(valeur) {
      if (!['lent', 'normal'].includes(valeur)) throw new Error('Vitesse inconnue.');
      arreter(); vitesse = valeur;
      annoncer(valeur === 'lent' ? 'Vitesse lente. Relance l’écoute.' : 'Vitesse normale. Relance l’écoute.');
    },
    arreter,
  };
}
