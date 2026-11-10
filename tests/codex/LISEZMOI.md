Tests de Codex — X1 et revue C2/C3.

Sans dépendance ni Internet : `node --test "tests/codex/*.test.mjs"`.

`textes.test.mjs` vérifie l'ajout, la conservation des caractères, les sources,
le stockage, les signalements et les erreurs de sauvegarde. Le test arabe lit
uniquement `data/coran/sourates/001.json` ; il est ignoré si C2 n'est pas présent.

Pour relire une copie isolée de la branche Claude, définir `CORAN_REVUE` avec
son chemin, puis lancer la même commande. Cela active aussi le contrôle API C3
sur les 6236 versets et fournit la source arabe au test X1.
Avec `SOURCES_EN_LIGNE=1`, le test C2 compare en plus les 6236 versets aux deux
sources officielles en direct, sans réécrire les données. Un refus du réseau
fait échouer ce contrôle : ce n'est pas une validation des sources.

Dans un navigateur sur un serveur local, importer
`/tests/codex/verifier-ecran-textes.js` puis appeler `verifierEcranTextes(arabe)`
avec du texte lu dans les fichiers officiels. Utiliser un contexte de test vide
et une largeur de 390 px. Le test ajoute puis signale un texte dans ce contexte.
Il vérifie 13 points : formulaire, navigation, texte exact, HTML inactif,
RTL/langue, traduction cachée et bouton, taille des boutons, absence de
débordement, retrait immédiat et exclusion de la liste/du texte du jour.
Ce contrôle Chrome ne remplace pas Safari/WebKit ou l'iPhone de Zakou.

Sur main au début de X1, `npm test` ne découvre pas les tests sous Node 24
et `npm run test:en-ligne` n'existe pas. Correction demandée à Claude dans TABLEAU.md.
