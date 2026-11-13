// Propriétaire : Claude Code. « Mon programme » : un jour = des étapes cochées. SEUL fichier du programme importable par les autres modules.
// Un jour par date (7 jours sur 7) ; le 7e jour de chaque semaine = révision. Un jour pas fini reste le même le lendemain.
import { lire, ecrire } from '../core/stockage.js';
import { estJourRevision, leconDuJour, semaineDuJour } from './logique.js';

const aujourdhui = () => new Date().toLocaleDateString('sv'); // AAAA-MM-JJ, heure du téléphone

// Étapes d'un jour. obligatoire = il faut la faire pour finir le jour.
export function etapesDuJour(n) {
  if (estJourRevision(n)) {
    return [
      { id: 'revision', titre: 'Réviser mes mots', minutes: 5, obligatoire: true },
      { id: 'sourates', titre: 'Relire les sourates de la semaine', minutes: 15, obligatoire: true },
      { id: 'regles', titre: 'Quiz : les règles de la semaine', minutes: 10, obligatoire: true },
      { id: 'arabe', titre: 'Arabe : revoir les phrases', minutes: 5, obligatoire: false },
    ];
  }
  return [
    { id: 'revision', titre: 'Réviser mes mots', minutes: 5, obligatoire: true },
    { id: 'lecon', titre: 'Coran : la règle du jour', minutes: 5, obligatoire: true },
    { id: 'lecture', titre: 'Coran : lire la sourate du jour', minutes: 7, obligatoire: true },
    { id: 'mots', titre: 'Coran : 5 mots et leur sens', minutes: 3, obligatoire: true },
    { id: 'arabe', titre: 'Arabe : la leçon du jour', minutes: 15, obligatoire: false },
  ];
}

// Le jour en cours : { n, semaine, revision, lecon, date, faites: {id: true}, fini, sourates: [] }
export function getJour() {
  const joursFinis = lire('programme.joursFinis', 0);
  const j = lire('programme.jour', null);
  if (j && j.date === aujourdhui()) return completer(j);
  if (j && !j.fini) { // pas fini hier : on le reprend, mais la révision des mots est à refaire (nouveau jour)
    const { revision, ...faites } = j.faites ?? {};
    return completer({ ...j, faites, date: aujourdhui() });
  }
  return completer({ n: joursFinis + 1, date: aujourdhui(), faites: {}, fini: false });
}
function completer(j) {
  return { ...j, semaine: semaineDuJour(j.n), revision: estJourRevision(j.n), lecon: leconDuJour(j.n) };
}
function sauver(j) {
  const { n, date, faites, fini } = j;
  ecrire('programme.jour', { n, date, faites, fini });
}

export function cocher(id) {
  const j = getJour();
  if (j.fini || j.faites[id]) return j;
  const nouveau = { ...j, faites: { ...j.faites, [id]: true } };
  sauver(nouveau);
  return nouveau;
}

export const peutFinir = (j = getJour()) => etapesDuJour(j.n).filter((e) => e.obligatoire).every((e) => j.faites[e.id]);

export function finirJour() {
  const j = getJour();
  if (j.fini || !peutFinir(j)) return j;
  const fini = { ...j, fini: true };
  sauver(fini);
  ecrire('programme.joursFinis', j.n);
  return fini;
}

// Sourates lues par jour du programme (pour la révision de la semaine).
export function noterSourate(n, sourate) {
  const s = lire('programme.sourates', {});
  if (s[n] === sourate) return;
  ecrire('programme.sourates', { ...s, [n]: sourate });
}
export function souratesDeLaSemaine(n) {
  const s = lire('programme.sourates', {});
  const debut = (semaineDuJour(n) - 1) * 7 + 1;
  return [...new Set(Array.from({ length: 6 }, (_, i) => s[debut + i]).filter(Boolean))];
}
// Leçons de lecture vues cette semaine (pour le quiz du 7e jour).
export function leconsDeLaSemaine(n) {
  const debut = (semaineDuJour(n) - 1) * 7 + 1;
  return [...new Set(Array.from({ length: 6 }, (_, i) => leconDuJour(debut + i)).filter(Boolean))];
}
// Rang du jour « nouveau » (1, 2, 3…) : sert à choisir la leçon d'arabe.
export const rangNouveau = (n) => n - Math.floor(n / 7);
