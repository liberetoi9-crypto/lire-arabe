import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ouvrirApp } from './support-navigateur.mjs';

let app, page;
before(async () => { app = await ouvrirApp(); page = app.page; await page.waitForSelector('.ligne-plus'); });
after(async () => app?.fermer());

test('Plus : les six entrées, le verrou, le badge et le bon onglet', async () => {
  const titres = await page.$$eval('.ligne-plus', ls => ls.map(l => l.textContent));
  for (const titre of ['Mes textes', 'Ma progression', 'Mémorisation', 'Sons', 'Réglages', 'Revoir l’explication']) {
    assert.ok(titres.some(t => t.replaceAll("'", '’').includes(titre)), titre);
  }
  assert.equal(titres.length, 6);
  assert.equal(await page.getAttribute('.ligne-plus.verrouillee', 'href'), null);
  assert.equal(await page.getAttribute('.ligne-plus.verrouillee', 'aria-disabled'), 'true');
  assert.equal(await page.textContent('.menu a[aria-current="page"]'), 'Plus');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(await page.$$eval('.ligne-plus', ls => ls.filter(l => l.getBoundingClientRect().height < 44).map(l => l.textContent)), []);
  if (process.env.CAPTURE_PLUS) await page.screenshot({ path: process.env.CAPTURE_PLUS, fullPage: true });
});

test('Mes textes : une action principale, ajout intact et retour vers Plus', async () => {
  await page.getByRole('link', { name: 'Mes textes', exact: true }).click();
  await page.waitForSelector('#ecran .gros-bouton');
  assert.equal(await page.locator('#ecran .gros-bouton').count(), 1);
  assert.equal(await page.getAttribute('#bouton-retour', 'href'), '#/plus');
  await page.getByRole('link', { name: 'Ajouter un texte', exact: true }).click();
  await page.getByLabel('Titre', { exact: true }).fill('Mon texte de test');
  await page.getByLabel('Texte arabe vérifié').fill('  Charge technique\n inchangée. ');
  await page.getByLabel('Source du texte', { exact: true }).fill('Source de test');
  await page.locator('[name="verifie"]').check();
  await page.getByRole('button', { name: 'Garder ce texte', exact: true }).click();
  await page.waitForSelector('#ecran .arabe');
  assert.equal(await page.textContent('#ecran .arabe'), '  Charge technique\n inchangée. ');
  assert.equal(await page.locator('#ecran .gros-bouton').count(), 1);
  assert.equal(await page.textContent('.menu a[aria-current="page"]'), 'Plus');
});

test('Mes textes : vitesse cachée derrière la roue, feuille commune et zones touchables', async () => {
  assert.equal(await page.locator('#ecran select:visible').count(), 0);
  await page.click('#bouton-reglages');
  await page.waitForSelector('.feuille');
  assert.equal(await page.getByLabel('Vitesse', { exact: true }).isVisible(), true);
  await page.getByLabel('Vitesse', { exact: true }).selectOption('lent');
  assert.deepEqual(await page.$$eval('.feuille select', ls => ls.filter(l => l.getBoundingClientRect().height < 44).map(l => l.textContent)), []);
  await page.evaluate(() => { location.hash = '#/plus'; });
  await page.waitForSelector('.ligne-plus');
  assert.equal(await page.locator('.feuille').count(), 0);
});

test('Réglages : style commun, retour vers Plus et accès aux réglages Coran', async () => {
  await page.getByRole('link', { name: 'Réglages', exact: true }).click();
  await page.waitForSelector('#ecran .gros-bouton');
  assert.equal(await page.textContent('#ecran .gros-bouton'), 'Ouvrir le Coran');
  assert.equal(await page.getAttribute('#bouton-retour', 'href'), '#/plus');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});
