// Propriétaire : Claude Code (tâche C3/C4).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('coran', {
  titre: 'Coran',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Coran.</p>';
  },
});
