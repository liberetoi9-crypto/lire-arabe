// Propriétaire : Claude Code. Partie « Lire » (exercices de fluidité) dans WebKit (moteur de Safari), taille iPhone.
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
  await page.goto(adresse + '#/lire');
  await page.waitForSelector('.carte-exo');
});
after(async () => { await navigateur?.close(); serveur?.close(); });


const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
const tropPetits = () => page.$$eval('button, a', (els) => els
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)])
  .filter(([, h]) => h < 44));
const visibleAuDoigt = (sel) => page.$eval(sel, (b) => { const r = b.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.contains(x); });
const pasDeDefilementLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('menu : « Lire » en premier, 5 onglets, accueil de la partie avec 3 exercices', async () => {
  const onglets = await page.$$eval('nav.menu a', (as) => as.map((a) => a.dataset.onglet));
  assert.deepEqual(onglets, ['lire', 'accueil', 'coran', 'mots', 'plus']);
  assert.equal(await page.getAttribute('nav.menu a.actif', 'data-onglet'), 'lire');
  assert.deepEqual(await page.$$eval('.carte-exo', (c) => c.map((x) => x.dataset.exo)), ['flash', 'groupes', 'recitation']);
  assert.deepEqual(await tropPetits(), []);
  assert.ok(await pasDeDefilementLateral());
});

test('mot flash : le mot vient de la source, disparaît, puis 3 choix ; la bonne réponse est reconnue', async () => {
  const tous = new Set((await Promise.all([1, ...Array.from({ length: 37 }, (_, i) => 78 + i)].map(source))).flatMap((s) => s.versets.flatMap((v) => v.mots.map((m) => m.texte))));
  await page.evaluate(() => { location.hash = '#/lire/flash/court'; });
  await page.waitForSelector('#montrer-mot');
  await page.click('#montrer-mot');
  const mot = await page.textContent('.flash-mot');
  assert.ok(tous.has(mot), 'mot copié du texte officiel');
  await page.waitForSelector('.choix-mot');
  assert.equal(await page.isVisible('.flash-mot'), false, 'le mot a disparu');
  const choix = await page.$$eval('.choix-mot', (b) => b.map((x) => x.textContent));
  assert.equal(choix.length, 3);
  assert.ok(choix.includes(mot));
  await page.click(`.choix-mot >> nth=${choix.indexOf(mot)}`);
  await page.waitForSelector('.choix-mot.juste');
  assert.equal(await page.$$eval('.choix-mot.faux', (b) => b.length), 0);
  // Après la réponse : le sens en français + la mention, puis « Mot suivant ».
  await page.waitForFunction(() => /^« .+ »$/.test(document.querySelector('.sens-flash')?.textContent ?? ''), null, { timeout: 30_000 });
  assert.match(await page.textContent('.flash-cadre .credit'), /traduit de l’anglais \(quran.com\), vérifié avec Hamidullah/);
  assert.ok(await visibleAuDoigt('#mot-suivant'));
  assert.deepEqual(await tropPetits(), []);
  assert.ok(await pasDeDefilementLateral());
});

test('lecture par groupes : texte identique à la source, les groupes s’allument puis le verset entier', async () => {
  const s = await source(112);
  await page.evaluate(() => { location.hash = '#/lire/groupes/112'; });
  await page.waitForSelector('#commencer-groupes');
  await page.click('[data-rythme="rapide"]');
  assert.ok(await visibleAuDoigt('#commencer-groupes'), 'bouton pas caché par le menu');
  await page.click('#commencer-groupes');
  await page.waitForSelector('.groupes-attente .mot.allume');
  const affiche = await page.$$eval('.texte-groupes .mot', (m) => m.map((x) => x.textContent).join(' '));
  assert.equal(affiche, s.versets[0].texte);
  // Sous chaque mot : son sens en français (fichier data/coran/sens-fr.json), dans l'ordre.
  const fr = JSON.parse(await readFile(new URL('data/coran/sens-fr.json', racine), 'utf8')).versets[s.versets[0].cle];
  await page.waitForFunction(() => [...document.querySelectorAll('.texte-groupes .sens-mot')].every((x) => x.textContent), null, { timeout: 30_000 });
  assert.deepEqual(await page.$$eval('.texte-groupes .sens-mot', (m) => m.map((x) => x.textContent)), fr);
  await page.waitForSelector('#verset-suivant', { timeout: 10_000 });
  await page.waitForSelector('.texte-groupes .traduction-lire', { timeout: 30_000 });
  assert.match(await page.textContent('.traduction-lire'), /Hamidullah/);
  assert.ok(await page.isVisible('.groupes-entier'));
  for (let i = 1; i < s.versets.length; i++) { await page.click('#verset-suivant'); await page.waitForSelector('.groupes-attente'); await page.waitForSelector('#verset-suivant', { timeout: 10_000 }); }
  await page.click('#verset-suivant');
  await page.waitForSelector('.bravo');
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('la:lire.stats')));
  assert.ok(stats.groupes['112'].meilleur > 0);
  assert.deepEqual(await tropPetits(), []);
});

test('« Suis la récitation » : texte identique à la source, le son de Husary démarre et le mot dit s’allume', async () => {
  const s = await source(112);
  await page.evaluate(() => { location.hash = '#/lire/recitation/112'; });
  await page.waitForSelector('#ecouter-recitation');
  const affiche = await page.$$eval('.texte-recitation .verset', (ls) => ls.map((l) => [...l.querySelectorAll('.mot')].map((m) => m.textContent).join(' ')));
  assert.deepEqual(affiche, s.versets.map((v) => v.texte));
  assert.equal(await page.textContent('.puce.actif'), '75 %');
  assert.ok(await visibleAuDoigt('#ecouter-recitation'), 'bouton pas caché par le menu');
  assert.equal(new Set(await page.$$eval('.puce', (p) => p.map((x) => Math.round(x.getBoundingClientRect().top)))).size, 1, 'vitesses sur une ligne');
  await page.click('#ecouter-recitation');
  await page.waitForSelector('.texte-recitation .mot.allume', { timeout: 30_000 });
  assert.match(await page.textContent('#ecouter-recitation'), /Pause/);
  assert.deepEqual(await tropPetits(), []);
  assert.ok(await pasDeDefilementLateral());
});
