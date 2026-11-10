# PROJET — Lire l'arabe couramment (arabe + Coran)

Appli web simple, faite pour **Safari sur iPhone**, pour passer de « lettre par lettre » à « une phrase d'un coup ».
Ce fichier est la consigne unique pour **Claude Code** et **Codex**. Les deux le suivent à la lettre.

## L'élève
- Parle seulement la darija, pas l'arabe littéraire (fusha) à l'oral.
- Sait un peu lire et écrire, mais lit lettre par lettre ou mot par mot.
- Beaucoup de mots du Coran et de la fusha lui sont inconnus.

## 1. Travail en équipe
- **Claude Code = chef de projet.** Il fusionne dans `main`.
- Chacun travaille sur **sa branche** : `claude/<tache>` ou `codex/<tache>`.
- **Personne ne modifie les fichiers de l'autre** (voir « Qui possède quoi »). Besoin d'un changement chez l'autre → l'écrire dans `TABLEAU.md`, rubrique « Demandes ».
- Chaque partie finie passe à « à vérifier » : l'autre la relit et la teste, puis Claude Code fusionne.
- `TABLEAU.md` est mis à jour à **chaque** tâche commencée ou finie.
- Commits en français, courts. Aucune donnée perso dans le dépôt (il est public).

## 2. Règle absolue « ZÉRO ERREUR »
- **Aucune IA n'écrit elle-même du texte arabe avec voyelles.** Jamais. Ni Coran, ni arabe normal. Pas même dans un test ou un exemple : les tests lisent les fichiers sources.
- **Coran** : texte uniquement depuis l'API officielle quran.com (`api.quran.com/api/v4`), contrôlé avec Tanzil.net. Écriture uthmani, lecture Hafs, toutes les voyelles.
- Chaque verset affiché est contrôlé automatiquement : sa clé `sourate:verset` doit être exactement celle demandée, sinon on n'affiche rien et on montre une erreur.
- **Arabe normal** : rien d'inventé. Section « Mes textes » où l'élève ajoute lui-même des textes vérifiés. L'appli affiche, lit à voix haute, enlève les voyelles progressivement. C'est tout.
- Tant que « Mes textes » est vide : l'exercice « voyelles progressives » utilise des versets du Coran (source officielle).
- **Aucune traduction inventée.** Traductions uniquement de sources officielles, avec la source écrite à côté.
- Bouton **« Signaler une erreur »** sur chaque texte et chaque verset → le texte est mis de côté (plus proposé) jusqu'à vérification.
- **Un doute → on s'arrête et on demande à Zakou.** On ne devine jamais.
- On ne modifie **jamais** les caractères d'un texte source. Les exercices changent seulement **l'affichage** (copie, couleur, voyelles cachées).

## 3. Récitateurs
- Seulement Ahl as-Sunna wal-Jama'a, reconnus, avec ijaza. Pour l'instant **seulement** :
  1. **Mahmoud Khalil Al-Husary, mu'allim** — principal (everyayah : `Husary_Muallim_128kbps`, vérifié verset par verset).
  2. **Yasser Al-Dosari** — deuxième choix (everyayah : `Yasser_Ad-Dussary_128kbps`, vérifié verset par verset).
- **Aucun autre récitateur sans l'accord de Zakou. Pas de Mishary Al-Afasy.**
- Sons uniquement depuis everyayah.com ou l'API quran.com.
- Tout en **Hafs**. Jamais un audio Warsh avec un texte Hafs.
- **Jamais de voix de synthèse pour le Coran.** Les sons « mot par mot » de quran.com ne sont PAS utilisés (autre voix).
- Menu pour choisir le récitateur.
- Warsh prévu dans le code (champ `riwaya` des récitateurs) mais **éteint**.

## 4. Fonctionnalités
1. **Séance du jour (20 min)**
   - Coran 10 min : sourates du Juz Amma, des plus courtes aux plus longues (classées par nombre de mots). Texte avec voyelles + écoute verset par verset, verset récité surligné.
   - Arabe normal 10 min : un texte de « Mes textes », traduction française cachée (bouton) si l'élève l'a ajoutée.
2. **Voix**
   - Coran : vraies récitations uniquement.
   - Arabe normal : voix arabe de l'iPhone (`speechSynthesis`, langue `ar`). Tout le texte, ou toucher un mot pour l'entendre seul.
   - Vitesse : lent / normal.
   - Mode « répète après moi » : un verset ou une phrase, une pause, l'élève répète.
3. **Lecture répétée** : compteur « lu 1/5, 2/5… », chronomètre, temps gardés.
4. **Voyelles progressives** (exercice à part ; le Coran normal garde toujours toutes ses voyelles)
   - Niveau 1 : toutes les voyelles.
   - Niveau 2 : d'abord on enlève les voyelles des petits mots fréquents, ensuite une voyelle sur deux dans les autres mots.
   - Niveau 3 : aucune voyelle.
   - Toucher un mot → ses voyelles réapparaissent.
