// Propriétaire : Claude Code. Tests d'ÉCRAN dans WebKit (le moteur de Safari), taille iPhone.
// Lancer : npm run test:ecran   (Internet nécessaire : police, sens des mots, traductions)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { webkit, devices } from 'playwright';
import { EMPREINTE } from '../../../js/core/acces.js';

const racine = new URL('../../../', import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };
let serveur; let navigateur; let page; let adresse;

before(async () => {
  serveur = createServer(async (req, res) => {
    try {
      const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
      const contenu = await readFile(new URL(chemin, racine));
      res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
      res.end(contenu);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  adresse = `http://localhost:${serveur.address().port}/`;
  navigateur = await webkit.launch();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'] });
  // Le téléphone de test a déjà ouvert le cadenas (le code lui-même n'est jamais écrit dans le dépôt).
  await contexte.addInitScript((e) => { if (!localStorage.getItem('la:acces')) localStorage.setItem('la:acces', e); }, EMPREINTE);
  page = await contexte.newPage();
  await page.goto(adresse + '#/coran/112');
  await page.waitForSelector('.verset');
});
after(async () => { await navigateur?.close(); serveur?.close(); });

// Efface les données de test, mais garde le cadenas ouvert.
const vider = () => page.evaluate(() => { const a = localStorage.getItem('la:acces'); localStorage.clear(); if (a) localStorage.setItem('la:acces', a); });
const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
async function aller(hash, selecteur) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(selecteur);
}
// Zones touchables visibles de moins de 44 px de haut (règle iPhone).
const tropPetits = () => page.$$eval('#ecran button, #ecran a, #ecran select, #ecran summary, .panneau button', (els) => els
  .filter((e) => e.offsetParent !== null)
  .map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)])
  .filter(([, h]) => h < 44));

test('Safari : le texte affiché est EXACTEMENT celui de la source, de droite à gauche', async () => {
  for (const n of [112, 1, 78]) {
    await aller(`#/coran/${n}`, `.verset[data-cle="${n}:1"]`);
    const affiche = await page.$$eval('.verset', (ls) => ls.map((l) => [l.dataset.cle, [...l.querySelectorAll('.mot')].map((m) => m.textContent).join(' '), getComputedStyle(l).direction]));
    const s = await source(n);
    assert.equal(affiche.length, s.versets.length);
    affiche.forEach(([cle, texte, sens], i) => {
      assert.equal(cle, s.versets[i].cle);
      assert.equal(texte, s.versets[i].texte, `texte de ${cle}`);
      assert.equal(sens, 'rtl');
    });
  }
});

test('Safari : la police uthmani officielle est chargée', async () => {
  await aller('#/coran/112', '.verset');
  const ok = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('32px UthmanicHafs'); });
  assert.ok(ok);
});

test('iPhone : tous les boutons et liens font au moins 44 px', async () => {
  for (const [hash, sel] of [['#/coran', '.sourate-lien'], ['#/coran/112', '.verset'], ['#/coran/verifier', '.sourate-lien'], ['#/coran/verifier/93', '.verset'], ['#/mots', '#ecran p']]) {
    await aller(hash, sel);
    assert.deepEqual(await tropPetits(), [], hash);
  }
  await aller('#/coran/112', '.verset');
  await page.click('details.reglages-ecoute summary');
  assert.deepEqual(await tropPetits(), [], 'réglages ouverts');
});

test('signaler un verset le met de côté tout de suite, et aux ouvertures suivantes', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:2"]');
  const texte = (await source(112)).versets[1].texte;
  await page.click('.bloc-verset[data-cle="112:2"] button:has-text("Signaler une erreur")');
  await page.waitForSelector('.avis-mis-de-cote[data-cle="112:2"]');
  assert.equal(await page.$('.verset[data-cle="112:2"]'), null, 'texte retiré tout de suite');
  await page.reload();
  await page.waitForSelector('.verset[data-cle="112:1"]');
  assert.equal(await page.$('.verset[data-cle="112:2"]'), null, 'toujours retiré après réouverture');
  assert.ok(!(await page.textContent('#ecran')).includes(texte));
  await page.click('.avis-mis-de-cote button');
  await page.waitForSelector('.verset[data-cle="112:2"]');
  await vider();
});

