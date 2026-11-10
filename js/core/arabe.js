// Propriétaire : Claude Code. Outils d'AFFICHAGE : renvoient toujours une copie, l'original ne change jamais.
// Aucun texte arabe écrit ici : seulement des numéros de caractères Unicode.

// Signes « voyelles » au sens large : tanwin, fatha, damma, kasra, shadda, soukoun (U+064B–U+065F),
// alif suscrit (U+0670), signes coraniques (U+06D6–U+06ED, dont soukoun uthmani U+06E1).
const VOYELLE = /[ً-ٰٟۖ-ۭ]/u;
const VOYELLES = /[ً-ٰٟۖ-ۭ]/gu;

export function estVoyelle(caractere) { return VOYELLE.test(caractere); }

export function sansVoyelles(texte) { return texte.replace(VOYELLES, ''); }

// Coupe un mot en « morceaux » : une lettre + les signes qui la suivent.
// Sert aux exercices (ex. cacher une voyelle sur deux) sans toucher à l'ordre des caractères.
export function morceaux(mot) {
  const res = [];
  for (const c of mot) {
    if (estVoyelle(c) && res.length) res[res.length - 1].signes.push(c);
    else res.push({ lettre: c, signes: [] });
  }
  return res;
}
