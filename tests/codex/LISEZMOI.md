Tests de Codex — X1, X2 et revue C2/C3.

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

X2 : `voix.test.mjs` ajoute 9 tests avec une synthèse simulée (aucun son).
Ils contrôlent le texte exact, la sélection exclusive d'une voix `ar`, les voix
chargées tardivement, les mots, la vitesse, la pause entre phrases, l'arrêt,
les anciens événements, les signalements et les erreurs. Une clé Coran est refusée.

Dans un contexte navigateur de test vide, importer
`/tests/codex/verifier-ecran-voix.js` et appeler `verifierEcranVoix()`.
La fonction remplace temporairement la synthèse par une simulation et la restaure
à la fin. Elle ajoute des données françaises de test, sans arabe ni traduction.
15 contrôles effectués, également dans une fenêtre de document de 390 px :
boutons, mots, vitesse, répétition avec pause, arrêt, voix indisponible,
signalement, navigation, texte intact et absence de débordement.

L'écoute réelle et le fonctionnement Safari/iPhone restent à vérifier.
Le démarrage est directement déclenché par le toucher, sans timer :
[restriction de geste utilisateur dans WebKit](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/SpeechSynthesis.cpp).
La liste des voix est relue sur `voiceschanged`, sans déclencher de parole :
[documentation de SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).
