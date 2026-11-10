// Propriétaire : Claude Code. « Signaler une erreur » : le texte est mis de côté.
import { lire, ecrire } from './stockage.js';
import { emit } from './bus.js';

// type : 'coran' (id = '112:1') ou 'texte' (id = identifiant du texte dans Mes textes)
export function signaler(type, id, raison = '') {
  const liste = lire('signalements', []);
  if (!liste.some((s) => s.type === type && s.id === id)) {
    liste.push({ type, id, raison, date: new Date().toISOString() });
    ecrire('signalements', liste);
  }
  emit('texte:signale', { type, id });
}

export function estSignale(type, id) {
  return lire('signalements', []).some((s) => s.type === type && s.id === id);
}

export function getSignalements() { return lire('signalements', []); }

export function retirerSignalement(type, id) {
  ecrire('signalements', lire('signalements', []).filter((s) => !(s.type === type && s.id === id)));
}

// Bouton prêt à l'emploi, à poser sous chaque texte / verset.
export function boutonSignaler(type, id) {
  const b = document.createElement('button');
  b.className = 'secondaire';
  b.textContent = estSignale(type, id) ? 'Signalé' : 'Signaler une erreur';
  b.disabled = estSignale(type, id);
  b.addEventListener('click', () => {
    signaler(type, id);
    b.textContent = 'Signalé';
    b.disabled = true;
  });
  return b;
}
