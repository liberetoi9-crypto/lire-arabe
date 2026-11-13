// Propriétaire : Claude Code. Logique PURE du « Programme » (testable sans navigateur).
// Aucun texte arabe écrit ici : les exemples sont TROUVÉS dans le texte officiel du Coran (data/coran),
// avec seulement des numéros de caractères Unicode.
import { morceaux } from '../core/arabe.js';

// ---- Le calendrier : 6 jours avec du nouveau, puis 1 jour de révision (7 jours sur 7) ----
export const JOURS_PAR_SEMAINE = 7;
export const estJourRevision = (n) => n % JOURS_PAR_SEMAINE === 0;
export const semaineDuJour = (n) => Math.ceil(n / JOURS_PAR_SEMAINE);
// Numéro de la leçon de lecture du jour n (1, 2, 3…), en sautant les jours de révision ; null le jour de révision.
export function leconDuJour(n) {
  if (estJourRevision(n)) return null;
  const rang = n - Math.floor(n / JOURS_PAR_SEMAINE); // jours « nouveaux » faits jusqu'ici
  return ((rang - 1) % LECONS.length) + 1; // après la dernière leçon, on revoit depuis la 1re
}
export const estLeconRevue = (n) => !estJourRevision(n) && (n - Math.floor(n / JOURS_PAR_SEMAINE)) > LECONS.length;

// ---- Les signes (numéros Unicode) ----
const C = (h) => String.fromCodePoint(h);
const FATHA = C(0x64e); const DAMMA = C(0x64f); const KASRA = C(0x650); const SHADDA = C(0x651); const SUKUN = C(0x652);
const TANWINS = [C(0x64b), C(0x64c), C(0x64d)]; const MADDA = C(0x653); const PETIT_ALIF = C(0x670);
const PETIT_WAW = C(0x6e5); const PETIT_YA = C(0x6e6); const ROND = C(0x6df); const PETITS_MIM = [C(0x6e2), C(0x6ed)];
const ALIF = C(0x627); const ALIF_WASLA = C(0x671); const LAM = C(0x644); const WAW = C(0x648); const YA = C(0x64a);
const ALIF_MAQSURA = C(0x649); const TA_MARBUTA = C(0x629); const NOUN = C(0x646); const MIM = C(0x645);
const QALQALA = [0x642, 0x637, 0x628, 0x62c, 0x62f].map(C); // les 5 lettres de la qalqala

const a = (m, s) => m.signes.includes(s);
const nu = (m) => m && m.signes.length === 0;
// Chaque règle : trouve(morceaux) → liste des indices des morceaux à colorer ([] = la règle n'est pas dans ce mot).
const parSigne = (s) => (ms) => ms.flatMap((m, i) => (a(m, s) ? [i] : []));

