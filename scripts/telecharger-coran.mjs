// Propriétaire : Claude Code (tâche C2).
// Télécharge le texte officiel du Coran (uthmani, Hafs) depuis l'API quran.com,
// le contrôle verset par verset avec Tanzil.net, puis l'enregistre dans data/coran/.
// AUCUN texte arabe n'est écrit à la main : tout vient des sources.
// Lancer : npm run donnees            → télécharge, contrôle TOUT, et seulement ensuite remplace data/coran/
//         npm run verifier:coran     → retélécharge et compare avec data/coran/ SANS rien écrire
import { mkdir, writeFile, readFile, rm, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const API = 'https://api.quran.com/api/v4';
const TANZIL = 'https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=true&quranType=uthmani&outType=txt-2&agree=true';
const DOSSIER = new URL('../data/coran/', import.meta.url);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url, essais = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= essais) throw new Error(`${url} : ${e.message}`);
      await pause(1000 * i);
    }
  }
}
const empreinte = (s) => createHash('sha256').update(s).digest('hex');
function arreter(message) { console.error('ERREUR : ' + message); process.exit(1); }

// 1. Texte Tanzil (contrôle). Format : sourate|verset|texte
console.log('Tanzil…');
const brutTanzil = await (await fetch(TANZIL)).text();
const tanzil = new Map();
for (const ligne of brutTanzil.split('\n')) {
  const m = ligne.match(/^(\d+)\|(\d+)\|(.*)$/);
  if (m) tanzil.set(`${m[1]}:${m[2]}`, m[3].trim());
}
if (tanzil.size !== 6236) arreter(`Tanzil : ${tanzil.size} versets au lieu de 6236`);

// 2. Liste des sourates (quran.com)
const { chapters } = await json(`${API}/chapters?language=fr`);
if (chapters.length !== 114) arreter('quran.com : pas 114 sourates');

const VERIFIER = process.argv.includes('--verifier');
const aEcrire = []; // rien n'est écrit tant que tout n'est pas contrôlé
const manifeste = {
  source: 'API quran.com v4 (text_uthmani, Hafs)',
  controle: 'Tanzil.net, Uthmani 1.1 (CC BY 3.0, https://tanzil.net) — comparé verset par verset',
  date: new Date().toISOString(),
  sourates: [],
};
let bismillah = null; // texte du verset 1:1, pris dans la source (sert à reconnaître la basmala que Tanzil colle au début des sourates)
let differences = 0;

