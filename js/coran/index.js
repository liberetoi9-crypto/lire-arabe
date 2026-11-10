// Propriétaire : Claude Code (C3). Écrans : #/coran (liste) et #/coran/112 (lecture).
import { enregistrerEcran } from '../core/routeur.js';
import { emit } from '../core/bus.js';
import { boutonSignaler, estSignale } from '../core/signalement.js';
import { getSourate, getVerset, getListeSourates, ordreJuzAmma, SOURCE_TEXTE } from './api.js';

const el = (tag, props = {}, ...enfants) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...enfants);
  return e;
};
// Numéro de verset en chiffres arabes (généré par le navigateur, pas écrit à la main).
const chiffres = (n) => n.toLocaleString('ar-EG');

enregistrerEcran('coran', {
  titre: 'Coran',
  async afficher(conteneur, [numero]) {
    if (numero) return afficherSourate(conteneur, Number(numero));
    return afficherListe(conteneur);
  },
});

async function afficherListe(conteneur) {
  const juz = await ordreJuzAmma();
  const toutes = Array.from({ length: 114 }, (_, i) => i + 1);
  conteneur.append(
    el('h2', { className: 'titre-section', textContent: 'Juz Amma' }),
    el('p', { className: 'aide', textContent: 'De la plus courte à la plus longue.' }),
    await listeSourates([1, ...juz]),
    el('h2', { className: 'titre-section', textContent: 'Les 114 sourates' }),
    el('p', { className: 'aide', textContent: "Dans l'ordre du Coran." }),
    await listeSourates(toutes),
    credit(),
  );
}

async function listeSourates(numeros) {
  const liste = el('div', { className: 'liste-sourates' });
  const infos = new Map((await getListeSourates()).map((s) => [s.numero, s]));
  for (const s of numeros.map((n) => infos.get(n))) {
    liste.append(el('a', { className: 'carte sourate-lien', href: `#/coran/${s.numero}` },
      el('span', { className: 'num', textContent: s.numero }),
      el('span', { className: 'nom', textContent: s.nom }),
      el('span', { className: 'arabe coran nom-arabe', lang: 'ar', dir: 'rtl', textContent: s.nomArabe }),
      el('span', { className: 'infos', textContent: `${s.nomFr ? s.nomFr + ' · ' : ''}${s.nbVersets} versets` }),
    ));
  }
  return liste;
}

async function afficherSourate(conteneur, n) {
  const s = await getSourate(n);
  conteneur.append(el('h2', { className: 'titre-sourate', textContent: `${n}. ${s.nom}${s.nomFr ? ' — ' + s.nomFr : ''}` }));

  // Basmala (sauf sourates 1 et 9) : texte pris dans la source (verset 1:1), jamais écrit à la main.
  if (n !== 1 && n !== 9) {
    const b = await getVerset('1:1');
    conteneur.append(el('p', { className: 'arabe coran basmala', lang: 'ar', dir: 'rtl', textContent: b.texte }));
  }

  for (const v of s.versets) {
    // Contrôle automatique : le verset affiché doit être exactement celui attendu.
    if (v.cle !== `${n}:${v.verset}`) throw new Error(`Contrôle : verset ${v.cle} au mauvais endroit`);
    const ligne = el('p', { className: 'arabe coran verset', lang: 'ar', dir: 'rtl' });
    ligne.dataset.cle = v.cle;
    v.mots.forEach((m, i) => {
      const mot = el('span', { className: 'mot', textContent: m.texte });
      mot.dataset.position = m.position;
      mot.addEventListener('click', () => emit('mot:touche', { source: 'coran', cle: v.cle, position: m.position, texte: m.texte }));
      ligne.append(mot, i < v.mots.length - 1 ? ' ' : '');
    });
    ligne.append(' ', el('span', { className: 'num-verset', textContent: chiffres(v.verset) }));
    const bloc = el('div', { className: 'bloc-verset' + (estSignale('coran', v.cle) ? ' signale' : '') }, ligne,
      el('div', { className: 'actions-verset' }, boutonSignaler('coran', v.cle)));
    conteneur.append(bloc);
  }
  conteneur.append(credit());
}

function credit() {
  return el('p', { className: 'credit' }, SOURCE_TEXTE.texte + ' — ',
    el('a', { href: SOURCE_TEXTE.lien, target: '_blank', rel: 'noopener', textContent: 'tanzil.net' }));
}
