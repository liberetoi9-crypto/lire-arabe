// Propriétaire : Claude Code. Logique pure de la partie « Lire » (aucun affichage, testable sans navigateur).
// Aucun texte arabe écrit ici : les mots viennent toujours des fichiers officiels du Coran.
import { sansVoyelles } from '../core/arabe.js';

// Nombre de lettres d'un mot (sans voyelles ni signes).
export const nbLettres = (mot) => [...sansVoyelles(mot)].length;

// Niveaux du mot flash : taille des mots.
export const NIVEAUX_FLASH = {
  court: { nom: 'Mots courts', min: 2, max: 3 },
  moyen: { nom: 'Mots moyens', min: 4, max: 5 },
  long: { nom: 'Mots longs', min: 6, max: 99 },
};

// Liste des mots différents des sourates données (texte exact de la source), pour un niveau.
export function motsPourNiveau(sourates, niveau) {
  const { min, max } = NIVEAUX_FLASH[niveau];
  const vus = new Map();
  for (const s of sourates) for (const v of s.versets) for (const m of v.mots) {
    const n = nbLettres(m.texte);
    if (n >= min && n <= max && !vus.has(m.texte)) vus.set(m.texte, { texte: m.texte, cle: v.cle, position: m.position });
  }
  return [...vus.values()];
}

// Une question : le bon mot + 2 autres mots qui ont un squelette différent (donc vraiment différents à l'œil).
export function questionFlash(mots, hasard = Math.random) {
  const bon = mots[Math.floor(hasard() * mots.length)];
  const autres = [];
  const squelettes = new Set([sansVoyelles(bon.texte)]);
  for (let essai = 0; autres.length < 2 && essai < 200; essai++) {
    const m = mots[Math.floor(hasard() * mots.length)];
    const sq = sansVoyelles(m.texte);
    if (!squelettes.has(sq)) { squelettes.add(sq); autres.push(m); }
  }
  const choix = [bon, ...autres];
  for (let i = choix.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [choix[i], choix[j]] = [choix[j], choix[i]]; }
  return { bon, choix };
}

// Durée d'affichage : 3 bonnes réponses de suite → 100 ms de moins ; une erreur → 100 ms de plus.
export const DUREE_FLASH = { depart: 1000, min: 300, max: 1500, pas: 100 };
export function nouvelleDuree(duree, juste, serie) {
  if (!juste) return Math.min(DUREE_FLASH.max, duree + DUREE_FLASH.pas);
  if (serie > 0 && serie % 3 === 0) return Math.max(DUREE_FLASH.min, duree - DUREE_FLASH.pas);
  return duree;
}

// Coupe un verset en petits groupes de 2 ou 3 mots (jamais un mot seul, sauf verset d'un seul mot).
export function groupes(mots) {
  const n = mots.length;
  if (n <= 3) return [mots.slice()];
  const res = [];
  let i = 0;
  while (n - i > 4) { res.push(mots.slice(i, i + 3)); i += 3; }
  if (n - i === 4) res.push(mots.slice(i, i + 2), mots.slice(i + 2));
  else res.push(mots.slice(i));
  return res;
}

// Rythme de la lecture par groupes (temps par groupe).
export const RYTHMES = { lent: { nom: 'Lent', ms: 1800 }, moyen: { nom: 'Moyen', ms: 1200 }, rapide: { nom: 'Rapide', ms: 750 } };

// Vitesses du « Suis la récitation » : elle monte d'un cran à chaque sourate finie.
export const VITESSES_RECITATION = [0.75, 0.85, 1, 1.1, 1.25];
export const vitesseSuivante = (v) => VITESSES_RECITATION[Math.min(VITESSES_RECITATION.indexOf(v) + 1, VITESSES_RECITATION.length - 1)] ?? VITESSES_RECITATION[0];

// Le mot dit à l'instant t (ms) : position (1..n). Entre deux mots, le mot d'avant reste allumé.
// 0 avant le premier mot et après la fin du dernier.
export function motAuTemps(segments, t) {
  let pos = 0;
  for (let i = 0; i < segments.length && t >= segments[i][0]; i++) pos = i + 1;
  if (pos === segments.length && pos && t >= segments[pos - 1][1]) return 0;
  return pos;
}
