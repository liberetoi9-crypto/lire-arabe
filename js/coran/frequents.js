// Propriétaire : Claude Code (C5). Petits mots fréquents : outils PURS (servent au script ET à l'appli).
// Aucun mot arabe écrit ici : la liste est COMPTÉE dans le texte officiel par scripts/compter-mots-frequents.mjs.

// Règle (choix de Claude, à ajuster si Zakou veut) : les 40 formes les plus fréquentes du Coran
// parmi les mots de 3 lettres ou moins (sans compter les voyelles).
export const REGLE = Object.freeze({ nombre: 40, lettresMax: 3 });

// « Squelette » d'un mot pour le COMPTER (jamais pour l'afficher) : sans voyelles ni signes,
// sans tatweel ni espace, alif wasla compté comme alif. Renvoie une nouvelle chaîne, l'original ne change pas.
export function squelette(mot) {
  return String(mot)
    .replace(/[ً-ٰٟۖ-ۭـ\s]/gu, '')
    .replace(/ٱ/gu, 'ا');
}

// versets : [{ mots: [{ texte }] }] → [{ forme, nombre }] triés (le plus fréquent d'abord).
export function compterMots(versets) {
  const compte = new Map();
  for (const v of versets) {
    for (const m of v.mots) {
      const s = squelette(m.texte);
      compte.set(s, (compte.get(s) ?? 0) + 1);
    }
  }
  return [...compte].map(([forme, nombre]) => ({ forme, nombre }))
    .sort((a, b) => b.nombre - a.nombre || (a.forme < b.forme ? -1 : 1));
}

export function choisirPetitsMots(comptes, regle = REGLE) {
  return comptes.filter((c) => [...c.forme].length <= regle.lettresMax).slice(0, regle.nombre);
}
