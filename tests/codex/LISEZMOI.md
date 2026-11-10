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

Revue du 10/11 : `revue-complements.test.mjs` utilise seulement les API publiques
pour contrôler les 12472 adresses audio, les ordres des sourates, les comptes de
mots, le texte inchangé, les boucles 3/5/10 et le remplacement de Dosari.
Définir `CORAN_REVUE` comme indiqué plus haut. Les deux comparaisons aux sources
de `revue-coran.test.mjs` utilisent `trim()` des deux côtés ; les espaces
intérieurs, lettres et voyelles restent comparés exactement. Aucun fichier source
n'est réécrit. `node tests/codex/anomalies-claude.mjs` reproduit les réserves C4
notées dans TABLEAU.md (clé inexistante acceptée et ancienne pause de répétition).

X3 : `lecture-repetee.test.mjs` ajoute 8 tests du compteur, du chronomètre,
des pauses, des 5 lectures, des sauvegardes, des annulations et des échecs de stockage.
Les données restent dans `exercices.lectures`, via le stockage partagé.
API : `lectureRepetee(conteneur, { id, objectif: 5 })` renvoie
`{ detruire, lecteur }` ; appeler `detruire()` si le composant est retiré.
`getLectures(id?)` expose des copies `{ id, cle, secondes, date, sansArret }`.
Identifiants utilisés : `coran:<numéro de sourate>` ou `texte:<id du texte>`.
L'ordre des enregistrements permet à X10 de comparer les lectures 1 et 5,
avec `sansArret` de la 5e. X3 ne débloque rien lui-même.

Tests WebKit iPhone : `node --test tests/codex/lecture-repetee.ecran.mjs`.
Playwright doit être installé ; sinon, définir `PLAYWRIGHT_ROOT` avec le chemin
d'une installation existante de ce module. `CORAN_REVUE` permet d'assembler le
serveur de test avec les dossiers Coran/mots/data de Claude, sans les modifier.
Cinq tests : cinq lectures avec pause et rechargement, texte personnel et
signalement, vrais versets officiels et mise en page de 390 px, puis les 13
contrôles X1 et les 15 contrôles X2 dans des contextes WebKit vides.
`CAPTURE_X3` permet de sauvegarder une capture d'écran dans le fichier indiqué.

`deploiement.test.mjs` contrôle les ressources C9 de la copie `CORAN_REVUE`.
Le résultat détaillé de la vérification complète est dans `VERIFICATION.md`.

X16 : `mise-en-page.ecran.mjs` vérifie les six entrées de Plus (dont celles de
Claude), le verrou de mémorisation, l'onglet actif, les tailles touchables,
l'ajout intact d'un texte, une seule action principale et la vitesse dans la
feuille ⚙️. Le serveur et les contextes isolés utilisent `support-navigateur.mjs`.
La progression est signalée comme bientôt disponible et la mémorisation reste
verrouillée jusqu'à X10. Les réglages de taille/thème viendront avec X18/X7 ;
la page Réglages mène pour l'instant aux réglages de lecture du Coran.

X17 expose deux composants dans `js/exercices/api.js` :

```js
const etape2 = etapeLectureCinqFois(zone, {
  id: 'coran:112', session: identifiantDeLaSeance,
  surTermine: ({ lectures, session }) => activerSuivant(),
});
const etape3 = etapeChrono(zone, {
  id: 'coran:112', session: identifiantDeLaSeance,
  surTermine: ({ lecture, record, session }) => activerSuivant(),
});
// Avant de retirer chaque composant : etape2.detruire() / etape3.detruire().
```

C7 affiche lui-même le texte officiel et sa progression d'étapes ; ces composants
ne reçoivent, ne génèrent et ne modifient aucun texte arabe. Ils ont chacun une
seule action principale. `surTermine` de l'étape 2 est appelé une fois les cinq
lectures gardées (ou à la reprise d'une étape déjà complète). Celui du chrono
est appelé après chaque temps réellement sauvegardé.

Le paramètre `session` est stable pour reprendre la même séance. Il doit changer
pour « Refaire une séance ». Sans ce paramètre, la date locale sert d'identifiant.
Les lectures portent `etape: 'lecture-cinq'` ou `'chrono'`, avec `session` dans
le même stockage `exercices.lectures`. Le record (`getRecordChrono(id)`) concerne
uniquement les essais Chrono de cette source, jamais les cinq lectures.
Le temps caché est exclu : reprise automatique du comptage actif des cinq
lectures ; bouton « Reprendre » pour le chrono. Un signalement arrête l'étape
sans valider la lecture courante. Un échec de stockage conserve la durée pour
un nouvel essai et ne remplit aucun rond.

Tests X17 : 7 tests dans `etapes-seance.test.mjs`, 5 tests WebKit dans
`etapes-seance.ecran.mjs` (cinq lectures, temps exacts, callback, chrono/record,
arrière-plan, quota et signalement). Commande :
`node --test tests/codex/etapes-seance.test.mjs tests/codex/etapes-seance.ecran.mjs`.
