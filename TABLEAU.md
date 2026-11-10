# TABLEAU des tâches

États : **à faire** · **en cours** · **à vérifier** · **fini**
Règle : chacun ne modifie que SES lignes. Mettre à jour à chaque tâche commencée ou finie (avec la date).

## Claude Code
| # | Tâche | État | Branche | Note |
|---|---|---|---|---|
| C1 | PROJET.md, TABLEAU.md, structure du code | fini (10/11) | main | |
| C2 | Script qui télécharge le Coran (Fatiha + Juz Amma) depuis quran.com + contrôle Tanzil → `data/coran/` | à vérifier (10/11) | claude/donnees-coran | 6236 versets = Tanzil, 0 différence. **À vérifier par Codex** |
| C3 | `js/coran/api.js` : sourates, versets, contrôle des numéros + écran Coran + police | en cours (10/11) | claude/api-coran | |
| C4 | Récitateurs (Husary mu'allim, Dosari) + menu + lecteur verset par verset + surlignage + « répète après moi » + `boucle(cle, 3/5/10)` | à faire | claude/recitateurs | |
| C5 | Petits mots fréquents (comptage sur le Coran complet) | à faire | claude/mots-frequents | |
| C6 | Comprendre les mots : mot à mot (anglais), verset en français au choix Hamidullah (quran.com) / Rachid Maach (QuranEnc, 7 conditions), « Ajouter à mes mots », cartes | à faire | claude/mots | |
| C7 | Écran « Séance du jour » (assemble Coran + Mes textes) | à faire | claude/seance | dépend de X1 |
| C8 | Tests Claude (texte, audio, traductions, WebKit) | à faire | claude/tests | |
| C9 | Mise en ligne (pour Zakou seul) | à faire | claude/mise-en-ligne | |
| C10 | Vérifier le travail de Codex | à faire | — | |
| C11 | Les 114 sourates à lire et écouter (fonction 9) + `getListeSourates()`, `ordreParMots()`, `ordreMemorisation()` | en cours (10/11) | claude/api-coran | |

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
| X9 | Vérifier le travail de Claude Code | à faire | — | **C2 à vérifier dès maintenant** |
| X10 | Mémorisation : déblocage (5 lectures de chaque sourate du Juz Amma, 5e plus rapide que la 1re + case « lu sans m'arrêter », ou « Je suis prêt ») | à faire | codex/memo-deblocage | utilise X3 |
| X11 | Mémorisation : ordre (`ordreMemorisation()`), sourate suivante après validation, morceaux de 5 versets + réglage | à faire | codex/memo-ordre | attend C11 |
| X12 | Mémorisation : apprendre (boucle 3/5/10, texte caché petit à petit, enchaîner 1, 1+2, 1+2+3) | à faire | codex/memo-apprendre | attend C4 (`boucle`) |
| X13 | Mémorisation : test du jour (récite texte caché + enregistrement, puis coche parfait / erreur), 3 jours sans erreur, « Validé par quelqu'un », AUCUNE correction par IA | à faire | codex/memo-test | utilise X5 |
| X14 | Mémorisation : révision quotidienne (anciennes + erreurs d'abord, ratée = à revoir) | à faire | codex/memo-revision | |
| X15 | Page « Ma mémorisation » (gris / orange / vert / rouge, détails, totaux, % du Coran) | à faire | codex/memo-suivi | |

## Messages pour Codex
- **10/11 — Claude → Codex** : nouvelle fonction 10 « Parcours de mémorisation » pour toi (tâches X10 à X15, PROJET.md §4 point 10, dossier `js/memorisation/`). Fais `git merge main` dans ta branche pour avoir les nouvelles consignes.
- **10/11 — Claude → Codex** : Zakou a répondu aux 3 questions de mémorisation (voir « Questions pour Zakou » et PROJET.md §4 point 10) : ordre, chrono, morceaux de 5 versets + réglage. Refais `git merge main`. Tu peux aussi vérifier C2 (branche `claude/donnees-coran`, lancer `npm test`). PROJET.md et TABLEAU.md : seulement sur `main`.

## Demandes (quand on a besoin d'un changement chez l'autre)
| De | Pour | Demande | État |
|---|---|---|---|

## Questions pour Zakou (on s'arrête et on attend)
| Date | Qui | Question | Réponse |
|---|---|---|---|
| 10/11 | Claude | Mot à mot en français ? | Non : anglais (quran.com) + verset en FR au choix Hamidullah / Rachid Maach |
| 10/11 | Claude | Mémorisation : ordre ? | Fatiha d'abord, puis Juz Amma court → long, puis le reste court → long |
| 10/11 | Claude | « Chrono de plus en plus rapide » ? | Oui si 5e lecture < 1re ET lu sans s'arrêter sur les mots (case à cocher) |
| 10/11 | Claude | Morceaux ? | 5 versets par défaut + réglage pour changer |
| 10/11 | Zakou | Hamidullah est-il sur QuranEnc ? | Oui (`french_hameedullah`, même texte) mais retiré de leur liste officielle, sans version → on garde quran.com |
| 10/11 | Claude | Comment garder l'appli pour Zakou seul ? | B : GitHub public + GitHub Pages + code d'accès (oui, 10/11) |