// ---- Les leçons de lecture (dans l'ordre). Textes en français seulement. ----
export const LECONS = [
  { id: 'fatha', titre: 'La fatha', son: '« a »', explication: 'Un petit trait AU-DESSUS de la lettre. Elle se lit avec le son « a ». Exemple : la lettre B avec une fatha se lit « ba ».', trouve: parSigne(FATHA) },
  { id: 'kasra', titre: 'La kasra', son: '« i »', explication: 'Un petit trait EN DESSOUS de la lettre. Elle se lit avec le son « i ». Exemple : B avec une kasra se lit « bi ».', trouve: parSigne(KASRA) },
  { id: 'damma', titre: 'La damma', son: '« ou »', explication: 'Un petit « 9 » au-dessus de la lettre. Elle se lit avec le son « ou ». Exemple : B avec une damma se lit « bou ».', trouve: parSigne(DAMMA) },
  { id: 'sukun', titre: 'Le sukun', son: 'pas de voyelle', explication: 'Un petit rond au-dessus de la lettre. La lettre se dit SANS voyelle : on la colle à la lettre d\'avant. Exemple : « ba » + « l » avec sukun = « bal ».', trouve: parSigne(SUKUN) },
  { id: 'longues', titre: 'Les voyelles longues', son: '« aa », « ii », « ouu »', explication: 'Une voyelle suivie de sa lettre « longue » s\'allonge (2 temps) : fatha + alif = « aa », kasra + ya = « ii », damma + waw = « ouu ». La lettre longue n\'a pas de signe.', trouve: (ms) => ms.flatMap((m, i) => {
    const s = ms[i + 1];
    if (!nu(s)) return [];
    const ok = (a(m, FATHA) && s.lettre === ALIF) || (a(m, KASRA) && (s.lettre === YA || s.lettre === ALIF_MAQSURA)) || (a(m, DAMMA) && s.lettre === WAW);
    return ok ? [i, i + 1] : [];
  }) },
  { id: 'shadda', titre: 'La shadda', son: 'lettre doublée', explication: 'Un petit « w » au-dessus de la lettre. La lettre se dit DEUX fois : une fois sans voyelle, une fois avec. Exemple : « rabba » (le B est appuyé).', trouve: parSigne(SHADDA) },
  { id: 'tanwin', titre: 'Le tanwin', son: '« an », « in », « oun »', explication: 'La voyelle est écrite DEUX fois, toujours à la fin du mot. On ajoute un « n » : deux fathas = « an », deux kasras = « in », deux dammas = « oun ».', trouve: (ms) => ms.flatMap((m, i) => (TANWINS.some((t) => a(m, t)) ? [i] : [])) },
  { id: 'al-lunaire', titre: '« Al » : on dit le L', son: '« al »', explication: 'Quand le L de « al » porte un sukun, on le prononce : « al-qamar » (la lune). La lettre d\'après n\'a pas de shadda.', trouve: (ms) => (ms[0]?.lettre === ALIF_WASLA && ms[1]?.lettre === LAM && a(ms[1], SUKUN) ? [0, 1] : []) },
  { id: 'al-solaire', titre: '« Al » : le L disparaît', son: 'L muet', explication: 'Quand le L de « al » n\'a AUCUN signe et que la lettre d\'après a une shadda, on ne dit pas le L : on double la lettre d\'après. « ach-chams » (le soleil), pas « al-chams ».', trouve: (ms) => (ms[0]?.lettre === ALIF_WASLA && ms[1]?.lettre === LAM && nu(ms[1]) && ms[2] && a(ms[2], SHADDA) ? [1, 2] : []) },
  { id: 'wasla', titre: 'L\'alif de liaison', son: 'muet en liaison', explication: 'Un alif avec un petit signe en forme de « s » au-dessus. Quand on lit sans s\'arrêter, on ne le prononce pas : on passe directement du mot d\'avant au mot suivant.', trouve: (ms) => ms.flatMap((m, i) => (m.lettre === ALIF_WASLA ? [i] : [])) },
  { id: 'madd', titre: 'La vague (madd)', son: 'très long (4 à 5 temps)', explication: 'Une petite vague au-dessus d\'une lettre longue. On allonge BEAUCOUP plus : 4 à 5 temps au lieu de 2. Écoute bien le récitateur pour sentir la durée.', trouve: parSigne(MADDA) },
  { id: 'ta-marbuta', titre: 'Le « ta » rond', son: '« a » ou « t »', explication: 'Un « h » avec deux points dessus, à la fin du mot. Si tu t\'arrêtes dessus, tu dis « a » (ou un léger « h »). Si tu continues, tu dis « t ».', trouve: (ms) => ms.flatMap((m, i) => (m.lettre === TA_MARBUTA ? [i] : [])) },
  { id: 'petit-alif', titre: 'Le petit alif', son: '« aa »', explication: 'Un tout petit alif droit au-dessus de la lettre. Il se lit comme un vrai alif : un « a » long (2 temps). Exemple : dans le mot « Allah », le « laa » est long.', trouve: parSigne(PETIT_ALIF) },
  { id: 'alif-maqsura', titre: 'Le ya sans points', son: '« aa » ou « ii »', explication: 'Un ya SANS les deux points, à la fin du mot. Avec un petit alif dessus : « a » long. Après une kasra : « i » long.', trouve: (ms) => ms.flatMap((m, i) => (m.lettre === ALIF_MAQSURA ? [i] : [])) },
  { id: 'silah', titre: 'Les petits waw et ya', son: '« hou » → « houu »', explication: 'Un tout petit waw ou ya après le « h » de « hou » / « hi ». Quand on continue la lecture, on allonge : « houu », « hii ». Si tu t\'arrêtes sur le mot, tu ne les dis pas.', trouve: (ms) => ms.flatMap((m, i) => (m.lettre === PETIT_WAW || m.lettre === PETIT_YA || a(m, PETIT_WAW) || a(m, PETIT_YA) ? [i] : [])) },
  { id: 'qalqala', titre: 'La qalqala (le rebond)', son: 'petit rebond', explication: 'Les lettres Q, T (emphatique), B, J, D avec un sukun « rebondissent » : on entend un tout petit écho, comme une balle qui rebondit. Exemple : « yalid ».', trouve: (ms) => ms.flatMap((m, i) => (QALQALA.includes(m.lettre) && a(m, SUKUN) ? [i] : [])) },
  { id: 'ghunna', titre: 'Le son du nez (ghunna)', son: 'nasal, 2 temps', explication: 'Un N ou un M avec une shadda : on garde le son dans le nez pendant 2 temps, comme un petit « mmm » ou « nnn ». Exemple : « inna ».', trouve: (ms) => ms.flatMap((m, i) => ((m.lettre === NOUN || m.lettre === MIM) && a(m, SHADDA) ? [i] : [])) },
  { id: 'muette', titre: 'Les lettres qu\'on ne lit pas', son: 'silence', explication: 'Une lettre avec un petit rond ovale au-dessus : on ne la prononce pas. Elle est écrite, mais elle reste muette. Exemple : l’alif à la fin de « qalou » (ils ont dit).', trouve: parSigne(ROND) },
  { id: 'iqlab', titre: 'Le N qui devient M', son: '« n » → « m »', explication: 'Un tout petit mim au-dessus (ou en dessous) d\'un N ou d\'un tanwin : le N se transforme en M, dit avec le nez. Exemple : « min ba3d » se lit « mim ba3d ».', trouve: (ms) => ms.flatMap((m, i) => (PETITS_MIM.some((s) => a(m, s)) ? [i] : [])) },
];
export const getLecon = (num) => LECONS[num - 1] ?? null;

