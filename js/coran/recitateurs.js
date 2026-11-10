// Propriétaire : Claude Code (C4). INTERNE : les autres modules passent par api.js.
// LISTE FERMÉE : aucun récitateur ajouté sans l'accord de Zakou (PROJET.md §3). Pas de Mishary Al-Afasy.
// Sons : everyayah.com, un fichier par verset. Tout en Hafs.

import { NB_VERSETS } from './nb-versets.js';

export const RIWAYAT = Object.freeze({
  hafs: Object.freeze({ nom: 'Hafs', actif: true }),
  warsh: Object.freeze({ nom: 'Warsh', actif: false }), // prévu pour plus tard, ÉTEINT
});

// Riwaya du texte affiché (texte quran.com uthmani = Hafs). Un son ne joue que si sa riwaya = celle du texte.
export const RIWAYA_TEXTE = 'hafs';

export const RECITATEURS = Object.freeze([
  Object.freeze({
    id: 'husary_muallim',
    nom: "Mahmoud Khalil Al-Husary (mu'allim)",
    riwaya: 'hafs',
    dossier: 'Husary_Muallim_128kbps', // everyayah « Husary (Muallim) »
    quranComId: 12,                    // même enregistrement sur quran.com (sert aux tests)
    principal: true,
  }),
  Object.freeze({
    id: 'dosari',
    nom: 'Yasser Al-Dosari',
    riwaya: 'hafs',
    dossier: 'Yasser_Ad-Dussary_128kbps', // everyayah « Yasser_Ad-Dussary »
    quranComId: null,
    principal: false,
  }),
]);

export const BASE_AUDIO = 'https://everyayah.com/data/';

// Récitateurs utilisables avec le texte affiché (même riwaya, riwaya allumée).
export function recitateursDisponibles() {
  return RECITATEURS.filter((r) => r.riwaya === RIWAYA_TEXTE && RIWAYAT[r.riwaya]?.actif);
}

export function trouverRecitateur(id) {
  const r = recitateursDisponibles().find((x) => x.id === id);
  if (!r) throw new Error(`Récitateur non autorisé : ${id}`);
  return r;
}

// '112:1' → https://everyayah.com/data/<dossier>/112001.mp3
export function construireUrl(cle, recitateur) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(String(cle));
  if (!m) throw new Error(`Clé de verset invalide : ${cle}`);
  const s = Number(m[1]);
  const v = Number(m[2]);
  // Le verset doit exister vraiment (ex. 112:5 n'existe pas : Al-Ikhlas a 4 versets).
  if (s < 1 || s > 114 || v < 1 || v > NB_VERSETS[s - 1]) throw new Error(`Verset inexistant : ${cle}`);
  if (recitateur.riwaya !== RIWAYA_TEXTE) throw new Error('Riwaya du son différente du texte : refusé');
  return `${BASE_AUDIO}${recitateur.dossier}/${String(s).padStart(3, '0')}${String(v).padStart(3, '0')}.mp3`;
}

// ---- Sons à vérifier à l'oreille par Zakou (10/11) ----
// Sourates où les tests automatiques ne peuvent pas prouver que chaque son de Dosari est le bon verset
// (versets de longueur trop égale, ou preuve faible : 93). Tant que Zakou n'a pas dit « Vérifié, c'est bon »,
// c'est Husary qui joue à la place sur ces sourates.
export const SOURATES_A_VERIFIER = Object.freeze({
  dosari: Object.freeze([72, 76, 88, 92, 93, 94, 96, 102, 104, 107, 109]),
});

// etats : { 'dosari:93': { etat: 'ok' | 'erreur', date } }
export function etatVerification(id, sourate, etats = {}) {
  if (!SOURATES_A_VERIFIER[id]?.includes(sourate)) return 'sans-objet';
  return etats[`${id}:${sourate}`]?.etat ?? 'a-verifier';
}

// Récitateur qui joue VRAIMENT pour cette sourate : le choisi, sauf s'il n'est pas confirmé ici → le principal.
export function recitateurEffectif(idChoisi, sourate, etats = {}) {
  const e = etatVerification(idChoisi, sourate, etats);
  if (e === 'sans-objet' || e === 'ok') return idChoisi;
  return RECITATEURS.find((r) => r.principal).id;
}
