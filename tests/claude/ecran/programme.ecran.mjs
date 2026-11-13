// Propriétaire : Claude Code. « Mon programme » dans WebKit (moteur de Safari), taille iPhone : un jour complet.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { webkit, devices } from 'playwright';
import { EMPREINTE } from '../../../js/core/acces.js';

const racine = new URL('../../../', import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
let serveur; let navigateur; let page; let adresse;

before(async () => {
  serveur = createServer(async (req, res) => {
    try {
      const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
      res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
      res.end(await readFile(new URL(chemin, racine)));
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  adresse = `http://localhost:${serveur.address().port}/`;
  navigateur = await webkit.launch();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'] });
  await contexte.addInitScript((e) => {
    if (!localStorage.getItem('la:acces')) localStorage.setItem('la:acces', e);
    if (!localStorage.getItem('la:accueil.bienvenueVue')) localStorage.setItem('la:accueil.bienvenueVue', 'true');
  }, EMPREINTE);
  page = await contexte.newPage();
  await page.goto(adresse + '#/accueil');
  await page.waitForSelector('.accueil');
});
after(async () => { await navigateur?.close(); serveur?.close(); });

const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
const tropPetits = () => page.$$eval('button, a, select', (els) => els
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)])
  .filter(([, h]) => h < 44));
const aller = async (hash, sel) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForSelector(sel); };
const fait = (id) => page.$(`[data-etape="${id}"].fait`).then(Boolean);
const changerJour = (fn) => page.evaluate((code) => {
  const j = JSON.parse(localStorage.getItem('la:programme.jour'));
  new Function('j', code)(j);
  localStorage.setItem('la:programme.jour', JSON.stringify(j));
}, fn);

test('accueil : « Commencer le jour 1 » mène au programme (5 étapes, révision cochée car aucun mot)', async () => {
  assert.match(await page.textContent('#commencer'), /Commencer le jour 1/);
  await page.click('#commencer');
  await page.waitForSelector('.prog-etapes');
  assert.equal(await page.textContent('.prog-jour'), 'Jour 1');
  assert.deepEqual(await page.$$eval('.prog-etape', (l) => l.map((e) => e.dataset.etape)), ['revision', 'lecon', 'lecture', 'mots', 'arabe']);
  assert.ok(await fait('revision'));
  assert.ok(!(await fait('lecon')));
  assert.equal(await page.$('#finir-jour'), null, 'pas de « Finir » avant les étapes');
  assert.ok((await page.$$('.prog-rappel')).length >= 3, 'rappels de la Sunna');
  assert.deepEqual(await tropPetits(), [], 'programme : 44 px');
});

test('règle du jour : explication, 6 vrais mots du Coran, exercice réussi → étape cochée', async () => {
  await page.click('[data-etape="lecon"]');
  await page.waitForSelector('.prog-exemple');
  assert.match(await page.textContent('.prog-lecon h2'), /La fatha/);
  const ex = await page.$$eval('.prog-exemple', (l) => l.map((e) => [e.querySelector('.prog-mot').dataset.texte, e.querySelector('small').textContent]));
  assert.equal(ex.length, 6);
  for (const [texte, cle] of ex) {
    const s = await source(Number(cle.split(':')[0]));
    assert.ok(s.versets.find((v) => v.cle === cle).mots.some((m) => m.texte === texte), `${cle} : mot tel quel`);
  }
  assert.ok(await page.$('.prog-mot .surligne'), 'lettres en couleur');
  assert.deepEqual(await page.$$eval('.prog-mot', (l) => l.filter((e) => e.textContent.replace(/‍/g, '') !== e.dataset.texte).length), 0, 'affiché = texte officiel (+ joints invisibles seulement)');
  await page.click('#lancer-exo');
  await page.waitForSelector('.prog-choix');
  for (const b of await page.$$('.prog-choix[data-bon="true"]')) await b.click();
  await page.click('#verifier');
  assert.match(await page.textContent('.prog-score'), /8 \/ 8/);
  assert.deepEqual(await tropPetits(), [], 'exercice : 44 px');
  await page.click('.prog-fin a.gros-bouton');
  await page.waitForSelector('.prog-etapes');
  assert.ok(await fait('lecon'));
});

test('exercice raté (tout coché) → « On recommence », étape pas cochée', async () => {
  await changerJour('delete j.faites.lecon;');
  await aller('#/programme/lecon/6', '#lancer-exo');
  await page.click('#lancer-exo');
  await page.waitForSelector('.prog-choix');
  for (const b of await page.$$('.prog-choix')) await b.click();
  await page.click('#verifier');
  assert.match(await page.textContent('.prog-score'), /4 \/ 8/);
  assert.ok(await page.$('#recommencer'));
  await aller('#/programme', '.prog-etapes');
  assert.ok(!(await fait('lecon')));
  await changerJour('j.faites.lecon = true;');
});

test('5 mots du jour : sens en français, « Je garde » → dans Mes mots, étape cochée', async () => {
  await aller('#/programme/mots', '.prog-mot-sens');
  const sens = await page.$$eval('.prog-mot-sens .sens', (l) => l.map((e) => e.textContent));
  assert.equal(sens.length, 5);
  assert.ok(sens.every((s) => s && !/[؀-ۿ]/.test(s)));
  await page.click('#garder-mots');
  await page.waitForSelector('.prog-etapes');
  assert.ok(await fait('mots'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('la:mots.liste') ?? '[]').length), 5);
});

test('jour pas fini → repris le lendemain ; les mots gardés sont à réviser', async () => {
  await changerJour("j.date = '2000-01-01';");
  await aller('#/accueil', '.accueil');
  assert.match(await page.textContent('#commencer'), /Continuer le jour 1/);
  await aller('#/programme', '.prog-etapes');
  assert.equal(await page.textContent('.prog-jour'), 'Jour 1');
  assert.ok(!(await fait('revision')), 'mots ajoutés = à réviser');
});

test('arabe : leçon en français, pas d’arabe tant que pas vérifié ; puis « Finir le jour 1 » → accueil', async () => {
  await aller('#/programme/arabe', '.prog-lecon');
  assert.match(await page.textContent('.prog-lecon h2'), /Leçon 1/);
  assert.ok(!/[؀-ۿ]/.test(await page.textContent('#ecran')));
  assert.ok(await page.$('.prog-attente'));
  await page.click('#arabe-fait');
  await page.waitForSelector('.prog-etapes');
  assert.ok(await fait('arabe'));
  await changerJour('j.faites.revision = true;');
  await page.evaluate(() => localStorage.setItem('la:seance.dernierJour', JSON.stringify(new Date().toLocaleDateString('sv'))));
  await aller('#/accueil', '.accueil');
  await aller('#/programme', '#finir-jour');
  assert.ok(await fait('lecture'));
  await page.click('#finir-jour');
  await page.waitForSelector('.bravo');
  assert.match(await page.textContent('#ecran'), /Jour 1 fini/);
  await aller('#/accueil', '.accueil');
  assert.match(await page.textContent('.accueil'), /Jour 1 fini/);
});

test('rappels de la Sunna : la page complète, chaque rappel a sa source', async () => {
  await aller('#/programme/sunna', '.prog-rappel');
  const avecSource = await page.$$eval('.prog-rappel', (l) => l.filter((e) => /Source :/.test(e.textContent)).length);
  assert.equal(avecSource, (await page.$$('.prog-rappel')).length);
  assert.match(await page.textContent('#ecran'), /al-Kahf/);
  assert.deepEqual(await tropPetits(), [], 'sunna : 44 px');
});