test('signaler 1:1 retire aussi la basmala des autres sourates', async () => {
  await aller('#/coran/112', '.basmala');
  await page.evaluate(async () => { const m = await import('/js/core/signalement.js'); m.signaler('coran', '1:1'); });
  assert.equal(await page.$('.basmala'), null);
  await aller('#/coran/1', '.avis-mis-de-cote');
  await aller('#/coran/113', '.verset');
  assert.equal(await page.$('.basmala'), null);
  await vider();
});

test('toucher un mot : sens (anglais, quran.com) puis « Ajouter à mes mots » garde sourate et verset', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:1"]');
  await page.click('.verset[data-cle="112:1"] .mot[data-position="3"]');
  await page.waitForFunction(() => { const s = document.querySelector('.panneau .sens'); return s && !s.textContent.startsWith('Chargement'); });
  assert.match(await page.textContent('.panneau .credit'), /Sourate 112, verset 1/);
  await page.click('.panneau button:has-text("Ajouter à mes mots")');
  const mots = await page.evaluate(() => JSON.parse(localStorage.getItem('la:mots.liste')));
  assert.equal(mots.length, 1);
  assert.equal(mots[0].sourate, 112);
  assert.equal(mots[0].verset, 1);
  assert.equal(mots[0].position, 3);
  await page.click('.panneau button:has-text("Fermer")');
  await aller('#/mots', '.mot-liste');
  await page.click('.mot-liste a:has-text("Voir dans le verset")');
  await page.waitForSelector('.mot-cible');
  assert.equal(await page.getAttribute('.mot-cible', 'data-position'), '3');
  assert.equal(page.url().split('#')[1], '/coran/112/1/3');
  await vider();
});

test('traduction du verset : Hamidullah (quran.com) puis Rachid Maach (QuranEnc, avec version)', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:1"]');
  await page.click('.bloc-verset[data-cle="112:1"] button:has-text("Traduction")');
  await page.waitForSelector('.bloc-verset[data-cle="112:1"] .texte-traduction');
  assert.match(await page.textContent('.bloc-verset[data-cle="112:1"] .traduction .credit'), /Hamidullah — quran\.com/);
  await page.click('details.reglages-ecoute summary');
  await page.selectOption('.reglages-ecoute select[aria-label="Traduction française"]', 'rachid');
  await page.click('.bloc-verset[data-cle="112:1"] button:has-text("Traduction")');
  await page.waitForSelector('.bloc-verset[data-cle="112:1"] .texte-traduction');
  const credit = await page.textContent('.bloc-verset[data-cle="112:1"] .traduction .credit');
  assert.match(credit, /Rachid Maach — QuranEnc\.com — version \d+\.\d+\.\d+/);
  assert.match(credit, /Traduit par Rachid Maach/);
  assert.ok(await page.$('.bloc-verset[data-cle="112:1"] a:has-text("Prévenir QuranEnc")'));
  await vider();
});

test("code d'accès : sans le code, rien de l'appli n'est visible ; un faux code est refusé", async () => {
  const autre = await navigateur.newContext({ ...devices['iPhone 13'] });
  const p = await autre.newPage();
  await p.goto(adresse + '#/coran/112');
  await p.waitForSelector('.ecran-code input');
  assert.equal(await p.$('.verset'), null, 'aucun verset avant le code');
  assert.equal(await p.isVisible('nav.menu'), false);
  await p.fill('.ecran-code input', '000000x');
  await p.click('.ecran-code button');
  await p.waitForSelector('.ecran-code .erreur:not([hidden])');
  assert.equal(await p.$('.verset'), null);
  // Avec l'empreinte du bon code déjà gardée dans le téléphone : l'appli s'ouvre directement.
  await p.evaluate((e) => localStorage.setItem('la:acces', e), EMPREINTE);
  await p.reload();
  await p.waitForSelector('.verset');
  assert.equal(await p.$('.ecran-code'), null);
  if (process.env.CODE_ACCES) {
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.fill('.ecran-code input', process.env.CODE_ACCES);
    await p.click('.ecran-code button');
    await p.waitForSelector('.verset');
  }
  await autre.close();
});
