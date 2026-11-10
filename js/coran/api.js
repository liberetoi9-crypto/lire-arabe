// Propriétaire : Claude Code. SEUL fichier du module Coran que les autres modules ont le droit d'importer.
// Contrat (détails dans PROJET.md). Rempli aux tâches C3 à C6.
const pasEncore = () => { throw new Error('pas encore fait'); };

export const getSourate = pasEncore;        // (n) => Promise<{ numero, nom, versets: [{ cle, sourate, verset, texte, mots: [{ position, texte }] }] }>
export const getVerset = pasEncore;         // ('112:1') => Promise<verset>
export const ordreJuzAmma = pasEncore;      // () => Promise<[numéros de sourates, de la plus courte à la plus longue]>
export const getTraduction = pasEncore;     // ('112:1') => Promise<{ texte, source }>  (Hamidullah, quran.com n° 31)
export const getSensMots = pasEncore;       // ('112:1') => Promise<[{ position, sens, langue: 'en', source }]>
export const getRecitateurs = pasEncore;    // () => [{ id, nom, riwaya: 'hafs', actif }]
export const getRecitateurActif = pasEncore;
export const setRecitateurActif = pasEncore;
export const urlAudio = pasEncore;          // ('112:1', id?) => URL everyayah
export const creerLecteur = pasEncore;      // () => { jouer(cles), pause(), reprendre(), arreter(), vitesse(v), repeteApresMoi(bool) }
export const estMotFrequent = pasEncore;    // (texteMot) => boolean
