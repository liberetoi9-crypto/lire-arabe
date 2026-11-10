import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ajouterTexte, getTextes, getTexte, getTexteDuJour, signalerTexte } from '../../js/textes/api.js';
import { signaler, retirerSignalement } from '../../js/core/signalement.js';

let stockage;
beforeEach(() => {
  stockage = new Map();
  globalThis.localStorage = {
    getItem: k => stockage.get(k) ?? null,
    setItem: (k, v) => stockage.set(k, v),
    removeItem: k => stockage.delete(k),
  };
});
// Valeurs techniques françaises : aucun arabe ni traduction inventés.
const donnees = () => ({ titre: 'Essai', arabe: '  Valeur de test\n<em>sans HTML actif</em>  ', source: 'Source de test', verifie: true });

test('liste vide et texte du jour absent', () => {
  assert.deepEqual(getTextes(), []);
  assert.equal(getTexte('absent'), null);
  assert.equal(getTexteDuJour(), null);
});

test('ajout sans changer les caractères et relecture depuis le stockage', async () => {
  const d = donnees();
  const t = ajouterTexte(d);
  assert.equal(t.arabe, d.arabe);
  assert.equal(getTexte(t.id).arabe, d.arabe);
  const apresRechargement = await import(`../../js/textes/api.js?rechargement=${t.id}`);
  assert.equal(apresRechargement.getTexte(t.id).arabe, d.arabe);
  t.arabe = 'Modification de la copie';
  assert.equal(getTextes()[0].arabe, d.arabe);
  assert.equal(getTexteDuJour().id, getTexteDuJour().id);
  assert.deepEqual([...stockage.keys()], ['la:textes.liste']);
});

test('titre, contenu, source et confirmation exigés', () => {
  for (const cle of ['titre', 'arabe', 'source']) assert.throws(() => ajouterTexte({ ...donnees(), [cle]: ' ' }));
  assert.throws(() => ajouterTexte({ ...donnees(), verifie: false }));
  assert.deepEqual(getTextes(), []);
});

test('traduction fournie avec sa source, jamais ajoutée automatiquement', () => {
  assert.throws(() => ajouterTexte({ ...donnees(), traductionFr: 'Valeur technique' }));
  const t = ajouterTexte({ ...donnees(), traductionFr: ' Valeur technique\n ', sourceTraduction: 'Source de test' });
  assert.equal(getTexte(t.id).traductionFr, ' Valeur technique\n ');
  assert.equal(ajouterTexte(donnees()).traductionFr, '');
});

test('signalement : exclusion liste, lien direct et choix du jour, y compris après rechargement', async () => {
  const t = ajouterTexte(donnees());
  assert.equal(signalerTexte(t.id), true);
  assert.deepEqual(getTextes(), []);
  assert.equal(getTexte(t.id), null);
  assert.equal(getTexteDuJour(), null);
  const recharge = await import(`../../js/textes/api.js?signalement=${t.id}`);
  assert.equal(recharge.getTexte(t.id), null);
});

test('signalement fait par une autre partie respecté', () => {
  const t = ajouterTexte(donnees());
  signaler('texte', t.id);
  assert.equal(getTexte(t.id), null);
});

test('texte remis après une vérification qui retire le signalement partagé', () => {
  const t = ajouterTexte(donnees());
  signalerTexte(t.id);
  retirerSignalement('texte', t.id);
  assert.equal(getTexte(t.id).id, t.id);
});

test('signalement non sauvegardé : échec annoncé et retrait pendant cette ouverture', () => {
  const t = ajouterTexte(donnees());
  globalThis.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(signalerTexte(t.id), false);
  assert.equal(getTexte(t.id), null);
  assert.equal(getTexteDuJour(), null);
});

test('échec de sauvegarde : erreur explicite, aucun ajout fictif', () => {
  globalThis.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => ajouterTexte(donnees()), /pas pu garder/);
  assert.deepEqual(getTextes(), []);
});

test('stockage illisible et anciennes entrées non vérifiées : pas de texte proposé', () => {
  stockage.set('la:textes.liste', '{');
  assert.deepEqual(getTextes(), []);
  stockage.set('la:textes.liste', JSON.stringify([{ id: 'ancien', ...donnees(), verifie: false }]));
  assert.deepEqual(getTextes(), []);
});

test('arabe officiel : conservation caractère par caractère, sans fixture écrite à la main', async t => {
  let sourate;
  const fichier = process.env.CORAN_REVUE
    ? pathToFileURL(process.env.CORAN_REVUE.replaceAll('\\', '/') + '/data/coran/sourates/001.json')
    : new URL('../../data/coran/sourates/001.json', import.meta.url);
  try { sourate = JSON.parse(await readFile(fichier, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') { t.skip('Données C2 pas encore fusionnées sur main'); return; } throw e; }
  const contenu = sourate.versets.map(v => v.texte).join('\n');
  const texte = ajouterTexte({ ...donnees(), arabe: contenu });
  assert.equal(getTexte(texte.id).arabe, contenu);
});
