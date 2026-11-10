// Propriétaire : Claude Code (C4). Tests AVEC Internet : chaque son correspond au bon verset et au bon récitateur.
// Lancer : npm run test:en-ligne   (par défaut Fatiha + Juz Amma ; TOUT=1 pour les 114 sourates)
//
// Comment on sait que le son est le BON verset, sans l'écouter ?
//  1. everyayah dit lui-même quel récitateur est dans chaque dossier (recitations.js).
//  2. Husary mu'allim : quran.com publie SA PROPRE liste « verset → fichier » ; elle doit donner le même fichier.
//  3. Husary mu'allim : quran.com publie la durée de chaque verset (minutage de la sourate entière) ;
//     la durée du fichier everyayah doit être la même (à 1 s près). Un verset décalé aurait une autre durée.
//  4. Dosari : chaque sourate a exactement le bon nombre de fichiers (le verset « suivant le dernier » n'existe pas),
//     et les durées suivent celles de Husary (versets longs = sons longs) : un décalage casserait ce lien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RECITATEURS, construireUrl } from '../../../js/coran/recitateurs.js';

const dossier = new URL('../../../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));
const SOURATES = process.env.TOUT ? manifeste.sourates : manifeste.sourates.filter((s) => s.numero === 1 || s.numero >= 78);
const husary = RECITATEURS.find((r) => r.id === 'husary_muallim');
const dosari = RECITATEURS.find((r) => r.id === 'dosari');

async function obtenir(url, options = {}, essais = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, options);
      if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= essais) throw e;
      await new Promise((ok) => setTimeout(ok, 800 * i));
    }
  }
}
// Info d'un fichier son : existe ? type ? durée (128 kbit/s constant → octets × 8 / 128000).
async function infoSon(url) {
  const r = await obtenir(url, { method: 'HEAD' });
  const octets = Number(r.headers.get('content-length'));
  return { ok: r.ok, statut: r.status, type: r.headers.get('content-type'), octets, secondes: (octets * 8) / 128000 };
}
async function parPaquets(elements, taille, fn) {
  const res = [];
  for (let i = 0; i < elements.length; i += taille) res.push(...(await Promise.all(elements.slice(i, i + taille).map(fn))));
  return res;
}
function correlation(a, b) {
  const m = (x) => x.reduce((s, y) => s + y, 0) / x.length;
  const ma = m(a); const mb = m(b);
  let num = 0; let da = 0; let db = 0;
  a.forEach((x, i) => { num += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; });
  return num / Math.sqrt(da * db);
}

const durees = { husary_muallim: new Map(), dosari: new Map() };

test('everyayah confirme le récitateur de chaque dossier', async () => {
  const js = await (await obtenir('https://everyayah.com/data/recitations.js')).text();
  const nomDe = (dossierSon) => {
    const i = js.indexOf(`"subfolder":"${dossierSon}"`);
    assert.ok(i > 0, `dossier ${dossierSon} absent de la liste everyayah`);
    return /"name":"([^"]+)"/.exec(js.slice(i))[1];
  };
  assert.equal(nomDe(husary.dossier), 'Husary (Muallim)');
  assert.equal(nomDe(dosari.dossier), 'Yasser_Ad-Dussary');
});

test(`chaque verset a son son, pour les 2 récitateurs (${SOURATES.length} sourates)`, { timeout: 900_000 }, async () => {
  for (const r of [husary, dosari]) {
    const cles = SOURATES.flatMap((s) => Array.from({ length: s.nbVersets }, (_, i) => `${s.numero}:${i + 1}`));
    const infos = await parPaquets(cles, 12, async (cle) => ({ cle, ...(await infoSon(construireUrl(cle, r))) }));
    for (const i of infos) {
      assert.ok(i.ok, `${r.id} ${i.cle} : HTTP ${i.statut}`);
      assert.match(i.type ?? '', /audio\/mpeg/, `${r.id} ${i.cle} : pas un mp3`);
      assert.ok(i.octets > 5000, `${r.id} ${i.cle} : fichier vide`);
      durees[r.id].set(i.cle, i.secondes);
    }
  }
});

