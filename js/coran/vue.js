// Propriétaire : Claude Code (C7). INTERNE au module Coran (les autres passent par api.js).
// Texte d'une sourate en lecture simple (séance guidée) : mots touchables (sens), petits mots en couleur,
// versets signalés remplacés par un avis. Le texte vient TOUJOURS des fichiers officiels.
import { emit } from '../core/bus.js';
import { el } from '../core/ui.js';
import { estSignale } from '../core/signalement.js';
import { getVerset, chargerMotsFrequents, estMotFrequent, getColorerFrequents } from './api.js';

const chiffres = (n) => n.toLocaleString('ar-EG'); // chiffres arabes générés par le navigateur

// (sourate) => Promise<élément> ; contrôle automatique : chaque verset doit être à sa place.
export async function texteSourate(s) {
  await chargerMotsFrequents();
  document.body.classList.toggle('sans-frequents', !getColorerFrequents());
  const zone = el('div', { className: 'texte-sourate' });
  if (s.numero !== 1 && s.numero !== 9 && !estSignale('coran', '1:1')) {
    zone.append(el('p', { className: 'arabe coran basmala', lang: 'ar', dir: 'rtl', textContent: (await getVerset('1:1')).texte, 'data-cle-source': '1:1' }));
  }
  for (const v of s.versets) {
    if (v.cle !== `${s.numero}:${v.verset}`) throw new Error(`Contrôle : verset ${v.cle} au mauvais endroit`);
    if (estSignale('coran', v.cle)) {
      zone.append(el('p', { className: 'avis-mis-de-cote', 'data-cle': v.cle, textContent: `Verset ${v.verset} mis de côté : tu as signalé une erreur.` }));
      continue;
    }
    const ligne = el('p', { className: 'arabe coran verset', lang: 'ar', dir: 'rtl', 'data-cle': v.cle });
    let dernier = null;
    v.mots.forEach((m, i) => {
      const mot = el('span', { className: estMotFrequent(m.texte) ? 'mot frequent' : 'mot', textContent: m.texte, 'data-position': m.position });
      mot.addEventListener('click', () => emit('mot:touche', { source: 'coran', cle: v.cle, position: m.position, texte: m.texte }));
      if (i < v.mots.length - 1) ligne.append(mot, ' ');
      else dernier = mot;
    });
    // Le dernier mot et le numéro restent ensemble (le numéro n'est jamais seul sur une ligne).
    ligne.append(el('span', { className: 'fin-verset' }, dernier, ' ', el('span', { className: 'num-verset passif', textContent: chiffres(v.verset) })));
    zone.append(el('div', { className: 'bloc-verset', 'data-cle': v.cle }, ligne));
  }
  return zone;
}
