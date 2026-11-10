// Propriétaire : Claude Code (tâche C7).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('seance', {
  titre: 'Séance du jour',
  retour: '#/accueil',
  sansMenu: true,
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">La séance guidée arrive à la prochaine étape (C7).</p>';
  },
});
