// Propriétaire : Claude Code (tâche C6).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('mots', {
  titre: 'Mes mots',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Mes mots.</p>';
  },
});
