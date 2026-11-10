// Propriétaire : Claude Code. Tests d'ÉCRAN dans WebKit (le moteur de Safari), taille iPhone.
// Lancer : npm run test:ecran   (Internet nécessaire : police, sens des mots, traductions)
// Nouvelle mise en page (C13/C14) : menu 4 onglets, ⚙️, barre du bas, feuilles qui montent du bas.
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
      const contenu = await readFile(new URL(chemin, racine));
      res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
      res.end(contenu);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  adresse = `http://localhost:${serveur.address().port}/`;
  navigateur = await webkit.launch();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'] });
  // Téléphone de test : cadenas déjà ouvert (le code n'est jamais écrit dans le dépôt) et explication déjà vue.
  await contexte.addInitScript((e) => {
    if (!localStorage.getItem('la:acces')) localStorage.setItem('la:acces', e);
    if (!localStorage.getItem('la:accueil.bienvenueVue')) localStorage.setItem('la:accueil.bienvenueVue', 'true');
  }, EMPREINTE);
  // On note chaque son vraiment lancé (fichier everyayah) pour vérifier le bon récitateur.
  await contexte.addInitScript(() => {
    window.__joues = [];
    const jouer = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__joues.push(this.src.split('/data/')[1]); return jouer.call(this); };
  });
  page = await contexte.newPage();
  await page.goto(adresse + '#/coran/112');
  await page.waitForSelector('.verset');
});
after(async () => { await navigateur?.close(); serveur?.close(); });

// Efface les données de test, mais garde le cadenas ouvert et l'explication vue.
const vider = () => page.evaluate(() => {
  const garder = ['la:acces', 'la:accueil.bienvenueVue'].map((k) => [k, localStorage.getItem(k)]);
  localStorage.clear();
  garder.forEach(([k, v]) => v && localStorage.setItem(k, v));
});
const source = async (n) => JSON.parse(await readFile(new URL(`data/coran/sourates/${String(n).padStart(3, '0')}.json`, racine), 'utf8'));
async function aller(hash, selecteur) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(selecteur);
}
const fermerFeuille = async () => { await page.click('.voile', { position: { x: 10, y: 10 } }); await page.waitForSelector('.feuille', { state: 'detached' }); };
// Zones touchables visibles de moins de 44 px (règle iPhone).
const tropPetits = () => page.$$eval('button, a, select', (els) => els
  .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
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

test('menu du bas : 4 onglets (icône + mot), tous visibles, sans défilement', async () => {
  await aller('#/accueil', '.accueil');
  const onglets = await page.$$eval('.menu a', (as) => as.map((a) => [a.textContent.trim(), Boolean(a.querySelector('svg'))]));
  assert.deepEqual(onglets, [['Accueil', true], ['Coran', true], ['Mes mots', true], ['Plus', true]]);
  assert.ok(await page.$eval('.menu', (m) => m.scrollWidth <= m.clientWidth));
});

test('accueil : un seul gros bouton « Commencer ma séance du jour »', async () => {
  await vider();
  await aller('#/accueil', '.accueil');
  assert.equal(await page.$$eval('#ecran .gros-bouton', (b) => b.length), 1);
  assert.match(await page.textContent('#ecran .gros-bouton'), /Commencer ma séance du jour/);
  assert.equal(await page.$$eval('#ecran button, #ecran a', (b) => b.length), 1, 'rien d\'autre à toucher');
});

test('première ouverture : 3 écrans d\'explication, « Passer » mène à l\'accueil', async () => {
  // Téléphone neuf : cadenas ouvert, explication jamais vue.
  const neuf = await navigateur.newContext({ ...devices['iPhone 13'] });
  await neuf.addInitScript((e) => { if (!localStorage.getItem('la:acces')) localStorage.setItem('la:acces', e); }, EMPREINTE);
  const p = await neuf.newPage();
  await p.goto(adresse);
  await p.waitForSelector('.bienvenue');
  assert.equal(await p.isVisible('nav.menu'), false);
  assert.equal(await p.$$eval('.bienvenue .points i', (i) => i.length), 3);
  await p.click('.bienvenue .gros-bouton');
  await p.waitForFunction(() => location.hash === '#/bienvenue/1');
  await p.click('.bienvenue .passer');
  await p.waitForSelector('.accueil');
  await p.reload();
  await p.waitForSelector('.accueil');
  assert.equal(await p.$('.bienvenue'), null, 'ne revient plus');
  await neuf.close();
});

test('iPhone : tous les boutons et liens font au moins 44 px', async () => {
  for (const [hash, sel] of [['#/accueil', '.accueil'], ['#/coran', '.ligne-sourate'], ['#/coran/toutes', '.ligne-sourate'], ['#/coran/112', '.verset'], ['#/coran/verifier', '.ligne-sourate'], ['#/coran/verifier/93', '.verset'], ['#/mots', '#ecran p']]) {
    await aller(hash, sel);
    assert.deepEqual(await tropPetits(), [], hash);
  }
  await aller('#/coran/112', '.verset');
  await page.click('#bouton-reglages');
  await page.waitForSelector('.feuille');
  assert.deepEqual(await tropPetits(), [], 'réglages ⚙️ ouverts');
  await fermerFeuille();
});

test('lecture : les réglages sont cachés derrière ⚙️, barre du bas Écouter / Répéter / Traduction', async () => {
  await aller('#/coran/112', '.verset');
  assert.equal(await page.$('#ecran select'), null, 'aucun réglage affiché en permanence');
  assert.deepEqual(await page.$$eval('.barre-actions .action', (b) => b.map((x) => x.textContent.trim())), ['Écouter', 'Répéter', 'Traduction']);
  await page.click('#bouton-reglages');
  const titres = await page.$$eval('.feuille .ligne-reglage > span', (s) => s.map((x) => x.textContent));
  assert.deepEqual(titres.slice(0, 5), ['Récitateur', 'Vitesse', 'Répéter chaque verset', 'Traduction', 'Petits mots en couleur']);
  await fermerFeuille();
});

test('appui long sur un verset → « Signaler une erreur » : mis de côté tout de suite et aux ouvertures suivantes', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:2"]');
  const texte = (await source(112)).versets[1].texte;
  await page.click('.bloc-verset[data-cle="112:2"] .mot >> nth=0', { delay: 800 });
  await page.click('.feuille button:has-text("Signaler une erreur")');
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
  await aller('#/coran/113', '.verset');
  assert.equal(await page.$('.basmala'), null);
  await vider();
});

