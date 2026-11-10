// Propriétaire : Claude Code (C3). Écrans : #/coran (liste) et #/coran/112 (lecture).
import { enregistrerEcran } from '../core/routeur.js';
import { emit, on } from '../core/bus.js';
import { boutonSignaler, estSignale } from '../core/signalement.js';
import { getSourate, getVerset, getListeSourates, ordreJuzAmma, SOURCE_TEXTE,
  getRecitateurs, getRecitateurActif, setRecitateurActif, creerLecteur } from './api.js';

const el = (tag, props = {}, ...enfants) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...enfants);
  return e;
};
// Numéro de verset en chiffres arabes (généré par le navigateur, pas écrit à la main).
const chiffres = (n) => n.toLocaleString('ar-EG');

// Un seul lecteur pour tout l'écran Coran ; il s'arrête quand on change d'écran.
let lecteur = null;
const reglages = { fois: 1, repeteApresMoi: false, lent: false };
window.addEventListener('hashchange', () => lecteur?.arreter());

// Surlignage du verset récité (et défilement jusqu'à lui).
on('verset:debut', ({ cle }) => {
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  const v = document.querySelector(`.verset[data-cle="${cle}"]`);
  if (v) { v.classList.add('en-cours'); v.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  message('');
});
on('lecteur:a-toi', ({ secondes }) => message(`À toi ! Répète le verset (${secondes} s)`));
on('lecteur:fin', () => {
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  majBoutonLecture();
  message('');
});
on('lecteur:erreur', ({ cle }) => message(`Le son du verset ${cle} ne se charge pas. Vérifie Internet.`));

function message(texte) {
  const m = document.getElementById('message-lecteur');
  if (m) m.textContent = texte;
}

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

  conteneur.append(barreLecture(s));

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
      el('div', { className: 'actions-verset' },
        el('button', { className: 'secondaire', textContent: '▶ Écouter', onclick: () => jouer([v.cle]) }),
        boutonSignaler('coran', v.cle)));
    conteneur.append(bloc);
  }
  conteneur.append(credit());
}

function jouer(cles) {
  lecteur ??= creerLecteur();
  lecteur.vitesse(reglages.lent ? 'lent' : 'normal');
  lecteur.jouer(cles, { fois: reglages.fois, repeteApresMoi: reglages.repeteApresMoi });
  majBoutonLecture();
}

function majBoutonLecture() {
  const b = document.getElementById('bouton-lecture');
  if (!b) return;
  b.textContent = lecteur?.enLecture ? '⏸ Pause' : (lecteur?.cleCourante ? '▶ Reprendre' : '▶ Écouter la sourate');
}

function barreLecture(s) {
  const choixRecitateur = el('select', { className: 'choix', 'aria-label': 'Récitateur' },
    ...getRecitateurs().map((r) => el('option', { value: r.id, textContent: r.nom, selected: r.id === getRecitateurActif() })));
  choixRecitateur.addEventListener('change', () => { lecteur?.arreter(); setRecitateurActif(choixRecitateur.value); });

  const choixFois = el('select', { className: 'choix', 'aria-label': 'Répéter chaque verset' },
    ...[1, 3, 5, 10].map((n) => el('option', { value: n, textContent: n === 1 ? 'Chaque verset 1 fois' : `Chaque verset ${n} fois`, selected: n === reglages.fois })));
  choixFois.addEventListener('change', () => { reglages.fois = Number(choixFois.value); });

  const caseRepete = el('input', { type: 'checkbox', checked: reglages.repeteApresMoi });
  caseRepete.addEventListener('change', () => { reglages.repeteApresMoi = caseRepete.checked; });
  const caseLent = el('input', { type: 'checkbox', checked: reglages.lent });
  caseLent.addEventListener('change', () => { reglages.lent = caseLent.checked; lecteur?.vitesse(reglages.lent ? 'lent' : 'normal'); });

  const boutonLecture = el('button', { id: 'bouton-lecture', textContent: '▶ Écouter la sourate' });
  boutonLecture.addEventListener('click', () => {
    if (lecteur?.enLecture) lecteur.pause();
    else if (lecteur?.cleCourante) lecteur.reprendre();
    else jouer(s.versets.map((v) => v.cle));
    majBoutonLecture();
  });
  const boutonStop = el('button', { className: 'secondaire', textContent: '■ Stop', onclick: () => lecteur?.arreter() });

  const fragment = document.createDocumentFragment();
  fragment.append(
    el('details', { className: 'carte reglages-ecoute' },
      el('summary', { textContent: "Réglages de l'écoute" }),
      el('label', { className: 'ligne-reglage' }, 'Récitateur', choixRecitateur),
      choixFois,
      el('label', { className: 'ligne-case' }, caseRepete, ' Répète après moi (une pause après chaque verset)'),
      el('label', { className: 'ligne-case' }, caseLent, ' Lent'),
    ),
    el('div', { className: 'barre-lecture' },
      el('div', { className: 'ligne-boutons' }, boutonLecture, boutonStop),
      el('p', { id: 'message-lecteur', className: 'message-lecteur', role: 'status' }),
    ),
  );
  return fragment;
}

function credit() {
  return el('p', { className: 'credit' }, SOURCE_TEXTE.texte + ' — ',
    el('a', { href: SOURCE_TEXTE.lien, target: '_blank', rel: 'noopener', textContent: 'tanzil.net' }));
}
