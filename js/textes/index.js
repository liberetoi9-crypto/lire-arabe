// Propriétaire : Codex (tâche X1).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('textes', {
  titre: 'Mes textes',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Mes textes.</p>';
  },
});