test('toucher un mot : sens (anglais, quran.com) puis « Ajouter à mes mots » ; Mes mots ramène au verset', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:1"]');
  await page.click('.verset[data-cle="112:1"] .mot[data-position="3"]');
  await page.waitForFunction(() => { const s = document.querySelector('.feuille .sens'); return s && !s.textContent.startsWith('Chargement'); });
  assert.match(await page.textContent('.feuille .credit'), /Sourate 112, verset 1/);
  await page.click('.feuille .gros-bouton');
  const mots = await page.evaluate(() => JSON.parse(localStorage.getItem('la:mots.liste')));
  assert.deepEqual([mots.length, mots[0].sourate, mots[0].verset, mots[0].position], [1, 112, 1, 3]);
  await fermerFeuille();
  await aller('#/mots', '.ligne-mot');
  assert.match(await page.textContent('.ligne-mot'), /quran\.com/, 'la source du sens est affichée');
  await page.click('.ligne-mot');
  await page.waitForSelector('.mot-cible');
  assert.equal(await page.getAttribute('.mot-cible', 'data-position'), '3');
  assert.equal(page.url().split('#')[1], '/coran/112/1/3');
  await vider();
});

test('traduction : bouton du bas → Hamidullah (quran.com) ; ⚙️ → Rachid Maach (QuranEnc, avec version)', async () => {
  await vider();
  await aller('#/coran/112', '.verset[data-cle="112:1"]');
  await page.click('#action-traduction');
  await page.waitForSelector('.bloc-verset[data-cle="112:1"] .texte-traduction', { timeout: 60_000 });
  await page.waitForSelector('#credit-traduction');
  assert.match(await page.textContent('#credit-traduction'), /Hamidullah — quran\.com/);
  await page.click('#bouton-reglages');
  await page.selectOption('.feuille select[aria-label="Traduction"]', 'rachid');
  await fermerFeuille();
  await page.waitForFunction(() => /QuranEnc/.test(document.getElementById('credit-traduction')?.textContent ?? ''), null, { timeout: 60_000 });
  const credit = await page.textContent('#credit-traduction');
  assert.match(credit, /Rachid Maach — QuranEnc\.com — version \d+\.\d+\.\d+/);
  assert.match(credit, /Traduit par Rachid Maach/);
  assert.match(credit, /Prévenir QuranEnc/);
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
  await p.evaluate((e) => { localStorage.setItem('la:acces', e); localStorage.setItem('la:accueil.bienvenueVue', 'true'); }, EMPREINTE);
  await p.reload();
  await p.waitForSelector('.verset');
  if (process.env.CODE_ACCES) {
    await p.evaluate(() => localStorage.removeItem('la:acces'));
    await p.reload();
    await p.fill('.ecran-code input', process.env.CODE_ACCES);
    await p.click('.ecran-code button');
    await p.waitForSelector('.verset');
  }
  await autre.close();
});

// Défaut vu par Zakou le 10/11 : après avoir écouté une autre sourate, « Sons à vérifier » jouait Husary.
test('« Sons à vérifier » joue TOUJOURS Dosari, même après une autre sourate ; la lecture normale reste sur Husary', async () => {
  await vider();
  const ecouter = async () => {
    await page.evaluate(() => { window.__joues = []; });
    await page.click('#action-ecouter');
    await page.waitForFunction(() => window.__joues.length > 0);
    return page.evaluate(() => window.__joues[0]);
  };
  await aller('#/coran/112', '.verset');
  assert.equal(await ecouter(), 'Husary_Muallim_128kbps/112001.mp3');
  for (const n of [93, 72, 109]) {
    await aller(`#/coran/verifier/${n}`, `.verset[data-cle="${n}:1"]`);
    assert.equal(await ecouter(), `Yasser_Ad-Dussary_128kbps/${String(n).padStart(3, '0')}001.mp3`, `sourate ${n}`);
  }
  // Retour à la lecture normale d'une sourate pas encore vérifiée (Dosari choisi) : Husary.
  await page.evaluate(() => localStorage.setItem('la:coran.recitateur', JSON.stringify('dosari')));
  await aller('#/coran/93', '.verset[data-cle="93:1"]');
  assert.equal(await ecouter(), 'Husary_Muallim_128kbps/093001.mp3');
  await vider();
});
