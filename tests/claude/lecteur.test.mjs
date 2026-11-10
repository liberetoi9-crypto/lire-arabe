// Propriétaire : Claude Code. Lecteur verset par verset, avec un faux « son » (sans navigateur ni Internet).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class FauxAudio {
  constructor() { this.ecouteurs = {}; this._src = ''; this.currentTime = 0; this.paused = true; this.duration = 3; this.playbackRate = 1; }
  set src(v) { this._src = v; this.currentTime = 0; }
  get src() { return this._src; }
  addEventListener(t, f) { (this.ecouteurs[t] ??= []).push(f); }
  play() { this.paused = false; FauxAudio.joues.push(this._src); return Promise.resolve(); }
  pause() { this.paused = true; }
  finir() { this.paused = true; (this.ecouteurs.ended ?? []).forEach((f) => f()); }
}
FauxAudio.joues = [];
globalThis.Audio = FauxAudio;
const { fabriquerLecteur } = await import('../../js/coran/lecteur.js');

let lecteur;
let audio;
beforeEach(() => {
  FauxAudio.joues = [];
  const avant = globalThis.Audio;
  globalThis.Audio = class extends FauxAudio { constructor() { super(); if (!audio || audio.__fini) audio = this; } };
  audio = null;
  lecteur = fabriquerLecteur({ urlPour: (c) => `son-${c}`, recitateurPour: () => 'husary_muallim' });
  globalThis.Audio = avant;
});

test('joue les versets dans l\'ordre, chacun le nombre de fois demandé', () => {
  lecteur.jouer(['1:1', '1:2'], { fois: 2 });
  audio.finir(); audio.finir(); audio.finir();
  assert.deepEqual(FauxAudio.joues, ['son-1:1', 'son-1:1', 'son-1:2', 'son-1:2']);
});

test('défaut Codex : après une pause « répète après moi », une nouvelle lecture puis pause/reprise ne repart pas à 0 s', () => {
  lecteur.jouer(['1:1', '1:2'], { repeteApresMoi: true });
  audio.finir();                       // fin du verset 1:1 → silence pour répéter (suite en attente)
  lecteur.jouer(['1:3']);              // nouvelle lecture pendant le silence
  audio.currentTime = 2;               // on est à 2 s dans 1:3
  lecteur.pause();
  lecteur.reprendre();
  assert.equal(audio.src, 'son-1:3');
  assert.equal(audio.currentTime, 2, 'la reprise continue à 2 s');
});

test('pause puis reprise pendant le silence « répète après moi » : passe au verset suivant', () => {
  lecteur.jouer(['1:1', '1:2'], { repeteApresMoi: true });
  audio.finir();
  lecteur.pause();
  lecteur.reprendre();
  assert.equal(audio.src, 'son-1:2');
});
