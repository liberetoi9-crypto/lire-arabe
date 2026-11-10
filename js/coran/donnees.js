// Propriétaire : Claude Code (C3). INTERNE au module Coran : les autres passent par api.js.
// Lit les fichiers data/coran/ (texte officiel quran.com, contrôlé avec Tanzil) et VÉRIFIE les numéros.
const BASE = new URL('../../data/coran/', import.meta.url);
const cache = new Map();
let manifeste = null;

export async function getManifeste() {
  if (!manifeste) {
    const r = await fetch(new URL('manifeste.json', BASE));
    if (!r.ok) throw new Error('Données du Coran introuvables');
    manifeste = await r.json();
  }
  return manifeste;
}

export async function chargerSourate(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1 || n > 114) throw new Error(`Sourate ${n} inexistante`);
  if (cache.has(n)) return cache.get(n);
  const r = await fetch(new URL(`sourates/${String(n).padStart(3, '0')}.json`, BASE));
  if (!r.ok) throw new Error(`Sourate ${n} introuvable`);
  const d = await r.json();
  verifierSourate(d, n);
  cache.set(n, d);
  return d;
}

// Contrôle automatique « zéro erreur » : le fichier doit être celui demandé, versets dans l'ordre.
export function verifierSourate(d, n) {
  if (d.numero !== n) throw new Error(`Contrôle : fichier de la sourate ${d.numero} reçu au lieu de ${n}`);
  if (d.versets.length !== d.nbVersets) throw new Error(`Contrôle : sourate ${n} incomplète`);
  d.versets.forEach((v, i) => {
    const attendu = `${n}:${i + 1}`;
    if (v.cle !== attendu || v.sourate !== n || v.verset !== i + 1) {
      throw new Error(`Contrôle : verset ${v.cle} trouvé à la place de ${attendu}`);
    }
  });
}
