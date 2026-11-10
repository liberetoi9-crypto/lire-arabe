# TABLEAU des tâches

États : **à faire** · **en cours** · **à vérifier** · **fini**
Règle : chacun ne modifie que SES lignes. Mettre à jour à chaque tâche commencée ou finie (avec la date).

## Claude Code
| # | Tâche | État | Branche | Note |
|---|---|---|---|---|
| C1 | PROJET.md, TABLEAU.md, structure du code | fini (10/11) | main | |
| C2 | Script qui télécharge le Coran (Fatiha + Juz Amma) depuis quran.com + contrôle Tanzil → `data/coran/` | à faire | claude/donnees-coran | |
| C3 | `js/coran/api.js` : sourates, versets, contrôle des numéros | à faire | claude/api-coran | |
| C4 | Récitateurs (Husary mu'allim, Dosari) + menu + lecteur verset par verset + surlignage + « répète après moi » (Coran) | à faire | claude/recitateurs | |
| C5 | Petits mots fréquents (comptage sur le Coran complet) | à faire | claude/mots-frequents | |
| C6 | Comprendre les mots : mot à mot (anglais), Hamidullah, « Ajouter à mes mots », cartes | à faire | claude/mots | |
| C7 | Écran « Séance du jour » (assemble Coran + Mes textes) | à faire | claude/seance | dépend de X1 |
| C8 | Tests Claude (texte, audio, traductions, WebKit) | à faire | claude/tests | |
| C9 | Mise en ligne GitHub Pages | à faire | claude/mise-en-ligne | |
| C10 | Vérifier le travail de Codex | à faire | — | |

## Codex
| # | Tâche | État | Branche | Note |
|---|---|---|---|---|
| X1 | « Mes textes » : ajouter / lister / afficher, traduction FR cachée, signaler + `js/textes/api.js` | à faire | codex/mes-textes | |
| X2 | Voix iPhone pour l'arabe normal : tout le texte, un mot, lent/normal, « répète après moi » | à faire | codex/voix | |
| X3 | Lecture répétée : compteur 1/5…, chronomètre, temps gardés | à faire | codex/lecture-repetee | |
| X4 | Voyelles progressives (3 niveaux, toucher = voyelles) | à faire | codex/voyelles | utilise `estMotFrequent` (C5) |
| X5 | Enregistrement + réécoute à côté de l'audio officiel | à faire | codex/enregistrement | utilise `urlAudio` (C4) |
| X6 | Progression : calendrier, série, graphique des temps | à faire | codex/progression | |
| X7 | Affichage : clair/sombre, taille du texte | à faire | codex/affichage | |
| X8 | Tests Codex | à faire | codex/tests | |
| X9 | Vérifier le travail de Claude Code | à faire | — | |

## Demandes (quand on a besoin d'un changement chez l'autre)
| De | Pour | Demande | État |
|---|---|---|---|

## Questions pour Zakou (on s'arrête et on attend)
| Date | Qui | Question | Réponse |
|---|---|---|---|
