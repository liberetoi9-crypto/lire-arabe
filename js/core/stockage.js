// Propriétaire : Claude Code. Tout passe par ici (jamais localStorage en direct).
// Clés préfixées par module : 'coran.', 'mots.', 'textes.', 'progression.', etc.
const PREFIXE = 'la:';

export function lire(cle, parDefaut = null) {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    return brut === null ? parDefaut : JSON.parse(brut);
  } catch {
    return parDefaut;
  }
}

export function ecrire(cle, valeur) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    return true;
  } catch (e) {
    console.error('[stockage] écriture impossible', cle, e);
    return false;
  }
}

export function effacer(cle) {
  try { localStorage.removeItem(PREFIXE + cle); } catch { /* rien */ }
}
