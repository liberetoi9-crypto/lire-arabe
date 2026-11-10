// Propriétaire : Claude Code (C7). INTERNE au module Coran (les autres passent par api.js).
// Réglages de l'écoute + feuille ⚙️, utilisés par la lecture d'une sourate ET par la séance guidée.
import { lire, ecrire } from '../core/stockage.js';
import { emit } from '../core/bus.js';
import { ouvrirFeuille, ligneChoix } from '../core/ui.js';
import { getRecitateurs, getRecitateurActif, setRecitateurActif } from './api.js';
import { getColorerFrequents, setColorerFrequents } from './api.js';
import { getTraductions, getTraductionActive, setTraductionActive } from './api.js';

const ECOUTE_DEFAUT = { fois: 1, lent: false };
export const getEcoute = () => ({ ...ECOUTE_DEFAUT, ...lire('coran.ecoute', {}) });
export const setEcoute = (x) => ecrire('coran.ecoute', { ...getEcoute(), ...x });

// Feuille ⚙️. Chaque changement est annoncé sur le bus : 'coran:reglage' { nom, valeur }.
export async function ouvrirReglagesEcoute({ traduction = true } = {}) {
  const e = getEcoute();
  const annoncer = (nom, valeur) => emit('coran:reglage', { nom, valeur });
  const contenu = [
    ligneChoix('Récitateur', getRecitateurs().map((r) => [r.id, r.nom.replace(/^Mahmoud Khalil /, '')]), getRecitateurActif(), (v) => { setRecitateurActif(v); annoncer('recitateur', v); }),
    ligneChoix('Vitesse', [['normal', 'Normale'], ['lent', 'Lente']], e.lent ? 'lent' : 'normal', (v) => { setEcoute({ lent: v === 'lent' }); annoncer('vitesse', v); }),
    ligneChoix('Répéter chaque verset', [1, 3, 5, 10].map((x) => [String(x), x === 1 ? '1 fois' : `${x} fois`]), String(e.fois), (v) => { setEcoute({ fois: Number(v) }); annoncer('fois', Number(v)); }),
  ];
  if (traduction) {
    contenu.push(ligneChoix('Traduction', getTraductions().map((t) => [t.id, t.nom.replace('Muhammad ', '')]), getTraductionActive(), (v) => { setTraductionActive(v); annoncer('traduction', v); }));
  }
  contenu.push(ligneChoix('Petits mots en couleur', [['oui', 'Oui'], ['non', 'Non']], getColorerFrequents() ? 'oui' : 'non', (v) => {
    setColorerFrequents(v === 'oui');
    document.body.classList.toggle('sans-frequents', v !== 'oui');
  }));
  // Taille du texte : réglage de Codex (X18), affiché seulement quand il est prêt.
  try {
    const affichage = await import('../affichage/api.js');
    const taille = affichage.getTaille();
    contenu.push(ligneChoix('Taille du texte', [['petit', 'Petite'], ['normal', 'Normale'], ['grand', 'Grande']], taille, (v) => affichage.setTaille(v)));
  } catch { /* pas encore prêt */ }
  ouvrirFeuille({ titre: 'Réglages', contenu });
}
