import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('C9 : chemins GitHub Pages, icônes PNG aux bonnes tailles et absence d’indexation', { skip: !process.env.CORAN_REVUE }, async () => {
  const base = pathToFileURL(process.env.CORAN_REVUE.replaceAll('\\', '/') + '/');
  const manifeste = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
  assert.equal(manifeste.start_url, './');
  assert.equal(manifeste.scope, './');
  assert.equal(manifeste.display, 'standalone');
  for (const taille of [180, 192, 512]) {
    const png = await readFile(new URL(`icones/icone-${taille}.png`, base));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), taille);
    assert.equal(png.readUInt32BE(20), taille);
  }
  const html = await readFile(new URL('index.html', base), 'utf8');
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /rel="manifest" href="manifest.json"/);
  assert.match(html, /rel="apple-touch-icon" href="icones\/icone-180.png"/);
  const main = await readFile(new URL('js/main.js', base), 'utf8');
  const acces = main.indexOf('await demanderAcces()');
  const demarrage = /\bdemarrer\(['"](?:accueil|seance)['"]\)/.exec(main)?.index ?? -1;
  assert.ok(acces >= 0 && demarrage > acces, 'le code d’accès précède le démarrage (Accueil ou Séance)');
});