for (const ch of chapters) {
  const n = ch.id;
  const versets = [];
  for (let page = 1; ; page++) {
    const r = await json(`${API}/verses/by_chapter/${n}?words=true&word_fields=text_uthmani&fields=text_uthmani&per_page=50&page=${page}`);
    versets.push(...r.verses);
    if (!r.pagination.next_page) break;
  }
  // Contrôles : nombre de versets, numéros dans l'ordre, mots = texte du verset, égalité avec Tanzil
  if (versets.length !== ch.verses_count) arreter(`sourate ${n} : ${versets.length} versets au lieu de ${ch.verses_count}`);
  const propres = versets.map((v, i) => {
    const cle = `${n}:${i + 1}`;
    if (v.verse_key !== cle || v.verse_number !== i + 1) arreter(`ordre faux : attendu ${cle}, reçu ${v.verse_key}`);
    const texte = v.text_uthmani.trim();
    // Les mots sont découpés dans le texte DU VERSET (identique à Tanzil), pas repris des « mots » de l'API :
    // l'API ajoute parfois un signe de tajwid dans le mot seul (ex. 2:2). Un signe isolé (pause) reste collé au mot d'avant.
    // On suit le découpage de quran.com (un « mot » peut regrouper 2 morceaux écrits, ex. 2:181,
    // ou un signe de pause / ۞), mais les caractères sont pris dans le texte du verset.
    // Alignement par les LETTRES (sans signes) : on prend des morceaux du verset jusqu'à avoir les lettres
    // du mot quran.com, puis on colle les signes isolés qui suivent (pauses).
    // « Squelette » pour aligner seulement (jamais pour afficher) : les mots seuls de quran.com ont parfois
    // une orthographe simplifiée (alif simple au lieu d'alif wasla, ى, hamza…), donc on ignore alifs et hamzas.
    const lettres = (s) => s
      .replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي')
      .replace(/[ء-أإاىٰ-ٳ]/gu, '')
      .replace(/[^ب-غف-يکی]/gu, '');
    const motsApi = v.words.filter((w) => w.char_type_name === 'word');
    const bouts = texte.split(' ');
    let k = 0;
    const morceaux = motsApi.map((w) => {
      const cible = lettres(w.text_uthmani);
      const pris = [];
      const signeSeul = (b) => !/[ء-يٱ-ۓ]/u.test(b); // ex. ۛ ۚ ۞
      while (k < bouts.length && (!pris.some((b) => !signeSeul(b)) || lettres(pris.join('')).length < cible.length)) pris.push(bouts[k++]);
      while (k < bouts.length && signeSeul(bouts[k])) pris.push(bouts[k++]);
      return pris.join(' ');
    });
    if (k !== bouts.length || morceaux.join(' ') !== texte) arreter(`${cle} : découpage faux`);
    // Contrôle : mêmes lettres que le mot de quran.com à la même position
    motsApi.forEach((w, k) => {
      if (lettres(w.text_uthmani) !== lettres(morceaux[k])) arreter(`${cle} mot ${k + 1} : lettres différentes de quran.com`);
    });
    const mots = morceaux.map((t, k) => ({ position: motsApi[k].position, texte: t }));
    if (cle === '1:1') bismillah = texte;
    let t = tanzil.get(cle);
    if (!t) arreter(`${cle} absent de Tanzil`);
    // Tanzil colle la basmala devant le verset 1 (sauf sourates 1 et 9). On retire ses 4 mots
    // (dans 95 et 97, Tanzil l'écrit avec une chadda en plus sur le ba : on vérifie donc les lettres).
    if (i === 0 && n !== 1 && n !== 9) {
      const b = t.split(' ');
      const sansSignes = (s) => s.replace(/[^ء-يٱ]/gu, '');
      if (sansSignes(b.slice(0, 4).join(' ')) !== sansSignes(bismillah)) arreter(`${cle} : basmala Tanzil introuvable`);
      t = b.slice(4).join(' ');
    }
    if (t !== texte) { differences++; console.warn(`DIFFÉRENCE ${cle}`); }
    return { cle, sourate: n, verset: i + 1, texte, mots };
  });
  const donnees = {
    numero: n,
    nomArabe: ch.name_arabic,
    nom: ch.name_simple,
    nomFr: ch.translated_name?.name ?? null,
    nbVersets: ch.verses_count,
    nbMots: propres.reduce((s, v) => s + v.mots.length, 0),
    versets: propres,
  };
  const contenu = JSON.stringify(donnees);
  const fichier = `sourates/${String(n).padStart(3, '0')}.json`;
  aEcrire.push({ fichier, contenu });
  manifeste.sourates.push({ numero: n, nomArabe: donnees.nomArabe, nom: donnees.nom, nomFr: donnees.nomFr, fichier, nbVersets: ch.verses_count, nbMots: donnees.nbMots, sha256: empreinte(contenu) });
  process.stdout.write(`${n} `);
}
console.log();
manifeste.differencesTanzil = differences;
const total = manifeste.sourates.reduce((s, x) => s + x.nbVersets, 0);
console.log(`Contrôle : 114 sourates, ${total} versets, différences avec Tanzil : ${differences}`);
// 1. Rien n'est publié si un seul verset diffère.
if (differences || total !== 6236) arreter('des versets diffèrent de Tanzil : AUCUNE donnée écrite, demander à Zakou');

if (VERIFIER) {
  // 2a. Vérification en direct : comparer avec les fichiers déjà enregistrés, sans rien écrire.
  let pareils = 0;
  for (const { fichier, contenu } of aEcrire) {
    const disque = await readFile(new URL(fichier, DOSSIER), 'utf8').catch(() => null);
    if (disque === contenu) pareils++; else console.error(`DIFFÉRENT : ${fichier}`);
  }
  console.log(`Vérification : ${pareils} fichiers sur 114 identiques aux sources d'aujourd'hui.`);
  if (pareils !== 114) arreter('les fichiers enregistrés ne correspondent plus aux sources : demander à Zakou');
} else {
  // 2b. Écriture dans un dossier à part, puis remplacement d'un coup (jamais de données à moitié écrites).
  const NOUVEAU = new URL('../data/coran.nouveau/', import.meta.url);
  await rm(NOUVEAU, { recursive: true, force: true });
  await mkdir(new URL('sourates/', NOUVEAU), { recursive: true });
  for (const { fichier, contenu } of aEcrire) await writeFile(new URL(fichier, NOUVEAU), contenu);
  await writeFile(new URL('manifeste.json', NOUVEAU), JSON.stringify(manifeste, null, 1));
  await rm(new URL('sourates/', DOSSIER), { recursive: true, force: true });
  await rename(new URL('sourates/', NOUVEAU), new URL('sourates/', DOSSIER));
  await rename(new URL('manifeste.json', NOUVEAU), new URL('manifeste.json', DOSSIER));
  await rm(NOUVEAU, { recursive: true, force: true });
  console.log('Données écrites dans data/coran/.');
}
