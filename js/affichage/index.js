// Propriétaire : Codex (tâche X7).
import { enregistrerEcran } from '../core/routeur.js';
import { message, lienBouton } from '../core/ui.js';
import './plus.js';

enregistrerEcran('reglages', {
  titre: 'Réglages',
  onglet: 'plus', retour: '#/plus',
  afficher(conteneur) {
    conteneur.append(
      message('Pour choisir le récitateur, la vitesse ou la traduction, ouvre une sourate puis touche la roue ⚙️.'),
      lienBouton('Ouvrir le Coran', '#/coran', { gros: true }),
    );
  },
});
