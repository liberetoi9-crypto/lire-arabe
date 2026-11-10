import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { webkit, devices } = process.env.PLAYWRIGHT_ROOT
  ? await import(pathToFileURL(join(process.env.PLAYWRIGHT_ROOT, 'index.mjs')))
  : await import('playwright');
const racine = new URL('../../', import.meta.url);
const revue = process.env.CORAN_REVUE ? pathToFileURL(process.env.CORAN_REVUE.replaceAll('\\', '/') + '/') : null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let serveur, navigateur, page, adresse;
before(async () => {
  serveur = createServer(async (req, res) => {
    const chemin = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    // Assemblage de TEST seulement : aucun fichier Claude n'est recopié ni modifié.
    const base = revue && /^(data\/|js\/(coran|mots)\/|css\/coran\.css)/.test(chemin) ? revue : racine;
    try { res.setHeader('content-type', types[extname(chemin)] ?? 'application/octet-stream'); res.end(await readFile(new URL(chemin, base))); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => serveur.listen(0, '127.0.0.1', resolve));
  adresse = `http://127.0.0.1:${serveur.address().port}/`;
  navigateur = await webkit.launch();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'] });
  page = await contexte.newPage();
  await page.goto(adresse + '#/exercices');
  await page.waitForSelector('#ecran h2');
});
after(async () => { await navigateur?.close(); serveur?.close(); });

test('WebKit : cinq lectures, compteur, pause et sauvegarde persistante', async () => {
  await page.evaluate(async () => {
    const { lectureRepetee } = await import('/js/exercices/api.js');
    window.tempsTest = 0;
    const ecran = document.getElementById('ecran'); ecran.replaceChildren();
    window.widgetTest = lectureRepetee(ecran, { id: 'texte:chrono', horloge: () => window.tempsTest });
  });
  for (let i = 0; i < 5; i++) {
    await page.click('[data-lecture="demarrer"]');
    await page.evaluate(() => { window.tempsTest += 7000; });
    await page.click('[data-lecture="pause"]');
    await page.evaluate(() => { window.tempsTest += 60000; });
    await page.click('[data-lecture="demarrer"]');
    assert.equal(await page.evaluate(() => window.widgetTest.lecteur.etat), 'lecture');
    await page.evaluate(() => { window.tempsTest += 3000; });
    if (i === 4) await page.check('input[type="checkbox"]');
    assert.equal(await page.evaluate(() => window.widgetTest.lecteur.secondes), 10, `durée avant sauvegarde ${i + 1}`);
    await page.click('[data-lecture="terminer"]');
    assert.equal(await page.textContent('section > p:first-child'), `Lu ${i + 1}/5`);
  }
  const lectures = await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('texte:chrono'));
  assert.deepEqual(lectures.map(l => l.secondes), [10, 10, 10, 10, 10]);
  assert.equal(lectures[4].sansArret, true);
  await page.reload();
  assert.equal(await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('texte:chrono').length), 5);
});

test('WebKit : texte personnel intact, annulation et signalement sans validation fictive', async () => {
  const id = await page.evaluate(async () => {
    const t = (await import('/js/textes/api.js')).ajouterTexte({ titre: 'Texte technique', arabe: '  Charge de test\navec espaces. ', source: 'Source de test', verifie: true });
    location.hash = `#/exercices/texte/${t.id}`; return t.id;
  });
  await page.waitForSelector('[data-lecture="demarrer"]');
  assert.equal(await page.textContent('#ecran .arabe'), '  Charge de test\navec espaces. ');
  await page.click('[data-lecture="demarrer"]');
  await page.click('[data-lecture="annuler"]');
  assert.equal(await page.evaluate(async id => (await import('/js/exercices/api.js')).getLectures(`texte:${id}`).length, id), 0);
  await page.click('[data-lecture="demarrer"]');
  await page.getByRole('button', { name: 'Signaler une erreur' }).click();
  assert.equal(await page.$('#ecran .arabe'), null);
  assert.equal(await page.evaluate(async id => (await import('/js/exercices/api.js')).getLectures(`texte:${id}`).length, id), 0);
});

test('WebKit : sourate exacte, zones de 44 px, aucun débordement et retrait après signalement', { skip: !revue }, async () => {
  await page.evaluate(() => { location.hash = '#/exercices/coran/112'; });
  await page.waitForSelector('#ecran .arabe.coran');
  const s = JSON.parse(await readFile(new URL('data/coran/sourates/112.json', revue), 'utf8'));
  assert.deepEqual(await page.$$eval('#ecran .arabe.coran', ls => ls.map(l => l.textContent)), s.versets.map(v => v.texte));
  assert.equal(await page.evaluate(() => innerWidth), 390);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(await page.$$eval('#ecran button, #ecran select, #ecran a', bs => bs.filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent)), []);
  if (process.env.CAPTURE_X3) await page.screenshot({ path: process.env.CAPTURE_X3, fullPage: true });
  await page.click('[data-lecture="demarrer"]');
  await page.getByRole('button', { name: 'Signaler une erreur' }).first().click();
  assert.equal(await page.$('#ecran .arabe'), null);
  assert.equal(await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:112').length), 0);
});
