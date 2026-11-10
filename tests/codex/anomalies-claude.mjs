// Diagnostic manuel, hors suite normale : reproductions à transmettre à Claude.
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
if (!process.env.CORAN_REVUE) throw new Error('Définir CORAN_REVUE avec la copie de claude/mots.');
const base = pathToFileURL(process.env.CORAN_REVUE.replaceAll('\\', '/') + '/');
const audios = [], temporisateurs = [];
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.Audio = class {
  constructor() { this.evenements = {}; this.duration = 4; audios.push(this); }
  set src(url) { this.url = url; this.currentTime = 0; }
  get src() { return this.url; }
  addEventListener(nom, fn) { this.evenements[nom] = fn; }
  play() { return Promise.resolve(); }
  pause() {}
};
const api = await import(new URL('js/coran/api.js', base));
console.log('C4 : clé inexistante 112:286 acceptée :', api.urlAudio('112:286'));
const lecteur = api.creerLecteur();
const ancienSet = globalThis.setTimeout, ancienClear = globalThis.clearTimeout;
try {
  globalThis.setTimeout = fn => { temporisateurs.push(fn); return temporisateurs.length; };
  globalThis.clearTimeout = () => {};
  lecteur.jouer(['112:1'], { repeteApresMoi: true });
  audios[0].evenements.ended();
  lecteur.jouer(['113:1', '113:2']);
  assert.equal(lecteur.cleCourante, '113:1');
  audios[0].currentTime = 2;
  lecteur.pause(); lecteur.reprendre();
  console.log('C4 : nouvelle lecture puis pause/reprise, attendu temps 2 s, reçu :', audios[0].currentTime);
} finally {
  lecteur.arreter(); globalThis.setTimeout = ancienSet; globalThis.clearTimeout = ancienClear;
}
