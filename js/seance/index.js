// Propriétaire : Claude Code (tâche C7).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('seance', {
  titre: 'Séance du jour',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Séance du jour.</p>';
  },
});
