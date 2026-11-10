// X16 : la page affiche aussi les entrées enregistrées par les modules Claude.
import { enregistrerEcran } from '../core/routeur.js';
import { enregistrerEntreePlus, getEntreesPlus, lignePlus } from '../core/ui.js';

enregistrerEntreePlus({ id: 'progression', icone: 'progression', titre: 'Ma progression', sousTitre: 'Bientôt disponible', adresse: '#/progression', ordre: 20 });
enregistrerEntreePlus({ id: 'memorisation', icone: 'memorisation', titre: 'Mémorisation', sousTitre: 'Après la phase lecture', adresse: '#/memorisation', verrouille: () => true, ordre: 30 });
enregistrerEntreePlus({ id: 'reglages', icone: 'reglages', titre: 'Réglages', adresse: '#/reglages', ordre: 80 });

enregistrerEcran('plus', {
  titre: 'Plus', onglet: 'plus',
  afficher(conteneur) { conteneur.replaceChildren(...getEntreesPlus().map(lignePlus)); },
});
