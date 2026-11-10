// Propriétaire : Claude Code. SEUL fichier du module Coran que les autres modules ont le droit d'importer.
// Contrat (détails dans PROJET.md).
import { chargerSourate, getManifeste } from './donnees.js';
import { recitateursDisponibles, trouverRecitateur, construireUrl,
  SOURATES_A_VERIFIER, etatVerification, recitateurEffectif } from './recitateurs.js';
import { fabriquerLecteur } from './lecteur.js';
import { lire, ecrire } from '../core/stockage.js';
import { squelette } from './frequents.js';
import { TRADUCTIONS, chargerQuranCom, chargerNoteQuranCom, chargerRachid, chargerVersionRachid } from './traductions.js';

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

// ---- Comprendre les mots (C6) ----
const cleValide = (cle) => { if (!/^\d{1,3}:\d{1,3}$/.test(String(cle))) throw new Error(`Clé invalide : ${cle}`); };

// () => [{ id, nom, credit }] : les 2 traductions françaises du verset.
export const getTraductions = () => Object.values(TRADUCTIONS).map(({ id, nom, credit }) => ({ id, nom, credit }));
export const getTraductionActive = () => (lire('coran.traduction', 'hamidullah') in TRADUCTIONS ? lire('coran.traduction', 'hamidullah') : 'hamidullah');
export function setTraductionActive(id) {
  if (!(id in TRADUCTIONS)) throw new Error('Traduction inconnue');
  ecrire('coran.traduction', id);
}

// ('112:1', id?) => Promise<{ id, credit, morceaux: [{ texte } | { note, numero }], notes?, version?, traducteur?, lienSignaler? }>
// Texte tel que donné par la source (rien changé, rien ajouté, rien enlevé).
export async function getTraduction(cle, id = getTraductionActive()) {
  cleValide(cle);
  const v = await getVerset(cle);
  const s = await getSourate(v.sourate);
  const t = TRADUCTIONS[id];
  if (!t) throw new Error('Traduction inconnue');
  if (id === 'hamidullah') {
    const d = (await chargerQuranCom(s)).get(cle);
    return { id, credit: t.credit, morceaux: d.hamidullah.morceaux };
  }
  const [d, version] = await Promise.all([chargerRachid(s), chargerVersionRachid()]);
  const x = d.get(cle);
  return { id, credit: t.credit, traducteur: t.traducteur, version, morceaux: [{ texte: x.texte }], notes: x.notes, lienSignaler: t.lienSignaler(v.sourate) };
}

// (idNote) => Promise<texte de la note Hamidullah (quran.com)>
export const getNoteHamidullah = (idNote) => chargerNoteQuranCom(idNote);
// ('112:1') => Promise<[{ position, sens, langue: 'en', source }]> — sens mot à mot de quran.com (anglais).
// sens = null si quran.com n'a pas exactement le même mot à cette place (on n'affiche alors rien).
export async function getSensMots(cle) {
  cleValide(cle);
  const v = await getVerset(cle);
  const d = (await chargerQuranCom(await getSourate(v.sourate))).get(cle);
  return d.sens.map((x) => ({ ...x, source: 'quran.com (mot à mot, anglais)' }));
}
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

// ---- Sons à vérifier par Zakou ----
const lireEtats = () => lire('coran.verifSons', {});
const sourateDe = (cle) => Number(String(cle).split(':')[0]);

// (n) => id du récitateur qui joue vraiment sur cette sourate (Husary tant que Dosari n'est pas vérifié ici).
export function recitateurPourSourate(n) {
  return recitateurEffectif(getRecitateurActif(), Number(n), lireEtats());
}

// () => [{ recitateur, nom, sourate, etat: 'a-verifier' | 'ok' | 'erreur', date }]
export function getSonsAVerifier() {
  const etats = lireEtats();
  return Object.entries(SOURATES_A_VERIFIER).flatMap(([id, sourates]) => sourates.map((s) => ({
    recitateur: id,
    nom: trouverRecitateur(id).nom,
    sourate: s,
    etat: etatVerification(id, s, etats),
    date: etats[`${id}:${s}`]?.date ?? null,
  })));
}

// (id, sourate, 'ok' | 'erreur' | null) : réponse de Zakou après écoute (null = remettre « à vérifier »).
export function noterVerificationSon(id, sourate, etat) {
  if (etatVerification(id, sourate) === 'sans-objet') throw new Error('Rien à vérifier ici');
  if (![null, 'ok', 'erreur'].includes(etat)) throw new Error('État inconnu');
  const etats = lireEtats();
  if (etat === null) delete etats[`${id}:${sourate}`];
  else etats[`${id}:${sourate}`] = { etat, date: new Date().toISOString() };
  ecrire('coran.verifSons', etats);
}

// ('112:1', id?) => URL everyayah du verset.
//  - sans id : le récitateur qui joue vraiment sur cette sourate (choix de Zakou, sauf son pas encore vérifié) ;
//  - avec id : exactement ce récitateur (sert à l'écran de vérification).
export function urlAudio(cle, id = null) {
  const choisi = id ?? recitateurPourSourate(sourateDe(cle));
  return construireUrl(cle, trouverRecitateur(choisi));
}

// ({ recitateur? }) => lecteur : jouer(cles, { fois, repeteApresMoi }), boucle(cle, fois), pause(), reprendre(),
//   arreter(), vitesse('lent'|'normal'). Émet verset:debut, verset:fin, lecteur:a-toi, lecteur:fin, lecteur:erreur.
//   recitateur : forcer un récitateur (écran de vérification). Sinon : celui qui joue vraiment sur la sourate.
export function creerLecteur({ recitateur = null } = {}) {
  return fabriquerLecteur({
    urlPour: (cle) => urlAudio(cle, recitateur),
    recitateurPour: (cle) => recitateur ?? recitateurPourSourate(sourateDe(cle)),
  });
}
// ---- Petits mots fréquents (C5) ----
// Liste COMPTÉE dans le texte officiel (data/coran/frequents.json). Le texte n'est jamais modifié :
// l'appli ajoute seulement une couleur aux mots dont le squelette est dans la liste.
let formesFrequentes = null;
let infosFrequents = null;

// () => Promise<{ regle, couverture, mots: [{ forme, nombre }] }> — à appeler une fois avant estMotFrequent.
export async function chargerMotsFrequents() {
  if (!infosFrequents) {
    const r = await fetch(new URL('../../data/coran/frequents.json', import.meta.url));
    if (!r.ok) throw new Error('Liste des mots fréquents introuvable');
    infosFrequents = await r.json();
    formesFrequentes = new Set(infosFrequents.mots.map((m) => m.forme));
  }
  return infosFrequents;
}

// (texteMot) => boolean. Appeler d'abord await chargerMotsFrequents().
export function estMotFrequent(texteMot) {
  if (!formesFrequentes) throw new Error('Appeler chargerMotsFrequents() avant estMotFrequent()');
  return formesFrequentes.has(squelette(texteMot));
}

// Réglage d'affichage : colorer ou non (oui par défaut).
export const getColorerFrequents = () => lire('coran.colorerFrequents', true);
export const setColorerFrequents = (oui) => ecrire('coran.colorerFrequents', Boolean(oui));

function gelerProfond(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(gelerProfond);
  }
  return o;
}

// ---- Pour la séance guidée (C7) ----
// texteSourate(s) : le texte d'une sourate (lecture simple, mots touchables) ; ouvrirReglagesEcoute() : feuille ⚙️ ;
// getEcoute() : { fois, lent }.
export { texteSourate } from './vue.js';
export { ouvrirReglagesEcoute, getEcoute } from './reglages.js';