// Indices des morceaux concernés par la leçon dans ce mot.
export const reperer = (lecon, texteMot) => [...new Set(lecon.trouve(morceaux(texteMot)))].sort((x, y) => x - y);

// Choisit des exemples dans une liste de mots { cle, position, texte } : des mots courts d'abord, sans doublon.
export function exemples(lecon, mots, combien = 6) {
  const vus = new Set();
  return mots
    .filter((m) => reperer(lecon, m.texte).length)
    .filter((m) => (vus.has(m.texte) ? false : vus.add(m.texte)))
    // d'abord les mots où la règle ne colore PAS tout le mot (on voit mieux la différence), puis les plus courts
    .map((m) => ({ m, tout: reperer(lecon, m.texte).length >= morceaux(m.texte).length, n: morceaux(m.texte).length }))
    .sort((x, y) => x.tout - y.tout || x.n - y.n)
    .map(({ m }) => m)
    .slice(0, combien);
}

// Exercice « touche les mots où tu vois la règle » : `avec` mots qui ont la règle, autant sans (si possible), mélangés.
// hasard : fonction () => [0,1[ (pour les tests).
export function exercice(lecon, mots, { avec = 4, hasard = Math.random } = {}) {
  const melange = (l) => l.map((x) => [hasard(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const uniques = [...new Map(mots.map((m) => [m.texte, m])).values()];
  const oui = melange(uniques.filter((m) => reperer(lecon, m.texte).length)).slice(0, avec);
  const non = melange(uniques.filter((m) => !reperer(lecon, m.texte).length)).slice(0, avec);
  return melange([...oui.map((m) => ({ ...m, bon: true })), ...non.map((m) => ({ ...m, bon: false }))]);
}

// ---- Rappels de la Sunna (Ahl as-Sunna wal-Jama'a) : seulement des hadiths authentiques (sahih / hasan) ----
// Vérifiés le 13/11/2026 sur sunnah.com (texte + note d'al-Albani) et islamqa.info (n° 10700 pour al-Kahf).
// Volontairement ABSENTS : Ya-Sin le vendredi ou la nuit, al-Waqi'a contre la pauvreté (hadiths faibles).
export const RAPPELS = [
  { id: 'kahf', quand: 'vendredi', titre: 'Sourate al-Kahf (18)', texte: 'Le vendredi (depuis le coucher du soleil du jeudi jusqu\'au coucher du soleil du vendredi), lis la sourate al-Kahf : une lumière t\'éclaire jusqu\'au vendredi suivant.', adresse: '#/coran/18', source: 'al-Hakim ; authentifié par al-Albani (Sahih al-Jami\' 6470)' },
  { id: 'salat-nabi', quand: 'vendredi', titre: 'Prière sur le Prophète (paix et salut sur lui)', texte: 'Le vendredi, dis beaucoup « Allahoumma salli ’ala Mohammad » : elles lui sont présentées.', adresse: null, source: 'Abu Dawud 1047 (sahih, al-Albani)' },
  { id: 'matin-soir', quand: 'matin-soir', titre: 'Matin et soir : les 3 « Qoul »', texte: 'Le matin et le soir, lis 3 fois : al-Ikhlas (112), al-Falaq (113) et an-Nas (114). Elles te suffisent pour tout.', adresse: '#/coran/112', source: 'Abu Dawud 5082 (hasan, al-Albani)' },
  { id: 'apres-priere', quand: 'jour', titre: 'Après chaque prière', texte: 'Après chaque prière obligatoire, lis al-Ikhlas, al-Falaq et an-Nas.', adresse: '#/coran/113', source: 'Abu Dawud 1523 (sahih, al-Albani)' },
  { id: 'kursi-priere', quand: 'jour', titre: 'Après chaque prière : Ayat al-Kursi', texte: 'Après chaque prière obligatoire, lis Ayat al-Kursi (sourate 2, verset 255).', adresse: '#/coran/2/255', source: 'an-Nasa\'i (as-Sunan al-Kubra) ; authentifié par al-Albani (Silsila Sahiha 972)' },
  { id: 'kursi-nuit', quand: 'soir', titre: 'Avant de dormir : Ayat al-Kursi', texte: 'Avant de dormir, lis Ayat al-Kursi (2:255) : Allah te protège toute la nuit.', adresse: '#/coran/2/255', source: 'al-Bukhari 2311' },
  { id: 'baqara-fin', quand: 'soir', titre: 'La nuit : fin d\'al-Baqara', texte: 'La nuit, lis les 2 derniers versets de la sourate al-Baqara (2:285 et 2:286) : ils te suffisent.', adresse: '#/coran/2/285', source: 'al-Bukhari 5009' },
  { id: 'qoul-nuit', quand: 'soir', titre: 'Au lit : souffler dans ses mains', texte: 'Au lit, joins tes mains, lis al-Ikhlas, al-Falaq et an-Nas, souffle dedans et passe-les sur ton corps (tête et visage d\'abord). 3 fois.', adresse: '#/coran/112', source: 'al-Bukhari 5017' },
  { id: 'kafiroun', quand: 'soir', titre: 'Au lit : al-Kafiroun', texte: 'Lis la sourate al-Kafiroun (109) puis dors : c\'est un rejet de l\'association.', adresse: '#/coran/109', source: 'Abu Dawud 5055 (sahih, al-Albani)' },
  { id: 'mulk', quand: 'soir', titre: 'Chaque soir : al-Mulk', texte: 'La sourate al-Mulk (67), 30 versets, intercède pour celui qui la lit jusqu\'à ce qu\'il soit pardonné.', adresse: '#/coran/67', source: 'at-Tirmidhi 2891 (hasan)' },
  { id: 'kahf-10', quand: 'objectif', titre: 'À apprendre par cœur : al-Kahf 1 à 10', texte: 'Celui qui apprend par cœur les 10 premiers versets d\'al-Kahf est protégé du Dajjal.', adresse: '#/coran/18/1', source: 'Muslim 809' },
  { id: 'baqara-maison', quand: 'objectif', titre: 'À la maison : al-Baqara', texte: 'Le Shaytan fuit la maison où on lit la sourate al-Baqara (2). Lis-la chez toi de temps en temps.', adresse: '#/coran/2', source: 'Muslim 780' },
];

// Rappels à montrer à cette date : le vendredi d'abord (et dès le jeudi soir pour al-Kahf), puis matin/soir, journée, soir, objectifs.
export function rappelsDuJour(date = new Date()) {
  const jour = date.getDay(); // 0 dimanche … 5 vendredi
  const heure = date.getHours();
  const vendredi = jour === 5 || (jour === 4 && heure >= 17);
  const ordre = ['vendredi', 'matin-soir', 'jour', 'soir', 'objectif'];
  return RAPPELS.filter((r) => r.quand !== 'vendredi' || vendredi)
    .sort((x, y) => ordre.indexOf(x.quand) - ordre.indexOf(y.quand));
}
export const estVendredi = (date = new Date()) => date.getDay() === 5 || (date.getDay() === 4 && date.getHours() >= 17);
