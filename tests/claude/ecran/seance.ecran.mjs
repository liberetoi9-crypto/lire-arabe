// Propriétaire : Claude Code (C7). Une séance du jour COMPLÈTE dans WebKit (moteur de Safari), taille iPhone.
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

test('séance complète : 1 écoute → 2 lis 5 fois → 3 chrono → fin → programme (lecture cochée)', async () => {
  await page.evaluate(() => { location.hash = '#/seance'; });
  await page.waitForSelector('.etapes');
  assert.equal(page.url().split('#')[1], '/seance/1');
  assert.equal(await page.isVisible('nav.menu'), false, 'pas de menu pendant la séance');
  assert.match(await page.textContent('.etapes-texte'), /Étape 1 sur 3/);
  assert.equal(await page.textContent('#titre-ecran'), 'Al-Fatihah');
  // Le texte affiché = la source, verset par verset.
  const s = await source(1);
  const affiche = await page.$$eval('.verset', (ls) => ls.map((l) => [...l.querySelectorAll('.mot')].map((m) => m.textContent).join(' ')));
  assert.deepEqual(affiche, s.versets.map((v) => v.texte));
  assert.deepEqual(await tropPetits(), [], 'étape 1 : 44 px');
  // Écouter : un vrai verset démarre et il est surligné.
  await page.click('#ecouter-seance');
  await page.waitForSelector('.verset.en-cours', { timeout: 30_000 });
  await page.click('#suivant-seance');

  await page.waitForFunction(() => location.hash === '#/seance/2');
  assert.match(await page.textContent('.etapes-texte'), /Étape 2 sur 3/);
  assert.equal(await page.isVisible('#suivant-seance'), false, '« Suivant » caché avant les 5 lectures');
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(150);
    await page.click('[data-etape="lecture-cinq"]');
  }
  await page.waitForSelector('#suivant-seance:not([hidden])');
  assert.deepEqual(await tropPetits(), [], 'étape 2 : 44 px');
  await page.click('#suivant-seance');

  await page.waitForFunction(() => location.hash === '#/seance/3');
  await page.click('[data-etape="chrono"]');
  await page.waitForTimeout(1200);
  await page.click('[data-etape="chrono"]');
  await page.waitForSelector('#suivant-seance:not([hidden])');
  await page.click('#suivant-seance');

  await page.waitForFunction(() => location.hash === '#/seance/fin');
  await page.waitForSelector('.fin-seance');
  assert.match(await page.textContent('.fin-seance'), /Bravo/);
  assert.match(await page.textContent('.demain'), /Sourate suivante : Al-Kawthar/);
  assert.deepEqual(await tropPetits(), [], 'fin : 44 px');
  await page.click('a.gros-bouton');
  await page.waitForSelector('.prog-etapes');
  assert.ok(await page.$('[data-etape="lecture"].fait'), 'programme : lecture cochée');
});

test('fin de séance : « Encore la même » garde la sourate pour demain, « Sourate suivante » avance', async () => {
  const position = () => page.evaluate(() => JSON.parse(localStorage.getItem('la:seance.position')));
  assert.equal(await position(), 1, 'après la séance : sourate suivante');
  await page.evaluate(() => { location.hash = '#/seance/fin'; });
  await page.waitForSelector('.demain');
  await page.click('.choix-demain >> nth=1');
  assert.equal(await position(), 0, 'encore la même');
  await page.click('.choix-demain >> nth=0');
  assert.equal(await position(), 1, 'de nouveau la suivante');
});

test('avec un texte dans « Mes textes » : 4 étapes, la 4e montre le texte tel quel', async () => {
  // Texte de test pris dans la source officielle (aucun arabe écrit à la main).
  const t = (await source(112)).versets[0].texte;
  await page.evaluate((arabe) => localStorage.setItem('la:textes.liste', JSON.stringify([{ id: 'test-seance', titre: 'Texte de test', arabe, source: 'quran.com 112:1 (test)', traductionFr: '', sourceTraduction: '', verifie: true }])), t);
  await page.evaluate(() => { location.hash = '#/seance/4'; });
  await page.waitForSelector('.texte-perso');
  assert.match(await page.textContent('.etapes-texte'), /Étape 4 sur 4/);
  assert.equal(await page.textContent('.texte-perso'), t);
  await page.click('button:has-text("J\'ai lu mon texte")');
  await page.waitForFunction(() => location.hash === '#/seance/fin');
});