5. **Petits mots fréquents** : l'appli compte elle-même les mots les plus fréquents dans le texte officiel complet du Coran et les surligne en couleur. Le texte n'est jamais modifié, seule la couleur change.
6. **Enregistrement** : l'élève s'enregistre et se réécoute à côté de l'audio officiel.
7. **Progression** : calendrier des jours faits (série de jours d'affilée), graphique des temps de lecture. Tout sur le téléphone, sans compte.
8. **Comprendre les mots**
   - Toucher un mot du Coran → sens mot à mot depuis quran.com (**en anglais** : quran.com n'a pas de mot à mot en français, vérifié le 10/11/2026).
   - Traduction française du verset : **Hamidullah** (quran.com, traduction n° 31).
   - Bouton « Ajouter à mes mots » + révision en mode cartes.

## 5. Affichage
- Arabe de droite à gauche (`dir="rtl"`, `lang="ar"`), grande police lisible, taille réglable.
- Coran : police uthmani officielle (KFGQPC Uthmanic Script HAFS).
- Mode clair et mode sombre.
- Pensé d'abord pour l'iPhone (boutons ≥ 44 px, rien qui dépend du survol).

## 6. Mise en ligne
- GitHub Pages, gratuit, code public, **aucune donnée perso** dedans.
- Zakou fait lui-même le test final sur son iPhone.

## 7. Vérification avant de finir
Tests automatiques (`npm test`) :
- texte du Coran stocké = texte de la source officielle (re-téléchargé et comparé caractère par caractère) ;
- chaque audio pointe vers le bon verset et le bon récitateur, et le fichier existe ;
- traductions = source officielle (id + texte comparés) ;
- affichage arabe dans Safari (moteur WebKit) ;
- sons qui se chargent.
Le résultat des tests + la liste de ce qui a été vérifié par Claude Code ET par Codex est montré à Zakou.

---

# PARTIE TECHNIQUE (pour ne rien casser)

## Choix
- HTML + CSS + JavaScript **sans framework, sans étape de build** (modules ES). Marche tel quel sur GitHub Pages.
- Navigation par adresse `#/...` (`js/core/routeur.js`).
- Stockage : `localStorage` via `js/core/stockage.js` (jamais en direct). Enregistrements audio : IndexedDB.
- Le texte du Coran est téléchargé **une fois** par `scripts/` et rangé dans `data/coran/` (avec la source, la date et une empreinte). L'appli lit ces fichiers : rapide, et marche même avec un mauvais réseau.
- Node 18+ seulement pour les scripts et les tests.

## Qui possède quoi
| Dossier / fichier | Propriétaire |
|---|---|
| `PROJET.md`, `AGENTS.md`, `index.html`, `package.json` | Claude Code |
| `js/core/` (bus, stockage, routeur, signalement, arabe), `js/main.js`, `css/base.css` | Claude Code |
| `js/coran/`, `js/mots/`, `js/seance/`, `css/coran.css`, `fonts/` | Claude Code |
| `data/`, `scripts/`, `tests/claude/`, `.github/` | Claude Code |
| `js/textes/`, `js/exercices/`, `js/enregistrement/`, `js/progression/`, `js/affichage/` | Codex |
| `css/affichage.css`, `tests/codex/` | Codex |

`TABLEAU.md` : les deux y écrivent, chacun **seulement ses lignes** + la rubrique « Demandes ».

## Comment les parties se parlent
1. **Écrans** : chaque module appelle `enregistrerEcran(nom, { titre, afficher(conteneur, params) })` (`js/core/routeur.js`). Adresses : `#/seance`, `#/coran`, `#/coran/112`, `#/mots`, `#/textes`, `#/exercices`, `#/progression`, `#/reglages`.
2. **Fonctions publiques** : chaque module expose ses fonctions dans son `api.js`. On importe **seulement** l'`api.js` d'un autre module, jamais ses fichiers internes.
   - `js/coran/api.js` (Claude) : `getSourate(n)`, `getVerset(cle)`, `ordreJuzAmma()`, `getTraduction(cle)`, `getSensMots(cle)`, `getRecitateurs()`, `getRecitateurActif()`, `setRecitateurActif(id)`, `urlAudio(cle, id?)`, `creerLecteur()`, `estMotFrequent(texteMot)`.
   - `js/textes/api.js` (Codex) : `getTextes()`, `getTexte(id)`, `getTexteDuJour()`.
   - `js/progression/api.js` (Codex) : `noterSeance({ secondes, type })`, `noterTemps({ id, secondes })`.
   - `js/exercices/api.js` (Codex) : `afficherVoyellesProgressives(conteneur, { mots, niveau })`, `lectureRepetee(conteneur, { objectif })`.
   - `js/enregistrement/api.js` (Codex) : `boutonEnregistrer(conteneur, { cle, urlOfficielle })`.
   - `js/affichage/api.js` (Codex) : `appliquerReglages()`.
3. **Événements** (`js/core/bus.js`, `on` / `emit`) :
   - `verset:debut` `{ cle, recitateur }` / `verset:fin` `{ cle }` — émis par le lecteur Coran.
   - `mot:touche` `{ source: 'coran'|'texte', cle, position, texte }`
   - `texte:signale` `{ type, id }`
   - `seance:finie` `{ secondes }`
   - `affichage:change` `{ theme, taille }`
4. **Stockage** : clés préfixées par module (`coran.*`, `mots.*`, `seance.*`, `textes.*`, `exercices.*`, `progression.*`, `enregistrement.*`, `affichage.*`). Chacun ne touche que ses clés. `signalements` est géré par `js/core/signalement.js`.
5. **Texte arabe** : pour cacher des voyelles à l'affichage, utiliser `js/core/arabe.js` (`sansVoyelles(texte)`, `estVoyelle(caractere)`). Ces fonctions renvoient une **copie** ; l'original n'est jamais modifié.
6. **Affichage** : variables CSS dans `css/base.css` (`--fond`, `--texte`, `--accent`, `--frequent`, `--surligne`, `--taille-arabe`). Codex les redéfinit dans `css/affichage.css` pour le mode sombre et la taille ; il ne refait pas la mise en page.

## Branches
- `main` : seulement ce qui est vérifié. Claude Code fusionne.
- `claude/<tache>` et `codex/<tache>` : une branche par tâche du tableau.
