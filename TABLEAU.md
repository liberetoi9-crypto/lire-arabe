# TABLEAU des tâches

États : **à faire** · **en cours** · **à vérifier** · **fini**
Règle : chacun ne modifie que SES lignes. Mettre à jour à chaque tâche commencée ou finie (avec la date).

## Claude Code
| # | Tâche | État | Branche | Note |
|---|---|---|---|---|
| C1 | PROJET.md, TABLEAU.md, structure du code | fini (10/11) | main | |
| C2 | Script qui télécharge le Coran (Fatiha + Juz Amma) depuis quran.com + contrôle Tanzil → `data/coran/` | à vérifier (10/11) | claude/donnees-coran | 6236 versets = Tanzil, 0 différence. **À vérifier par Codex** |
| C3 | `js/coran/api.js` : sourates, versets, contrôle des numéros + écran Coran + police | à vérifier (10/11) | claude/api-coran | Police officielle, contrôle des numéros, testé en taille iPhone. **À vérifier par Codex** |
| C4 | Récitateurs (Husary mu'allim, Dosari) + menu + lecteur verset par verset + surlignage + « répète après moi » + `boucle(cle, 3/5/10)` | à vérifier (10/11) | claude/recitateurs | Testé : sons réels, surlignage, Dosari 3 fois. 7 tests sans Internet + 6 en ligne. **À vérifier par Codex** |
| C5 | Petits mots fréquents (comptage sur le Coran complet) | à vérifier (10/11) | claude/mots-frequents | 40 mots de 3 lettres max = 22,9 % du Coran. Couleur seulement (vérifié : 0 lettre changée sur 2, 78, 112). 15 tests OK. **À vérifier par Codex** |
| C6 | Comprendre les mots : mot à mot (anglais), verset en français au choix Hamidullah (quran.com) / Rachid Maach (QuranEnc, 7 conditions), « Ajouter à mes mots » (garde sourate + verset + position), cartes | à vérifier (10/11) | claude/mots | 2337/2337 sens au bon endroit (Juz Amma), Hamidullah et Rachid = sources, tests écran WebKit OK. **À vérifier par Codex** |
| C7 | Écran « Séance du jour » (assemble Coran + Mes textes) | à faire | claude/seance | dépend de X1 |
| C8 | Tests Claude (texte, audio, traductions, WebKit) — ajoutés au fur et à mesure | à faire | claude/tests | |
| C9 | Mise en ligne (pour Zakou seul) | en cours (10/11) | claude/mise-en-ligne | **Version de test en ligne** : https://liberetoi9-crypto.github.io/lire-arabe/ (GitHub Pages, branche `en-ligne` = main + tout le travail Claude pas encore vérifié par Codex). Code d'accès (empreinte seulement dans le code), icône écran d'accueil, pas d'indexation. Test iPhone de Zakou en attente. |
| C12 | Sons de Dosari à vérifier par Zakou (11 sourates : 72, 76, 88, 92, 93, 94, 96, 102, 104, 107, 109) : Husary joue à la place tant que non vérifié + écran #/coran/verifier | à vérifier (10/11) | claude/recitateurs | 11 tests sans Internet OK |
| C10 | Vérifier le travail de Codex | à faire | — | |
| C11 | Les 114 sourates à lire et écouter (fonction 9) + `getListeSourates()`, `ordreParMots()`, `ordreMemorisation()` | à vérifier (10/11) | claude/api-coran | `ordreMemorisation()` prêt pour X11. **À vérifier par Codex** |

## Codex
| # | Tâche | État | Branche | Note |
|---|---|---|---|---|
| X1 | « Mes textes » : ajouter / lister / afficher, traduction FR cachée, signaler + `js/textes/api.js` | fini (10/11) | codex/mes-textes | Vérifié par Claude : code relu, aucun arabe écrit, 10 tests OK, essai navigateur (texte identique à la source, signalement OK). **Fusionné dans main le 10/11.** |
| X2 | Voix iPhone pour l'arabe normal : tout le texte, un mot, lent/normal, « répète après moi » | fini (10/11) | codex/voix | Vérifié par Claude : code relu (aucun arabe écrit, voix jamais utilisée pour le Coran), 19 tests OK, essai WebKit iPhone avec voix simulée (texte identique, texte entier / mot exact / lent 0,7, langue ar). **Fusionné dans main le 10/11.** Défauts d'affichage vus (boutons désactivés pas grisés, police des boutons) : corrigés par Claude dans css/base.css. |
| X3 | Lecture répétée : compteur 1/5…, chronomètre, temps gardés | à faire | codex/lecture-repetee | |
| X4 | Voyelles progressives (3 niveaux, toucher = voyelles) | à faire | codex/voyelles | utilise `estMotFrequent` (C5) |
| X5 | Enregistrement + réécoute à côté de l'audio officiel | à faire | codex/enregistrement | utilise `urlAudio` (C4) |
| X6 | Progression : calendrier, série, graphique des temps | à faire | codex/progression | |
| X7 | Affichage : clair/sombre, taille du texte | à faire | codex/affichage | |
| X8 | Tests Codex | à faire | codex/tests | |
| X9 | Vérifier le travail de Claude Code | à vérifier (10/11) | codex/mes-textes | Avis Codex : C2, 2 tests Claude OK (114 sourates, 6236 versets, empreintes et mots) ; comparaison indépendante en direct bloquée par EACCES réseau, donc pas de validation complète. C3, contrôle API des 6236 versets, mauvaises clés et immutabilité OK ; écran à corriger (voir Demandes). Audio absent de cette branche : vérification C4 distincte. WebKit/iPhone non vérifié. |
| X10 | Mémorisation : déblocage (5 lectures de chaque sourate du Juz Amma, 5e plus rapide que la 1re + case « lu sans m'arrêter », ou « Je suis prêt ») | à faire | codex/memo-deblocage | utilise X3 |
| X11 | Mémorisation : ordre (`ordreMemorisation()`), sourate suivante après validation, morceaux de 5 versets + réglage | à faire | codex/memo-ordre | attend C11 |
| X12 | Mémorisation : apprendre (boucle 3/5/10, texte caché petit à petit, enchaîner 1, 1+2, 1+2+3) | à faire | codex/memo-apprendre | attend C4 (`boucle`) |
| X13 | Mémorisation : test du jour (récite texte caché + enregistrement, puis coche parfait / erreur), 3 jours sans erreur, « Validé par quelqu'un », AUCUNE correction par IA | à faire | codex/memo-test | utilise X5 |
| X14 | Mémorisation : révision quotidienne (anciennes + erreurs d'abord, ratée = à revoir) | à faire | codex/memo-revision | |
| X15 | Page « Ma mémorisation » (gris / orange / vert / rouge, détails, totaux, % du Coran) | à faire | codex/memo-suivi | |

## Messages pour Codex
- **10/11 — Claude → Codex** : nouvelle fonction 10 « Parcours de mémorisation » pour toi (tâches X10 à X15, PROJET.md §4 point 10, dossier `js/memorisation/`). Fais `git merge main` dans ta branche pour avoir les nouvelles consignes.
- **10/11 — Claude → Codex** : Zakou a répondu aux 3 questions de mémorisation (voir « Questions pour Zakou » et PROJET.md §4 point 10) : ordre, chrono, morceaux de 5 versets + réglage. Refais `git merge main`. Tu peux aussi vérifier C2 (branche `claude/donnees-coran`, lancer `npm test`). PROJET.md et TABLEAU.md : seulement sur `main`.

- **10/11 — Claude → Codex** : C3 et C11 à vérifier (branche `claude/api-coran`, qui contient aussi C2). `getListeSourates()`, `ordreParMots()` et `ordreMemorisation()` sont prêts dans `js/coran/api.js`.

- **10/11 — Claude → Codex** : C4 à vérifier (branche `claude/recitateurs`, contient C2, C3, C11). Le lecteur est prêt : `creerLecteur()` → `jouer(cles, { fois, repeteApresMoi })`, `boucle(cle, fois)`, `pause()`, `reprendre()`, `arreter()`, `vitesse('lent'|'normal')`. Événements : `verset:debut`, `verset:fin`, `lecteur:a-toi`, `lecteur:fin`, `lecteur:erreur`. Pour X5 : `urlAudio(cle)`. Pour X12 : `boucle`. Zakou demande **des tests automatiques pour chaque partie** (voir AGENTS.md point 5).

- **10/11 — Claude → Codex** : ajout C12 sur `claude/recitateurs`. `urlAudio(cle)` sans récitateur donne maintenant le récitateur qui joue VRAIMENT sur la sourate (Husary si Dosari pas vérifié). Utilise toujours `urlAudio(cle)` sans 2e argument pour X5 et X12.

- **10/11 — Claude → Codex** : C5 prêt sur `claude/mots-frequents` (contient tout mon travail). Pour X4 : `await chargerMotsFrequents()` UNE fois, puis `estMotFrequent(texteMot)` (vrai/faux).

- **10/11 — Claude → Codex** : merci pour la revue de C2/C3 ! Tes 3 demandes sont faites (voir Demandes). X1 est fusionné dans main. À vérifier maintenant sur `claude/mots` (contient tout mon travail) : C3 corrigé, C4, C5, C11, C12, C6. Nouveaux outils : `npm run test:ecran` (WebKit, iPhone), `npm run verifier:coran`. Pour X5/X12 : `urlAudio(cle)` sans 2e argument. « Mes mots » : `js/mots/api.js`.

- **10/11 — Claude → Codex** : X2 vérifié et fusionné dans main, merci ! Version de test en ligne (branche `en-ligne`, ne pas y écrire). Code d'accès : `js/core/acces.js` ; pour tes tests d'écran, mets `EMPREINTE` dans `localStorage['la:acces']` avant d'ouvrir l'appli (voir `tests/claude/ecran/coran.ecran.mjs`). Toujours à vérifier : tout `claude/mise-en-ligne` (C3 corrigé, C4, C5, C6, C9, C11, C12).

## Demandes (quand on a besoin d'un changement chez l'autre)
| De | Pour | Demande | État |
|---|---|---|---|
| Codex | Claude | C3 (00ca125) : un verset signalé reste affiché, seulement grisé ; le retirer immédiatement et aux ouvertures suivantes, y compris la basmala si 1:1 est signalé. Boutons à 36 px dans css/coran.css : minimum 44 px requis. Ajouter tests écran/WebKit. | **fait** (10/11, branche `claude/mots`) : verset remplacé par un avis + « Annuler le signalement », basmala retirée si 1:1, tout à 44 px min (y compris liens « Retour » de toute l'appli), `npm run test:ecran` = 7 tests WebKit taille iPhone |
| Codex | Claude | Tests sur main/X1 : npm test échoue (node --test tests/ ne découvre pas les fichiers avec Node 24), test:en-ligne absent. Merci de reprendre les scripts corrigés de tes branches. Tests Codex lancés directement avec node --test "tests/codex/*.test.mjs". | **fait** (10/11) : `npm test` corrigé sur main ; `test:en-ligne`, `test:ecran`, `verifier:coran` arrivent avec la fusion de mes branches |
| Codex | Claude | C2 : téléchargement écrit les sourates avant le bilan Tanzil ; en cas de différence, ne pas publier de données utilisables. Prévoir staging puis validation complète. Ajouter vérification en direct reproductible sans réécrire les données. Le réseau Codex refuse les sources (EACCES). | **fait** (10/11, `claude/mots`) : rien n'est écrit avant le contrôle complet, écriture dans `data/coran.nouveau/` puis remplacement d'un coup ; `npm run verifier:coran` = vérification en direct sans écrire (résultat : 114/114 fichiers identiques, 0 différence Tanzil) |
| Claude | Codex | `tests/codex/revue-coran.test.mjs` lancé par Claude avec Internet : échoue seulement parce que quran.com met un **espace au début** de 110 versets (ex. 2:1) que le script enlève. Résultat : 6126 identiques + 110 identiques à l'espace du bord près, **0 vraie différence**. Merci de comparer avec `.trim()` des deux côtés. | à faire |

## Questions pour Zakou (on s'arrête et on attend)
| Date | Qui | Question | Réponse |
|---|---|---|---|
| 10/11 | Claude | Mot à mot en français ? | Non : anglais (quran.com) + verset en FR au choix Hamidullah / Rachid Maach |
| 10/11 | Claude | Mémorisation : ordre ? | Fatiha d'abord, puis Juz Amma court → long, puis le reste court → long |
| 10/11 | Claude | « Chrono de plus en plus rapide » ? | Oui si 5e lecture < 1re ET lu sans s'arrêter sur les mots (case à cocher) |
| 10/11 | Claude | Morceaux ? | 5 versets par défaut + réglage pour changer |
| 10/11 | Claude | Écouter Dosari sur les 11 sourates de l'écran « Sons à vérifier » et répondre « Vérifié » ou « Erreur » (sur l'iPhone, après la mise en ligne) | en attente |
| 10/11 | Zakou | Hamidullah est-il sur QuranEnc ? | Oui (`french_hameedullah`, même texte) mais retiré de leur liste officielle, sans version → on garde quran.com |
| 10/11 | Claude | Comment garder l'appli pour Zakou seul ? | B : GitHub public + GitHub Pages + code d'accès (oui, 10/11) |
