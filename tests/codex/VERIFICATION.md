# Vérification complète — 10 novembre 2026

L'application n'est pas encore entièrement terminée ni entièrement validée.
Cette vérification porte sur les parties présentes, sans fusion dans main.

## Versions contrôlées

- Claude : copie isolée de `claude/mise-en-ligne`, commit `23825b5`.
- Codex : X1 et X2 fusionnés par Claude, X3 sur `codex/lecture-repetee`.
- Revue et nouveaux contrôles : `codex/verification-complete`.
- Site public : l'écran d'accès apparaît et la page porte `noindex, nofollow`.

## Résultats par partie

| Partie | Résultat | Ce qui reste |
|---|---|---|
| C1 — structure | Relue ; modules, API et propriétaires respectés dans cette revue | Aucune modification des fichiers Claude |
| C2 — texte du Coran | 114 sourates, 6236 versets, empreintes et mots contrôlés localement | Comparaison indépendante en direct non validée ici |
| C3 — écran Coran | Texte identique aux fichiers, RTL, police, boutons de 44 px et retrait du texte signalé : tests WebKit réussis | La lecture audio complète inclut encore les versets signalés : voir C4 |
| C4 — lecteur | Deux récitateurs autorisés, Hafs, 12472 adresses construites, boucles 3/5/10 contrôlées | Trois défauts à corriger, ci-dessous ; contenu réel des sons non certifié ici |
| C5 — mots fréquents | Comptage refait depuis le texte complet ; couleur sans changement des caractères | Aucun défaut trouvé dans ces contrôles |
| C6 — sens et traductions | Logique des cartes et notes contrôlée ; identité sourate/verset/position gardée | Source absente près du sens dans les listes/cartes ; traduction à l'écran non chargée pendant notre essai ; égalité en direct non validée |
| C9 — accès et publication | Écran du code et refus d'un faux code testés ; manifeste, chemins relatifs et tailles des icônes contrôlés | Essai final sur le vrai iPhone de Zakou |
| C11 — ordres des sourates | Recalcul indépendant : 114 sourates, Fatiha, Juz Amma puis reste, tri par nombre de mots | Aucun défaut trouvé dans ces contrôles |
| C12 — remplacement Dosari | Les 11 sourates restent sur Husary tant qu'elles ne sont pas confirmées ; transitions OK/erreur/à vérifier testées en stockage isolé | Écoute humaine de Zakou toujours en attente ; aucune validation réelle enregistrée par Codex |
| X1 — Mes textes | Tests de stockage et 13 contrôles d'écran réussis aussi dans WebKit iPhone | Rien trouvé dans ce périmètre |
| X2 — voix | Tests de logique et 15 contrôles d'écran réussis dans WebKit avec voix simulée | Voix réellement prononcée sur l'iPhone à écouter |
| X3 — lecture répétée | 8 tests de logique et 3 parcours WebKit réussis, y compris vrais fichiers du Coran | Relecture et fusion par Claude ; pas encore dans la version publiée contrôlée |

## Défauts encore présents chez Claude

1. `urlAudio('112:286')` est accepté alors que ce verset n'existe pas.
2. Après une pause de répétition, une nouvelle lecture puis pause/reprise peut remettre le son à 0 s. Reproduction : temps simulé de 2 s, résultat 0 s.
3. Le bouton « Écouter la sourate » construit sa file avec tous les versets, même les versets signalés et cachés.
4. « Mes mots » et les cartes montrent le sens enregistré sans afficher sa source `m.source` à côté.

Les deux premières reproductions sont dans `anomalies-claude.mjs`.
Ces quatre demandes restent dans TABLEAU.md. Les fichiers de Claude n'ont pas été corrigés par Codex.

## Parties encore à réaliser

- C7 : séance du jour ; écran « Bientôt ».
- X4 : voyelles progressives ; fonction encore provisoire.
- X5 : enregistrement ; fonction encore provisoire.
- X6 : progression ; écran et fonctions encore provisoires.
- X7 : clair/sombre et taille ; écran et fonction encore provisoires.
- X10 à X15 : mémorisation ; non réalisée, module non branché dans le démarrage contrôlé.
- C8, X8 et C10 : tâches de tests/relecture à poursuivre ; des tests existent déjà mais cela ne signifie pas que toutes les fonctionnalités sont réalisées.

## Exécutions et limites

- Copie Claude, `npm test` : **40 réussis, 2 ignorés**, aucun échec.
- Copie Claude, `npm run test:ecran` : **7 réussis sur 8**. Seul échec : attente de la traduction du verset 112:1, délai de 30 secondes dépassé.
- Branche Codex avec `CORAN_REVUE`, y compris le nouveau test C9 : **31 réussis, 1 ignoré**, aucun échec. Le contrôle ignoré est la comparaison en direct des sources.
- `lecture-repetee.ecran.mjs` étendu : **5 tests réussis**. Les deux derniers lancent les 13 contrôles X1 et les 15 contrôles X2 dans deux contextes WebKit iPhone vides, en plus des 3 parcours X3.
- Vérifications en ligne Node : blocage `EACCES` vers quran.com, Tanzil et everyayah lors des tentatives de cette session et de la revue précédente. Les erreurs en ligne ne prouvent pas une différence des sources.
- Dans le navigateur connecté, l'API quran.com a répondu HTTP 200 avec 6236 versets. Cela confirme son accessibilité depuis ce navigateur, **pas** l'égalité de tout le texte. Les tentatives plus longues ont perdu leur onglet (`Target closed`) ; aucune comparaison complète en direct n'est annoncée comme réussie.

Le test de comparaison utilise désormais `.trim()` des deux côtés, selon la demande de Claude : seuls les espaces aux bords sont ignorés. Les espaces intérieurs, lettres et voyelles restent comparés exactement. Aucun fichier de texte source n'est réécrit.

Le code d'accès est le petit cadenas côté navigateur déjà accepté dans le projet public. Cette vérification ne le transforme pas en protection serveur.
