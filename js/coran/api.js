// Propriétaire : Claude Code. SEUL fichier du module Coran que les autres modules ont le droit d'importer.
// Contrat (détails dans PROJET.md).
import { chargerSourate, getManifeste } from './donnees.js';
import { recitateursDisponibles, trouverRecitateur, construireUrl } from './recitateurs.js';
import { fabriquerLecteur } from './lecteur.js';
import { lire, ecrire } from '../core/stockage.js';

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

// Tri « de la plus courte à la plus longue » : nombre de mots du texte officiel,
// puis nombre de versets, puis numéro (égalités : la sourate de numéro le plus grand d'abord, comme dans le mushaf lu à l'envers).
const parTaille = (a, b) => a.nbMots - b.nbMots || a.nbVersets - b.nbVersets || b.numero - a.numero;

// () => Promise<[numéros]> : sourates du Juz Amma, de la plus courte à la plus longue.
export async function ordreJuzAmma() {
  const { sourates } = await getManifeste();
  return sourates.filter((s) => JUZ_AMMA.includes(s.numero)).sort(parTaille).map((s) => s.numero);
}

// () => Promise<[numéros]> : les 114 sourates, de la plus courte à la plus longue.
export async function ordreParMots() {
  const { sourates } = await getManifeste();
  return [...sourates].sort(parTaille).map((s) => s.numero);
}

// () => Promise<[numéros]> : ordre du parcours de mémorisation (choix de Zakou, 10/11) :
// Fatiha, puis Juz Amma court → long, puis le reste court → long.
export async function ordreMemorisation() {
  const juz = await ordreJuzAmma();
  const reste = (await ordreParMots()).filter((n) => n !== 1 && !JUZ_AMMA.includes(n));
  const ordre = [1, ...juz, ...reste];
  if (ordre.length !== 114 || new Set(ordre).size !== 114) throw new Error('Contrôle : ordre de mémorisation incomplet');
  return ordre;
}

// Infos légères de toutes les sourates (sans le texte), pour les listes.
export async function getListeSourates() {
  return (await getManifeste()).sourates.map(({ numero, nomArabe, nom, nomFr, nbVersets, nbMots }) => (
    { numero, nomArabe, nom, nomFr, nbVersets, nbMots }));
}

export const SOURCE_TEXTE = {
  texte: 'Texte : quran.com (uthmani, Hafs), contrôlé verset par verset avec Tanzil.net',
  lien: 'https://tanzil.net',
};

export const getTraduction = pasEncore;     // ('112:1') => Promise<{ texte, notes, source, version }> (C6)
export const getSensMots = pasEncore;       // ('112:1') => Promise<[{ position, sens, langue: 'en', source }]> (C6)
// ---- Récitateurs et sons (C4) ----
// () => [{ id, nom, riwaya, principal }] : seulement les récitateurs autorisés (liste fermée, Hafs).
export function getRecitateurs() {
  return recitateursDisponibles().map(({ id, nom, riwaya, principal }) => ({ id, nom, riwaya, principal }));
}

// () => id du récitateur choisi (Husary mu'allim par défaut).
export function getRecitateurActif() {
  const id = lire('coran.recitateur', null);
  const ok = recitateursDisponibles().some((r) => r.id === id);
  return ok ? id : recitateursDisponibles().find((r) => r.principal).id;
}

export function setRecitateurActif(id) {
  trouverRecitateur(id); // refuse un récitateur non autorisé
  ecrire('coran.recitateur', id);
}

// ('112:1', id?) => URL everyayah du verset, pour le récitateur demandé (ou celui choisi).
export function urlAudio(cle, id = getRecitateurActif()) {
  return construireUrl(cle, trouverRecitateur(id));
}

// () => lecteur : jouer(cles, { fois, repeteApresMoi }), boucle(cle, fois), pause(), reprendre(), arreter(),
//       vitesse('lent'|'normal'). Émet verset:debut, verset:fin, lecteur:a-toi, lecteur:fin, lecteur:erreur.
export function creerLecteur() {
  return fabriquerLecteur({ urlPour: (cle) => urlAudio(cle), recitateurPour: getRecitateurActif });
}
export const estMotFrequent = pasEncore;    // (texteMot) => boolean (C5)

function gelerProfond(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(gelerProfond);
  }
  return o;
}
