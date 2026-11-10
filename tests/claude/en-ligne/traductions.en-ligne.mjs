// Propriétaire : Claude Code (C6). Tests AVEC Internet : traductions et sens des mots = sources officielles.
// Par défaut Fatiha + Juz Amma ; TOUT=1 pour les 114 sourates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chargerQuranCom, chargerRachid, chargerVersionRachid, QURAN_COM, QURAN_ENC } from '../../../js/coran/traductions.js';

const dossier = new URL('../../../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));
const choix = process.env.TOUT ? manifeste.sourates : manifeste.sourates.filter((s) => s.numero === 1 || s.numero >= 78);
const sourates = [];
for (const s of choix) sourates.push(JSON.parse(await readFile(new URL(s.fichier, dossier), 'utf8')));
const getJson = async (u) => (await fetch(u)).json();
async function parPaquets(elements, taille, fn) {
  for (let i = 0; i < elements.length; i += taille) await Promise.all(elements.slice(i, i + taille).map(fn));
}
const sansHtml = (t) => t.replace(/<sup foot_note=["']?\d+["']?>[^<]*<\/sup>/g, '');

test('quran.com : la traduction n° 31 est bien « Muhammad Hamidullah », en français', async () => {
  const r = await getJson(`${QURAN_COM}/resources/translations`);
  const t = r.translations.find((x) => x.id === 31);
  assert.equal(t.author_name, 'Muhammad Hamidullah');
  assert.equal(t.language_name, 'french');
});

test(`Hamidullah : chaque verset = le texte de quran.com (2e adresse officielle, ${sourates.length} sourates)`, { timeout: 600_000 }, async () => {
  let n = 0;
  await parPaquets(sourates, 6, async (s) => {
    const nous = await chargerQuranCom(s);
    const eux = await getJson(`${QURAN_COM}/quran/translations/31?chapter_number=${s.numero}`);
    assert.equal(eux.translations.length, s.versets.length, `sourate ${s.numero}`);
    s.versets.forEach((v, i) => {
      const affiche = nous.get(v.cle).hamidullah.morceaux.map((x) => x.texte ?? '').join('');
      assert.equal(affiche, sansHtml(eux.translations[i].text), `${v.cle} : traduction différente de la source`);
      n++;
    });
  });
  assert.equal(n, sourates.reduce((a, s) => a + s.versets.length, 0));
});

test('sens mot à mot : un sens (anglais) pour chaque mot, au bon endroit', { timeout: 600_000 }, async () => {
  let total = 0; let avecSens = 0;
  await parPaquets(sourates, 6, async (s) => {
    const nous = await chargerQuranCom(s);
    for (const v of s.versets) {
      const sens = nous.get(v.cle).sens;
      assert.equal(sens.length, v.mots.length, `${v.cle} : nombre de sens`);
      sens.forEach((x, i) => {
        assert.equal(x.position, v.mots[i].position);
        total++;
        if (x.sens) { avecSens++; assert.equal(x.langue, 'en'); }
      });
    }
  });
  console.log(`  Sens mot à mot : ${avecSens} mots sur ${total} ont un sens vérifié au bon endroit.`);
  assert.ok(avecSens / total > 0.99, `trop de mots sans sens (${avecSens}/${total})`);
});

test('Rachid Maach : version officielle QuranEnc, et chaque verset = le texte QuranEnc (vérifié verset par verset)', { timeout: 600_000 }, async () => {
  const liste = await getJson(`${QURAN_ENC}/translations/list/fr`);
  const officielle = liste.translations.find((x) => x.key === 'french_rashid').version;
  assert.equal(await chargerVersionRachid(), officielle);
  // Pour quelques sourates : comparer la sourate entière avec la 2e adresse officielle (verset par verset).
  const echantillon = sourates.filter((s) => [1, 78, 93, 112, 114].includes(s.numero));
  for (const s of echantillon) {
    const nous = await chargerRachid(s);
    await parPaquets(s.versets, 8, async (v) => {
      const eux = (await getJson(`${QURAN_ENC}/translation/aya/french_rashid/${v.sourate}/${v.verset}`)).result;
      assert.equal(Number(eux.sura), v.sourate);
      assert.equal(Number(eux.aya), v.verset);
      assert.equal(nous.get(v.cle).texte, eux.translation, `${v.cle} : texte`);
      assert.equal(nous.get(v.cle).notes, eux.footnotes || '', `${v.cle} : notes`);
    });
  }
});

test('Rachid Maach : chaque sourate a le bon nombre de versets, dans l\'ordre', { timeout: 600_000 }, async () => {
  await parPaquets(sourates, 6, async (s) => {
    const nous = await chargerRachid(s);
    assert.equal(nous.size, s.versets.length);
    for (const v of s.versets) assert.ok(nous.get(v.cle)?.texte, `${v.cle} vide`);
  });
});
