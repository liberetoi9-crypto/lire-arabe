// Propriétaire : Claude Code. Petit système d'événements partagé (liste des événements dans PROJET.md).
const ecouteurs = new Map();

export function on(nom, fn) {
  if (!ecouteurs.has(nom)) ecouteurs.set(nom, new Set());
  ecouteurs.get(nom).add(fn);
  return () => ecouteurs.get(nom).delete(fn); // pour se désabonner
}

export function emit(nom, donnees) {
  for (const fn of ecouteurs.get(nom) ?? []) {
    try { fn(donnees); } catch (e) { console.error(`[bus] ${nom}`, e); }
  }
}
