// Propriétaire : Codex (tâche X3/X4). SEUL fichier de ce module que les autres ont le droit d'importer.
const pasEncore = () => { throw new Error('pas encore fait'); };

export const afficherVoyellesProgressives = pasEncore; // (conteneur, { mots, niveau: 1|2|3 })
export { lectureRepetee } from './lecture-repetee.js'; // (conteneur, { id, objectif: 5 }) => { detruire, lecteur }
export { getLectures } from './lectures.js'; // (id?) => [{ id, cle, secondes, date, sansArret }]
export { etapeLectureCinqFois, etapeChrono } from './etapes-seance.js';
export { getRecordChrono } from './etapes-logique.js';
