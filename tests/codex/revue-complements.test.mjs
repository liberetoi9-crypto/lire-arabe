import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('C4/C5/C11/C12 : contrôle indépendant par les API publiques', { skip: !process.env.CORAN_REVUE }, async () => {
  const base = pathToFileURL(process.env.CORAN_REVUE.replaceAll('\\', '/') + '/');
  const ancienFetch = globalThis.fetch, ancienStockage = globalThis.localStorage, ancienAudio = globalThis.Audio;
  const disque = new Map(), audios = [];
  globalThis.localStorage = { getItem: k => disque.get(k) ?? null, setItem: (k, v) => disque.set(k, v) };
  globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
  globalThis.Audio = class {
    constructor() { this.listeners = {}; this.duree = 0; audios.push(this); }
    addEventListener(nom, fn) { this.listeners[nom] = fn; }
    play() { this.duree++; return Promise.resolve(); }
    pause() {}
  };
  try {
    const api = await import(new URL('js/coran/api.js', base));
    assert.deepEqual(api.getRecitateurs().map(r => r.id), ['husary_muallim', 'dosari']);
    assert.ok(api.getRecitateurs().every(r => r.riwaya === 'hafs'));
    assert.throws(() => api.setRecitateurActif('afasy'));
    const liste = await api.getListeSourates();
    const parTaille = (a, b) => a.nbMots - b.nbMots || a.nbVersets - b.nbVersets || b.numero - a.numero;
    const ordre = [...liste].sort(parTaille).map(s => s.numero);
    assert.deepEqual(await api.ordreParMots(), ordre);
    assert.deepEqual(await api.ordreMemorisation(), [1, ...ordre.filter(n => n >= 78), ...ordre.filter(n => n !== 1 && n < 78)]);
    const frequents = await api.chargerMotsFrequents();
    let totalMots = 0, motsColores = 0;
    for (const info of liste) {
      const s = await api.getSourate(info.numero);
      const avant = JSON.stringify(s);
      const mots = s.versets.flatMap(v => v.mots);
      assert.equal(info.nbMots, mots.length);
      totalMots += mots.length;
      for (const v of s.versets) {
        for (const r of api.getRecitateurs()) {
          const dossier = r.id === 'dosari' ? 'Yasser_Ad-Dussary_128kbps' : 'Husary_Muallim_128kbps';
          assert.equal(api.urlAudio(v.cle, r.id), `https://everyayah.com/data/${dossier}/${String(s.numero).padStart(3, '0')}${String(v.verset).padStart(3, '0')}.mp3`);
        }
        for (const mot of v.mots) if (api.estMotFrequent(mot.texte)) motsColores++;
      }
      assert.equal(JSON.stringify(s), avant, 'la coloration ne touche pas au texte');
    }
    assert.equal(frequents.mots.length, 40);
    assert.ok(motsColores / totalMots > 0.22 && motsColores / totalMots < 0.24);
    api.setRecitateurActif('dosari');
    for (const item of api.getSonsAVerifier()) {
      const cle = `${item.sourate}:1`;
      assert.ok(api.urlAudio(cle).includes('Husary_Muallim'));
      api.noterVerificationSon('dosari', item.sourate, 'ok');
      assert.ok(api.urlAudio(cle).includes('Yasser_Ad-Dussary'));
      api.noterVerificationSon('dosari', item.sourate, 'erreur');
      assert.ok(api.urlAudio(cle).includes('Husary_Muallim'));
      api.noterVerificationSon('dosari', item.sourate, null);
    }
    const lecteur = api.creerLecteur();
    for (const fois of [3, 5, 10]) {
      const audio = audios[0], avant = audio.duree;
      lecteur.boucle('112:1', fois);
      for (let i = 0; i < fois; i++) audio.listeners.ended();
      assert.equal(audio.duree - avant, fois);
      assert.equal(lecteur.enLecture, false);
    }
  } finally {
    globalThis.fetch = ancienFetch; globalThis.localStorage = ancienStockage; globalThis.Audio = ancienAudio;
  }
});
