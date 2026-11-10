// Propriétaire : Claude Code (C6). Logique PURE de « Mes mots » (testable sans navigateur).
// Un mot garde sa sourate, son verset et sa position : on peut toujours le revoir dans son verset.
// Le texte arabe n'est PAS recopié : l'écran le relit dans le texte officiel avec cle + position.

// Révision en cartes, méthode des boîtes : bien su → boîte suivante (on le revoit plus tard) ; pas su → boîte 1.
export const JOURS_PAR_BOITE = Object.freeze([0, 0, 1, 3, 7, 15]); // boîte 1 = aujourd'hui, boîte 5 = dans 15 jours

export const idMot = (cle, position) => `${cle}#${position}`;

const jour = (date) => new Date(date).toISOString().slice(0, 10);
function plusJours(date, n) {
  const d = new Date(`${jour(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return jour(d);
}

// mot : { cle: '112:1', position: 1, sens, langue, source } → nouvelle liste (l'ancienne n'est pas modifiée).
export function ajouter(liste, mot, maintenant = new Date()) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(mot.cle ?? '');
  if (!m || !Number.isInteger(mot.position) || mot.position < 1) throw new Error('Mot invalide');
  const id = idMot(mot.cle, mot.position);
  if (liste.some((x) => x.id === id)) return liste;
  return [...liste, {
    id,
    cle: mot.cle,
    sourate: Number(m[1]),
    verset: Number(m[2]),
    position: mot.position,
    sens: mot.sens ?? null,
    langue: mot.langue ?? null,
    source: mot.source ?? null,
    ajoute: jour(maintenant),
    boite: 1,
    prochaine: jour(maintenant),
  }];
}

export const retirer = (liste, id) => liste.filter((x) => x.id !== id);

export const aReviser = (liste, maintenant = new Date()) => liste.filter((x) => x.prochaine <= jour(maintenant));

export function noterRevision(liste, id, savait, maintenant = new Date()) {
  return liste.map((x) => {
    if (x.id !== id) return x;
    const boite = savait ? Math.min(x.boite + 1, 5) : 1;
    return { ...x, boite, prochaine: plusJours(maintenant, JOURS_PAR_BOITE[boite]), revu: jour(maintenant) };
  });
}
