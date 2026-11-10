// Propriétaire : Claude Code (C4). Tests SANS Internet : liste des récitateurs et adresse du son de chaque verset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RECITATEURS, RIWAYAT, RIWAYA_TEXTE, recitateursDisponibles, trouverRecitateur, construireUrl } from '../../js/coran/recitateurs.js';

const dossier = new URL('../../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));

test('liste fermée : seulement Husary mu\'allim et Yasser Al-Dosari, en Hafs', () => {
  assert.deepEqual(RECITATEURS.map((r) => r.id), ['husary_muallim', 'dosari']);
  assert.deepEqual(recitateursDisponibles().map((r) => r.id), ['husary_muallim', 'dosari']);
  assert.deepEqual(RECITATEURS.map((r) => r.dossier), ['Husary_Muallim_128kbps', 'Yasser_Ad-Dussary_128kbps']);
  for (const r of RECITATEURS) assert.equal(r.riwaya, 'hafs');
  assert.equal(RECITATEURS.filter((r) => r.principal).length, 1);
  assert.equal(RECITATEURS.find((r) => r.principal).id, 'husary_muallim');
});

test('aucun récitateur interdit (Afasy) et aucun son Warsh', () => {
  const tout = JSON.stringify(RECITATEURS).toLowerCase();
  assert.ok(!tout.includes('afasy') && !tout.includes('alafasy'));
  assert.ok(!tout.includes('warsh'));
  assert.equal(RIWAYA_TEXTE, 'hafs');
  assert.equal(RIWAYAT.warsh.actif, false);
  assert.ok(Object.isFrozen(RECITATEURS));
});

test('un récitateur inconnu ou Warsh est refusé', () => {
  assert.throws(() => trouverRecitateur('mishary_afasy'));
  const fauxWarsh = { ...RECITATEURS[0], riwaya: 'warsh' };
  assert.throws(() => construireUrl('1:1', fauxWarsh), /Riwaya/);
});

test('les 6236 versets × 2 récitateurs : chaque adresse pointe vers le bon dossier et le bon verset', async () => {
  let n = 0;
  for (const s of manifeste.sourates) {
    for (let v = 1; v <= s.nbVersets; v++) {
      for (const r of RECITATEURS) {
        const url = construireUrl(`${s.numero}:${v}`, r);
        const m = /^https:\/\/everyayah\.com\/data\/([^/]+)\/(\d{3})(\d{3})\.mp3$/.exec(url);
        assert.ok(m, url);
        assert.equal(m[1], r.dossier, `récitateur de ${url}`);
        assert.equal(Number(m[2]), s.numero, `sourate de ${url}`);
        assert.equal(Number(m[3]), v, `verset de ${url}`);
        n++;
      }
    }
  }
  assert.equal(n, 6236 * 2);
});

test('clés de verset invalides refusées', () => {
  for (const cle of ['0:1', '115:1', '1:0', '1:300', 'abc', '1-1', '']) {
    assert.throws(() => construireUrl(cle, RECITATEURS[0]), undefined, cle);
  }
});

// ---- Sons de Dosari à vérifier par Zakou (10/11) ----
import { SOURATES_A_VERIFIER, etatVerification, recitateurEffectif } from '../../js/coran/recitateurs.js';

test('les 11 sourates de Dosari à vérifier sont bien listées', () => {
  assert.deepEqual([...SOURATES_A_VERIFIER.dosari], [72, 76, 88, 92, 93, 94, 96, 102, 104, 107, 109]);
  assert.equal(SOURATES_A_VERIFIER.husary_muallim, undefined);
});

test('pas encore vérifié → Husary joue à la place de Dosari', () => {
  for (const s of SOURATES_A_VERIFIER.dosari) {
    assert.equal(etatVerification('dosari', s, {}), 'a-verifier');
    assert.equal(recitateurEffectif('dosari', s, {}), 'husary_muallim', `sourate ${s}`);
  }
});

test('« Vérifié, c\'est bon » → Dosari joue ; « Erreur » → Husary reste', () => {
  assert.equal(recitateurEffectif('dosari', 93, { 'dosari:93': { etat: 'ok' } }), 'dosari');
  assert.equal(recitateurEffectif('dosari', 94, { 'dosari:93': { etat: 'ok' } }), 'husary_muallim');
  assert.equal(recitateurEffectif('dosari', 93, { 'dosari:93': { etat: 'erreur' } }), 'husary_muallim');
});

test('les autres sourates : le récitateur choisi joue normalement', () => {
  assert.equal(recitateurEffectif('dosari', 112, {}), 'dosari');
  assert.equal(recitateurEffectif('dosari', 1, {}), 'dosari');
  assert.equal(recitateurEffectif('husary_muallim', 93, {}), 'husary_muallim');
  assert.equal(etatVerification('dosari', 112, {}), 'sans-objet');
});

// ---- Défauts trouvés par Codex (10/11) ----
import { NB_VERSETS } from '../../js/coran/nb-versets.js';

test('un verset qui n\'existe pas est refusé (ex. 112:5, 112:286)', () => {
  assert.deepEqual([...NB_VERSETS], manifeste.sourates.map((s) => s.nbVersets), 'nombres = manifeste');
  for (const cle of ['112:5', '112:286', '1:8', '114:7']) assert.throws(() => construireUrl(cle, RECITATEURS[0]), /inexistant/, cle);
  for (const cle of ['112:4', '2:286', '1:7', '114:6']) assert.doesNotThrow(() => construireUrl(cle, RECITATEURS[0]), cle);
});
