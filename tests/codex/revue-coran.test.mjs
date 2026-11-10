// Relecture isolée : CORAN_REVUE pointe vers une copie de la branche Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const racine = process.env.CORAN_REVUE;
test('C2 : comparaison indépendante des 6236 versets aux deux sources en direct', {
  skip: !racine || process.env.SOURCES_EN_LIGNE !== '1', timeout: 60000,
}, async () => {
  const base = pathToFileURL(racine.replaceAll('\\', '/') + '/');
  const charger = async (url) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    assert.equal(r.ok, true, `HTTP ${r.status} : ${url}`);
    return r;
  };
  const [q, t] = await Promise.all([
    charger('https://api.quran.com/api/v4/quran/verses/uthmani').then(r => r.json()),
    charger('https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=true&quranType=uthmani&outType=txt-2&agree=true').then(r => r.text()),
  ]);
  const officiel = new Map(q.verses.map(v => [v.verse_key, v.text_uthmani]));
  const controle = new Map(t.split('\n').flatMap(l => {
    const m = /^(\d+)\|(\d+)\|(.*)$/.exec(l);
    return m ? [[`${m[1]}:${m[2]}`, m[3].trim()]] : [];
  }));
  assert.equal(officiel.size, 6236);
  assert.equal(controle.size, 6236);
  for (let n = 1; n <= 114; n++) {
    const d = JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, base), 'utf8'));
    for (const v of d.versets) {
      assert.equal(v.texte, officiel.get(v.cle), `quran.com ${v.cle}`);
      let texteTanzil = controle.get(v.cle);
      if (v.verset === 1 && n !== 1 && n !== 9) {
        // Tanzil ajoute quatre mots de basmala ; le texte enregistré vient de quran.com.
        texteTanzil = texteTanzil.split(' ').slice(4).join(' ');
      }
      assert.equal(v.texte, texteTanzil, `Tanzil ${v.cle}`);
    }
  }
});

test('C3 : API publique, rejet des mauvaises clés, immutabilité et 114 sourates', { skip: !racine }, async () => {
  const base = pathToFileURL(racine.replaceAll('\\', '/') + '/');
  const ancienFetch = globalThis.fetch;
  globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
  try {
    const api = await import(new URL('js/coran/api.js', base));
    let total = 0;
    for (let n = 1; n <= 114; n++) {
      const s = await api.getSourate(n);
      assert.equal(s.numero, n);
      for (const v of s.versets) {
        assert.equal((await api.getVerset(v.cle)).cle, v.cle);
        assert.equal(v.mots.map(m => m.texte).join(' '), v.texte);
        assert.equal(Object.isFrozen(v), true);
        total++;
      }
    }
    assert.equal(total, 6236);
    for (const cle of ['0:1', '115:1', '1:0', '1:8', '01:1', '1:01', 'invalide']) {
      await assert.rejects(() => api.getVerset(cle));
    }
    assert.equal((await api.getListeSourates()).length, 114);
  } finally { globalThis.fetch = ancienFetch; }
});
