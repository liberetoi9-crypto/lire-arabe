// Propriétaire : Codex (tâche X1). SEUL fichier de ce module que les autres ont le droit d'importer.
import { lire, ecrire } from '../core/stockage.js';
import { estSignale, signaler } from '../core/signalement.js';

const CLE = 'textes.liste';
const misDeCote = new Set();
const rempli = valeur => typeof valeur === 'string' && valeur.trim().length > 0;
const valide = t => t && rempli(t.id) && rempli(t.titre) && rempli(t.arabe)
  && rempli(t.source) && t.verifie === true
  && (!t.traductionFr || (rempli(t.traductionFr) && rempli(t.sourceTraduction)));

function tous() {
  const liste = lire(CLE, []);
  return Array.isArray(liste) ? liste.filter(valide) : [];
}

export function getTextes() {
  return tous().filter(t => !misDeCote.has(t.id) && !estSignale('texte', t.id)).map(t => ({ ...t }));
}

export function getTexte(id) {
  return getTextes().find(t => t.id === id) ?? null;
}

// Choix stable sur une journée locale, sans écrire dans le stockage.
export function getTexteDuJour() {
  const liste = getTextes();
  if (!liste.length) return null;
  const maintenant = new Date();
  const jour = Math.floor(Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()) / 86400000);
  return liste[jour % liste.length];
}

export function ajouterTexte({ titre, arabe, source, traductionFr = '', sourceTraduction = '', verifie } = {}) {
  if (!rempli(titre) || !rempli(arabe) || !rempli(source)) {
    throw new Error('Ajoute le titre, le texte et sa source.');
  }
  if (verifie !== true) throw new Error('Confirme que tu as vérifié le texte.');
  if (typeof traductionFr !== 'string' || typeof sourceTraduction !== 'string'
    || (traductionFr && (!rempli(traductionFr) || !rempli(sourceTraduction)))) {
    throw new Error('Ajoute la source officielle de la traduction.');
  }
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join('-')}`;
  // Aucun remplacement, trim ou normalisation du texte fourni.
  const texte = { id, titre, arabe, source, traductionFr, sourceTraduction, verifie: true };
  if (!ecrire(CLE, [...tous(), texte])) {
    throw new Error("Le téléphone n'a pas pu garder ton texte. Garde une copie et réessaie.");
  }
  return { ...texte };
}

export function signalerTexte(id) {
  if (!getTexte(id)) return false;
  misDeCote.add(id);
  signaler('texte', id);
  const garde = estSignale('texte', id);
  // Le signalement partagé reste la référence, notamment après vérification.
  if (garde) misDeCote.delete(id);
  return garde;
}
