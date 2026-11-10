// Propriétaire : Codex (tâche X6).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('progression', {
  titre: 'Progrès',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Progrès.</p>';
  },
});
