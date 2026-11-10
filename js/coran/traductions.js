// Propriétaire : Claude Code (C6). INTERNE : les autres modules passent par api.js.
// Sens mot à mot (anglais, quran.com) et traductions françaises du verset, depuis les sources officielles.
// Aucune traduction n'est écrite ici. Chaque réponse est contrôlée (bon verset, bon nombre de mots).
// Pas de dépendance au navigateur : utilisable aussi par les tests (Node 18+).

export const QURAN_COM = 'https://api.quran.com/api/v4';
export const QURAN_ENC = 'https://quranenc.com/api/v1';

export const TRADUCTIONS = Object.freeze({
  hamidullah: Object.freeze({
    id: 'hamidullah', nom: 'Muhammad Hamidullah', source: 'quran.com', quranComId: 31,
    credit: 'Muhammad Hamidullah — quran.com',
  }),
  rachid: Object.freeze({
    id: 'rachid', nom: 'Rachid Maach', source: 'QuranEnc.com', cleQuranEnc: 'french_rashid',
    credit: 'Rachid Maach — QuranEnc.com', traducteur: 'Traduit par Rachid Maach',
    lienSignaler: (s) => `https://quranenc.com/fr/browse/french_rashid/${s}`,
  }),
});

async function json(url, essais = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= essais) throw new Error(`Source injoignable (${e.message}). Vérifie Internet.`);
      await new Promise((ok) => setTimeout(ok, 600 * i));
    }
  }
}

// Même « squelette » que le script de téléchargement : sert seulement à vérifier qu'un mot de l'API
// est bien le même mot que le nôtre (orthographe simplifiée possible côté API).
export function squeletteAlignement(s) {
  return String(s)
    .replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي')
    .replace(/[ء-أإاىٰ-ٳ]/gu, '')
    .replace(/[^ب-غف-يکی]/gu, '');
}

// Texte de traduction quran.com : « … <sup foot_note=211620>1</sup> » → morceaux SANS HTML :
// [{ texte }, { note: 211620, numero: '1' }]. On ne change aucun mot : on sépare seulement le texte des appels de note.
export function decouperNotes(texte) {
  const morceaux = [];
  const re = /<sup foot_note=["']?(\d+)["']?>([^<]*)<\/sup>/g;
  let i = 0;
  let m;
  while ((m = re.exec(texte))) {
    if (m.index > i) morceaux.push({ texte: texte.slice(i, m.index) });
    morceaux.push({ note: Number(m[1]), numero: m[2] });
    i = re.lastIndex;
  }
  if (i < texte.length) morceaux.push({ texte: texte.slice(i) });
  if (morceaux.some((x) => x.texte && /<[a-z/]/i.test(x.texte))) throw new Error('Format de traduction inattendu');
  return morceaux;
}

const cacheQuranCom = new Map();

// Une sourate depuis quran.com : sens mot à mot (anglais) + Hamidullah, contrôlés.
// sourate : notre sourate (data/coran) → Map cle → { sens: [{ position, sens, langue }], hamidullah: { morceaux } }
export async function chargerQuranCom(sourate) {
  const n = sourate.numero;
  if (cacheQuranCom.has(n)) return cacheQuranCom.get(n);
  const versets = [];
  for (let page = 1; ; page++) {
    const r = await json(`${QURAN_COM}/verses/by_chapter/${n}?language=en&words=true&word_fields=text_uthmani`
      + `&translations=${TRADUCTIONS.hamidullah.quranComId}&per_page=50&page=${page}`);
    versets.push(...r.verses);
    if (!r.pagination.next_page) break;
  }
  if (versets.length !== sourate.versets.length) throw new Error(`quran.com : ${versets.length} versets au lieu de ${sourate.versets.length}`);
  const res = new Map();
  versets.forEach((v, i) => {
    const nous = sourate.versets[i];
    if (v.verse_key !== nous.cle) throw new Error(`quran.com : verset ${v.verse_key} reçu au lieu de ${nous.cle}`);
    const motsApi = v.words.filter((w) => w.char_type_name === 'word');
    const sens = nous.mots.map((m) => {
      const w = motsApi.find((x) => x.position === m.position);
      // Contrôle : même mot (mêmes lettres) à la même position, sinon on n'affiche pas de sens.
      if (!w || squeletteAlignement(w.text_uthmani) !== squeletteAlignement(m.texte)) return { position: m.position, sens: null };
      return { position: m.position, sens: w.translation?.text ?? null, langue: 'en' };
    });
    const t = (v.translations ?? []).find((x) => x.resource_id === TRADUCTIONS.hamidullah.quranComId);
    if (!t) throw new Error(`quran.com : traduction Hamidullah absente pour ${nous.cle}`);
    res.set(nous.cle, { sens, hamidullah: { morceaux: decouperNotes(t.text) } });
  });
  cacheQuranCom.set(n, res);
  return res;
}

const cacheNotes = new Map();
export async function chargerNoteQuranCom(id) {
  if (!cacheNotes.has(id)) {
    const r = await json(`${QURAN_COM}/foot_notes/${Number(id)}`);
    if (r.foot_note?.id !== Number(id)) throw new Error('Note introuvable');
    cacheNotes.set(id, r.foot_note.text);
  }
  return cacheNotes.get(id);
}

let versionRachid = null;
// Numéro de version publié par QuranEnc (condition n° 3), pris dans leur liste officielle.
export async function chargerVersionRachid() {
  if (!versionRachid) {
    const r = await json(`${QURAN_ENC}/translations/list/fr`);
    const t = r.translations.find((x) => x.key === TRADUCTIONS.rachid.cleQuranEnc);
    if (!t) throw new Error('QuranEnc : traduction Rachid Maach introuvable dans la liste officielle');
    versionRachid = t.version;
  }
  return versionRachid;
}

const cacheRachid = new Map();
// Une sourate de Rachid Maach (QuranEnc), contrôlée : Map cle → { texte, notes } (tels quels, condition n° 1).
export async function chargerRachid(sourate) {
  const n = sourate.numero;
  if (cacheRachid.has(n)) return cacheRachid.get(n);
  const r = await json(`${QURAN_ENC}/translation/sura/${TRADUCTIONS.rachid.cleQuranEnc}/${n}`);
  const liste = r.result ?? [];
  if (liste.length !== sourate.versets.length) throw new Error(`QuranEnc : ${liste.length} versets au lieu de ${sourate.versets.length}`);
  const res = new Map();
  liste.forEach((x, i) => {
    const nous = sourate.versets[i];
    if (Number(x.sura) !== n || Number(x.aya) !== nous.verset) throw new Error(`QuranEnc : verset ${x.sura}:${x.aya} reçu au lieu de ${nous.cle}`);
    res.set(nous.cle, { texte: x.translation, notes: x.footnotes || '' });
  });
  cacheRachid.set(n, res);
  return res;
}
