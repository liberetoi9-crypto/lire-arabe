// Propriétaire : Codex (tâche X1). SEUL fichier de ce module que les autres ont le droit d'importer.
const pasEncore = () => { throw new Error('pas encore fait'); };

export const getTextes = pasEncore;     // () => [{ id, titre, arabe, traductionFr?, source }] (sans les textes signalés)
export const getTexte = pasEncore;      // (id) => texte
export const getTexteDuJour = pasEncore; // () => texte ou null si « Mes textes » est vide
