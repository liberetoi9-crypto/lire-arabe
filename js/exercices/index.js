// Propriétaire : Codex (tâche X3/X4).
import { enregistrerEcran } from '../core/routeur.js';
import * as coran from '../coran/api.js';
import { getTextes, getTexte } from '../textes/api.js';
import { boutonSignaler, estSignale } from '../core/signalement.js';
import { on } from '../core/bus.js';
import { lectureRepetee } from './api.js';

const el = (tag, props = {}, ...enfants) => {
  const e = Object.assign(document.createElement(tag), props);
  if (tag === 'a') Object.assign(e.style, { display: 'inline-flex', alignItems: 'center', minHeight: '44px' });
  e.append(...enfants); return e;
};
let nettoyer = () => {}, generation = 0;
window.addEventListener('hashchange', () => nettoyer());
enregistrerEcran('exercices', { titre: 'Exercices', afficher: afficherExercices });

export async function afficherExercices(conteneur, params = []) {
  nettoyer(); nettoyer = () => {};
  const tour = ++generation, adresse = location.hash;
  conteneur.replaceChildren();
  if (!params.length) {
    conteneur.append(el('h2', { textContent: 'Lire cinq fois' }), el('p', { textContent: 'Choisis un texte. Lis-le cinq fois et garde tes temps.' }));
    const textes = getTextes();
    conteneur.append(el('h3', { textContent: 'Mes textes' }));
    if (!textes.length) conteneur.append(el('p', { textContent: 'Ajoute un texte vérifié pour commencer.' }), el('a', { href: '#/textes/ajouter', textContent: 'Ajouter un texte' }));
    for (const t of textes) conteneur.append(el('p', { className: 'carte' }, el('a', { href: `#/exercices/texte/${t.id}`, textContent: t.titre })));
    conteneur.append(el('h3', { textContent: 'Coran' }));
    try {
      if (typeof coran.getListeSourates !== 'function') throw new Error('Le Coran n’est pas disponible pour le moment.');
      const liste = await coran.getListeSourates();
      const ordre = await coran.ordreJuzAmma();
      if (tour !== generation || location.hash !== adresse) return;
      const choix = el('select', { id: 'lecture-sourate' });
      Object.assign(choix.style, { minHeight: '44px', maxWidth: '100%', fontSize: '1rem' });
      for (const n of [1, ...ordre]) {
        const s = liste.find(s => s.numero === n);
        if (s) choix.append(el('option', { value: n, textContent: `${n}. ${s.nom}` }));
      }
      const ouvrir = el('button', { type: 'button', textContent: 'Lire cette sourate' });
      ouvrir.addEventListener('click', () => { location.hash = `#/exercices/coran/${choix.value}`; });
      conteneur.append(el('label', { htmlFor: choix.id, textContent: 'Choisir une sourate' }), el('p', {}, choix), ouvrir);
    } catch (e) { if (tour === generation && location.hash === adresse) conteneur.append(el('p', { textContent: e.message })); }
    return;
  }
  conteneur.append(el('a', { href: '#/exercices', textContent: 'Retour aux exercices' }));
  let id, cles = [];
  const lecture = el('div');
  if (params[0] === 'texte') {
    const t = getTexte(params[1]);
    if (!t) throw new Error('Ce texte est absent ou mis de côté.');
    id = `texte:${t.id}`;
    const arabe = el('p', { className: 'arabe', lang: 'ar', dir: 'rtl', textContent: t.arabe });
    Object.assign(arabe.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
    lecture.append(el('h2', { textContent: t.titre }), arabe, el('p', { textContent: `Source : ${t.source}` }), boutonSignaler('texte', t.id));
    cles = [t.id];
  } else if (params[0] === 'coran') {
    const n = Number(params[1]), s = await coran.getSourate(n);
    if (tour !== generation || location.hash !== adresse) return;
    if (s.numero !== n || s.versets.length !== s.nbVersets
      || s.versets.some((v, i) => v.cle !== `${n}:${i + 1}` || v.sourate !== n || v.verset !== i + 1)) throw new Error('Les numéros des versets ne correspondent pas.');
    if (s.versets.some(v => estSignale('coran', v.cle))) throw new Error('Un verset de cette sourate est mis de côté. Choisis une autre sourate.');
    id = `coran:${n}`; cles = s.versets.map(v => v.cle);
    lecture.append(el('h2', { textContent: `${n}. ${s.nom}` }));
    for (const v of s.versets) lecture.append(el('div', { className: 'carte' },
      el('p', { className: 'arabe coran', lang: 'ar', dir: 'rtl', textContent: v.texte }),
      el('p', { textContent: `Verset ${v.verset}` }), boutonSignaler('coran', v.cle)));
    lecture.append(el('p', { textContent: coran.SOURCE_TEXTE?.texte ?? 'Source : quran.com, contrôlé avec Tanzil.net.' }));
  } else throw new Error('Exercice introuvable.');
  const commandes = el('div');
  conteneur.append(commandes, lecture);
  const widget = lectureRepetee(commandes, { id, objectif: 5 });
  const desabonner = on('texte:signale', ({ type, id: signale }) => {
    if (type === params[0] && cles.includes(signale)) {
      widget.detruire();
      conteneur.replaceChildren(el('p', { className: 'carte', textContent: 'Texte mis de côté. La lecture en cours n’a pas été gardée.' }), el('a', { href: '#/exercices', textContent: 'Retour aux exercices' }));
    }
  });
  nettoyer = () => { widget.detruire(); desabonner(); };
}
