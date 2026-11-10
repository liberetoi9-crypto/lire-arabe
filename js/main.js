// Propriétaire : Claude Code. Charge chaque module (chacun enregistre ses écrans), puis démarre.
import { demarrer } from './core/routeur.js';

import './seance/index.js';
import './coran/index.js';
import './mots/index.js';
import './textes/index.js';
import './exercices/index.js';
import './enregistrement/index.js';
import './progression/index.js';
import './affichage/index.js';

demarrer('seance');