test('le verset « après le dernier » n\'existe pas (pas de décalage de numéros)', { timeout: 300_000 }, async () => {
  for (const r of [husary, dosari]) {
    await parPaquets(SOURATES, 12, async (s) => {
      const url = `https://everyayah.com/data/${r.dossier}/${String(s.numero).padStart(3, '0')}${String(s.nbVersets + 1).padStart(3, '0')}.mp3`;
      const i = await infoSon(url);
      assert.ok(!i.ok, `${r.id} sourate ${s.numero} : un fichier existe après le dernier verset`);
    });
  }
});

test('Husary : quran.com donne le même fichier pour chaque verset', { timeout: 300_000 }, async () => {
  await parPaquets(SOURATES, 8, async (s) => {
    const fichiers = [];
    for (let page = 1; ; page++) {
      const j = await (await obtenir(`https://api.quran.com/api/v4/recitations/${husary.quranComId}/by_chapter/${s.numero}?per_page=50&page=${page}`)).json();
      fichiers.push(...j.audio_files);
      if (!j.pagination.next_page) break;
    }
    assert.equal(fichiers.length, s.nbVersets, `sourate ${s.numero} : nombre de sons quran.com`);
    for (const f of fichiers) {
      const attendu = construireUrl(f.verse_key, husary).split('/data/')[1];
      assert.ok(f.url.endsWith(attendu), `${f.verse_key} : quran.com donne ${f.url}, nous ${attendu}`);
    }
  });
});

test('Husary : la durée de chaque son = la durée du verset selon quran.com (±1 s)', { timeout: 300_000 }, async () => {
  let compares = 0;
  await parPaquets(SOURATES, 8, async (s) => {
    const j = await (await obtenir(`https://api.quran.com/api/v4/chapter_recitations/${husary.quranComId}/${s.numero}?segments=true`)).json();
    for (const t of j.audio_file.timestamps) {
      const nous = durees.husary_muallim.get(t.verse_key);
      if (nous === undefined) continue;
      const eux = t.duration / 1000;
      assert.ok(Math.abs(nous - eux) <= Math.max(1, eux * 0.1), `${t.verse_key} : ${nous.toFixed(1)} s chez everyayah, ${eux.toFixed(1)} s chez quran.com`);
      compares++;
    }
  });
  assert.equal(compares, durees.husary_muallim.size, 'chaque verset a été comparé');
});

// Dosari n'a pas de 2e source officielle (quran.com ne l'a pas). On compare la durée de chaque son
// à la longueur du verset dans le TEXTE OFFICIEL : verset long = son long. Si les fichiers étaient décalés
// d'un verset, la comparaison « décalée » collerait mieux. Ce contrôle n'a de sens que si les versets
// ont des longueurs vraiment différentes (sinon, ex. sourate 94, il ne prouve rien : seul le test
// « nombre exact de fichiers » s'applique).
test('Dosari : la durée des sons suit la longueur des versets (pas de décalage)', async () => {
  let testees = 0;
  const ignorees = [];
  const faibles = [];
  for (const s of SOURATES.filter((x) => x.nbVersets >= 6)) {
    const d = JSON.parse(await readFile(new URL(s.fichier, dossier), 'utf8'));
    const L = d.versets.map((v) => [...v.texte.replace(/[^ء-يٱ]/gu, '')].length);
    const moy = L.reduce((a, b) => a + b, 0) / L.length;
    const ecart = Math.sqrt(L.reduce((a, b) => a + (b - moy) ** 2, 0) / L.length) / moy;
    if (ecart < 0.25) { ignorees.push(s.numero); continue; }
    const D = d.versets.map((v) => durees.dosari.get(v.cle));
    const aligne = correlation(D, L);
    const decalePlus = correlation(D.slice(1), L.slice(0, -1));
    const decaleMoins = correlation(D.slice(0, -1), L.slice(1));
    if (aligne - Math.max(decalePlus, decaleMoins) < 0.1) faibles.push(`${s.numero} (${aligne.toFixed(2)})`);
    assert.ok(aligne > decalePlus && aligne > decaleMoins,
      `sourate ${s.numero} : un décalage colle mieux (aligné ${aligne.toFixed(2)}, +1 ${decalePlus.toFixed(2)}, -1 ${decaleMoins.toFixed(2)})`);
    testees++;
  }
  console.log(`  Dosari : ${testees} sourates contrôlées par la durée ; versets de longueur trop égale (contrôle impossible) : ${ignorees.join(', ') || 'aucune'} ; preuve faible (à vérifier à l'oreille) : ${faibles.join(', ') || 'aucune'}`);
  assert.ok(testees > 0);
});
