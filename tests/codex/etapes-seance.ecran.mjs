import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ouvrirApp } from './support-navigateur.mjs';

let app, page;
before(async () => { app = await ouvrirApp(); page = app.page; await page.waitForSelector('.ligne-plus'); });
after(async () => app?.fermer());
const cliquer = () => page.click('#ecran .gros-bouton');

test('étape Lis 5 fois : cinq ronds, temps, case fluide, un bouton et texte officiel intact', async () => {
  await page.evaluate(async () => {
    const api = await import('/js/exercices/api.js');
    const verset = await (await import('/js/coran/api.js')).getVerset('112:1');
    const ecran = document.getElementById('ecran'); ecran.replaceChildren();
    const source = document.createElement('p'); source.className = 'arabe coran'; source.textContent = verset.texte;
    ecran.append(source); window.sourceTest = verset.texte; window.tempsTest = 0; window.notifications = 0;
    window.composantTest = api.etapeLectureCinqFois(ecran, { id: 'coran:112', session: 'test', horloge: () => window.tempsTest, surTermine: () => window.notifications++ });
  });
  assert.equal(await page.locator('#ecran .gros-bouton').count(), 1);
  for (let i = 0; i < 5; i++) {
    await page.evaluate(i => { window.tempsTest += (10 - i) * 1000; }, i);
    if (i === 4) await page.getByLabel('J’ai lu sans m’arrêter sur les mots.').check();
    await cliquer();
    assert.equal(await page.getAttribute('#ecran [role="img"]', 'aria-label'), `${i + 1} lectures sur 5`);
  }
  assert.equal(await page.evaluate(() => window.notifications), 1);
  assert.equal(await page.locator('#ecran .gros-bouton').isDisabled(), true);
  assert.equal(await page.evaluate(() => document.querySelector('#ecran .arabe').textContent === window.sourceTest), true);
  const lectures = await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:112'));
  assert.deepEqual(lectures.map(l => l.secondes), [10, 9, 8, 7, 6]);
  assert.equal(lectures[4].sansArret, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.CAPTURE_CINQ) await page.screenshot({ path: process.env.CAPTURE_CINQ });
});

test('étape Chrono : Démarrer / J’ai fini, trois temps gardés et bon record', async () => {
  await page.evaluate(async () => {
    window.composantTest.detruire();
    const ecran = document.getElementById('ecran'); ecran.replaceChildren(); window.tempsTest = 0; window.notifications = 0;
    window.composantTest = (await import('/js/exercices/api.js')).etapeChrono(ecran, { id: 'coran:112', session: 'test', horloge: () => window.tempsTest, surTermine: () => window.notifications++ });
  });
  assert.equal(await page.textContent('#ecran .gros-bouton'), 'Démarrer');
  for (const duree of [5, 8, 4]) {
    await cliquer(); assert.equal(await page.textContent('#ecran .gros-bouton'), 'J’ai fini');
    await page.evaluate(d => { window.tempsTest += d * 1000; }, duree);
    await cliquer();
  }
  assert.equal(await page.evaluate(() => window.notifications), 3);
  assert.equal(await page.evaluate(async () => (await import('/js/exercices/api.js')).getRecordChrono('coran:112')), 4);
  assert.match(await page.textContent('#ecran'), /Ton record : 4,0 s/);
  assert.equal(await page.locator('#ecran .gros-bouton').count(), 1);
  assert.ok(await page.locator('#ecran .gros-bouton').evaluate(b => b.getBoundingClientRect().height >= 44));
});

test('Chrono : arrière-plan en pause et reprise sans compter le temps caché', async () => {
  await cliquer();
  await page.evaluate(() => {
    window.tempsTest += 2000;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange')); window.tempsTest += 100000;
  });
  assert.equal(await page.textContent('#ecran .gros-bouton'), 'Reprendre');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await cliquer(); await page.evaluate(() => { window.tempsTest += 3000; }); await cliquer();
  const derniere = await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:112').at(-1));
  assert.equal(derniere.secondes, 5);
});

test('Chrono : échec de stockage annoncé, réessai sans doublon ni temps supplémentaire', async () => {
  const avant = await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:112').length);
  await cliquer(); await page.evaluate(() => {
    window.tempsTest += 3000; window.setItemOriginal = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
  });
  await cliquer(); assert.equal(await page.textContent('#ecran .gros-bouton'), 'Garder mon temps');
  await page.evaluate(() => { Storage.prototype.setItem = window.setItemOriginal; window.tempsTest += 60000; });
  await cliquer();
  const lectures = await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:112'));
  assert.equal(lectures.length, avant + 1); assert.equal(lectures.at(-1).secondes, 3);
});

test('signalement et destruction empêchent toute validation de la lecture courante', async () => {
  await page.evaluate(async () => {
    window.composantTest.detruire(); const ecran = document.getElementById('ecran'); ecran.replaceChildren();
    window.composantTest = (await import('/js/exercices/api.js')).etapeChrono(ecran, { id: 'coran:113', session: 'test', horloge: () => window.tempsTest });
  });
  await cliquer();
  await page.evaluate(async () => { window.tempsTest += 2000; (await import('/js/core/signalement.js')).signaler('coran', '113:1'); });
  assert.equal(await page.locator('#ecran .gros-bouton').count(), 0);
  assert.match(await page.textContent('#ecran'), /mis de côté/);
  assert.equal(await page.evaluate(async () => (await import('/js/exercices/api.js')).getLectures('coran:113').length), 0);
});
