// Propriétaire : Claude Code. Charge chaque module (chacun enregistre ses écrans), puis démarre.
import { demarrer } from './core/routeur.js';
import { demanderAcces } from './core/acces.js';
import { bienvenueVue } from './accueil/index.js';

import './accueil/index.js';
import './seance/index.js';
import './coran/index.js';
import './mots/index.js';
import './textes/index.js';
import './exercices/index.js';
import './enregistrement/index.js';
import './progression/index.js';
import './affichage/index.js';

// Code d'accès d'abord (une fois par téléphone), puis l'appli.
await demanderAcces();
// Première ouverture : les 3 écrans d'explication.
if (!bienvenueVue() && !location.hash.startsWith('#/bienvenue')) location.hash = '#/bienvenue';
demarrer('accueil');
