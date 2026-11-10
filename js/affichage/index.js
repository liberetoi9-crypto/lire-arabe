// Propriétaire : Codex (tâche X7).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('reglages', {
  titre: 'Réglages',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Réglages.</p>';
  },
});
