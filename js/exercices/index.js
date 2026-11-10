// Propriétaire : Codex (tâche X3/X4).
import { enregistrerEcran } from '../core/routeur.js';

enregistrerEcran('exercices', {
  titre: 'Exercices',
  afficher(conteneur) {
    conteneur.innerHTML = '<p class="carte">Bientôt : Exercices.</p>';
  },
});
