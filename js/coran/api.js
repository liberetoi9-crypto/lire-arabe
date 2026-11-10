// Propriétaire : Claude Code. SEUL fichier du module Coran que les autres modules ont le droit d'importer.
// Contrat (détails dans PROJET.md).
import { chargerSourate, getManifeste } from './donnees.js';

const pasEncore = () => { throw new Error('pas encore fait'); };

export const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i); // sourates 78 à 114

// (n) => Promise<{ numero, nomArabe, nom, nomFr, nbVersets, nbMots, versets: [{ cle, sourate, verset, texte, mots: [{ position, texte }] }] }>
// Les objets renvoyés sont gelés : personne ne peut modifier le texte par erreur.
export async function getSourate(n) {
  return gelerProfond(await chargerSourate(n));
}

// ('112:1') => Promise<verset>. Vérifie que le verset renvoyé est EXACTEMENT celui demandé.
export async function getVerset(cle) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(String(cle));
  if (!m) throw new Error(`Clé de verset invalide : ${cle}`);
  const s = await getSourate(Number(m[1]));
  const v = s.versets[Number(m[2]) - 1];
  if (!v || v.cle !== cle) throw new Error(`Verset ${cle} inexistant`);
  return v;
}

// () => Promise<[numéros]> : sourates du Juz Amma, de la plus courte à la plus longue (nombre de mots).
export async function ordreJuzAmma() {
  const { sourates } = await getManifeste();
  return sourates
    .filter((s) => JUZ_AMMA.includes(s.numero))
    .sort((a, b) => a.nbMots - b.nbMots || a.nbVersets - b.nbVersets || b.numero - a.numero)
    .map((s) => s.numero);
}

// Infos légères de toutes les sourates (sans le texte), pour les listes.
export async function getListeSourates() {
  return (await getManifeste()).sourates.map(({ numero, nbVersets, nbMots }) => ({ numero, nbVersets, nbMots }));
}

export const SOURCE_TEXTE = {
  texte: 'Texte : quran.com (uthmani, Hafs), contrôlé verset par verset avec Tanzil.net',
  lien: 'https://tanzil.net',
};

export const getTraduction = pasEncore;     // ('112:1') => Promise<{ texte, notes, source, version }> (C6)
export const getSensMots = pasEncore;       // ('112:1') => Promise<[{ position, sens, langue: 'en', source }]> (C6)
export const getRecitateurs = pasEncore;    // () => [{ id, nom, riwaya: 'hafs', actif }] (C4)
export const getRecitateurActif = pasEncore;
export const setRecitateurActif = pasEncore;
export const urlAudio = pasEncore;          // ('112:1', id?) => URL everyayah (C4)
export const creerLecteur = pasEncore;      // (C4)
export const estMotFrequent = pasEncore;    // (texteMot) => boolean (C5)

function gelerProfond(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(gelerProfond);
  }
  return o;
}
