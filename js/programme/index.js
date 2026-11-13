// Propriétaire : Claude Code. Écrans de « Mon programme » (un jour = Coran + Arabe, 7 jours sur 7, le 7e = révision) :
//   #/programme              le jour : étapes à cocher, bouton « Finir le jour », rappels de la Sunna du jour
//   #/programme/lecon/<num>  une règle de lecture : explication, vrais mots du Coran, exercice « touche les mots »
//   #/programme/quiz         7e jour : quiz sur les règles de la semaine
//   #/programme/mots         5 mots de la sourate du jour avec leur sens → ajoutés à « Mes mots » (révision espacée)
//   #/programme/sourates     7e jour : relire les sourates de la semaine
//   #/programme/arabe        la leçon d'arabe du jour (phrases affichées seulement si vérifiées par 2 IA)
//   #/programme/sunna        tous les rappels de la Sunna, avec leur source
// Aucun texte arabe écrit ici : les mots viennent du texte officiel (data/coran), les phrases de data/arabe (vérifiées).
import { enregistrerEcran, rafraichir } from '../core/routeur.js';
import { el, icone, grosBouton, lienBouton, message } from '../core/ui.js';
import { morceaux } from '../core/arabe.js';
import { getSourate, getSensMots, JUZ_AMMA } from '../coran/api.js';
import { getEtatSeance } from '../seance/api.js';
import { getMotsAReviser, ajouterMot, estDansMesMots } from '../mots/api.js';
import { getLecon, reperer, exemples, exercice, rappelsDuJour, RAPPELS, estVendredi } from './logique.js';
import { getJour, etapesDuJour, cocher, peutFinir, finirJour, noterSourate, souratesDeLaSemaine, leconsDeLaSemaine, rangNouveau } from './api.js';

const ADRESSES = { revision: '#/mots/revision', lecon: null, lecture: '#/seance', mots: '#/programme/mots', arabe: '#/programme/arabe', sourates: '#/programme/sourates', regles: '#/programme/quiz' };

enregistrerEcran('programme', {
  titre: (p) => ({ lecon: 'Règle du jour', quiz: 'Quiz de la semaine', mots: 'Mots du jour', sourates: 'Sourates de la semaine', arabe: 'Arabe', sunna: 'Rappels de la Sunna' })[p[0]] ?? 'Mon programme',
  retour: (p) => (p[0] ? '#/programme' : '#/accueil'),
  async afficher(conteneur, [page, param]) {
    if (page === 'lecon') return afficherLecon(conteneur, Number(param) || getJour().lecon || 1);
    if (page === 'quiz') return afficherQuiz(conteneur);
    if (page === 'mots') return afficherMots(conteneur);
    if (page === 'sourates') return afficherSourates(conteneur);
    if (page === 'arabe') return afficherArabe(conteneur);
    if (page === 'sunna') return afficherSunna(conteneur, RAPPELS);
    return afficherJour(conteneur);
  },
});

// ---------- Le jour ----------
async function afficherJour(conteneur) {
  let j = getJour();
  // Coches automatiques : rien à réviser → révision faite ; séance du jour finie → lecture faite.
  if (!j.fini && getMotsAReviser().length === 0) j = cocher('revision');
  const seance = await getEtatSeance();
  if (!j.fini && !j.revision && seance.faiteAujourdhui) { j = cocher('lecture'); if (seance.sourate) noterSourate(j.n, seance.sourate.numero); }

  conteneur.append(el('div', { className: 'prog-entete' },
    el('p', { className: 'prog-jour', textContent: `Jour ${j.n}` }),
    el('p', { className: 'message-doux', textContent: j.revision ? `Semaine ${j.semaine} · jour de révision` : `Semaine ${j.semaine} · environ 35 minutes` })));

  if (estVendredi()) conteneur.append(carteRappel(RAPPELS.find((r) => r.id === 'kahf'), true));

  const liste = el('div', { className: 'prog-etapes' });
  for (const e of etapesDuJour(j.n)) {
    const fait = Boolean(j.faites[e.id]);
    const adresse = e.id === 'lecon' ? `#/programme/lecon/${j.lecon}` : ADRESSES[e.id];
    let sous = `${e.minutes} min${e.obligatoire ? '' : ' · en plus'}`;
    if (e.id === 'lecon') sous = `${getLecon(j.lecon).titre} · ${sous}`;
    if (e.id === 'lecture' && seance.sourate) sous = `${seance.sourate.nom} · ${sous}`;
    liste.append(el('a', { className: `prog-etape${fait ? ' fait' : ''}`, href: adresse, 'data-etape': e.id },
      el('span', { className: 'prog-coche' }, fait ? icone('ok', 22) : null),
      el('span', { className: 'prog-texte' }, el('b', { textContent: e.titre }), el('small', { textContent: sous }))));
  }
  conteneur.append(liste);

  if (j.fini) {
    conteneur.append(el('div', { className: 'bravo' }, icone('ok', 40), el('p', { textContent: `Jour ${j.n} fini. À demain !` })));
  } else if (peutFinir(j)) {
    conteneur.append(grosBouton(`Finir le jour ${j.n}`, () => { finirJour(); rafraichir(); }, { icone: 'ok', id: 'finir-jour' }));
  } else {
    conteneur.append(message('Fais les étapes dans l’ordre. Chaque étape se coche toute seule quand elle est finie.'));
  }

  const rappels = rappelsDuJour().filter((r) => r.quand !== 'vendredi' && r.quand !== 'objectif').slice(0, 3);
  conteneur.append(el('h2', { className: 'prog-titre', textContent: 'Aujourd’hui, selon la Sunna' }),
    ...rappels.map((r) => carteRappel(r)),
    el('a', { className: 'lien-discret', href: '#/programme/sunna', textContent: 'Tous les rappels de la Sunna' }));
}

function carteRappel(r, important = false) {
  return el('div', { className: `carte prog-rappel${important ? ' important' : ''}`, 'data-rappel': r.id },
    el('b', { textContent: r.titre }),
    el('p', { textContent: r.texte }),
    el('p', { className: 'credit', textContent: `Source : ${r.source}` }),
    r.adresse ? el('a', { className: 'bouton-secondaire', href: r.adresse, textContent: 'Ouvrir dans le Coran' }) : null);
}

function afficherSunna(conteneur, rappels) {
  const groupes = [['vendredi', 'Le vendredi'], ['matin-soir', 'Matin et soir'], ['jour', 'Après les prières'], ['soir', 'Le soir, avant de dormir'], ['objectif', 'Objectifs']];
  conteneur.append(message('Seulement des hadiths authentiques (sahih ou hasan), avec leur référence.'));
  for (const [quand, titre] of groupes) {
    conteneur.append(el('h2', { className: 'prog-titre', textContent: titre }), ...rappels.filter((r) => r.quand === quand).map((r) => carteRappel(r)));
  }
  conteneur.append(el('p', { className: 'credit centre', textContent: 'Pas mis ici car les hadiths sont faibles : Ya-Sin le vendredi ou la nuit, al-Waqi’a contre la pauvreté.' }));
}

// ---------- Mots du texte officiel ----------
let tousLesMots = null;
async function motsJuzAmma() {
  if (tousLesMots) return tousLesMots;
  const sourates = await Promise.all([1, ...JUZ_AMMA].map((n) => getSourate(n)));
  tousLesMots = sourates.flatMap((s) => s.versets.flatMap((v) => v.mots.map((m) => ({ cle: v.cle, position: m.position, texte: m.texte }))));
  return tousLesMots;
}

// Le mot, avec les lettres concernées par la règle en couleur.
// Couper un mot en morceaux casse les liaisons des lettres dans Safari : on ajoute un « joint invisible » (U+200D, pas une lettre)
// des deux côtés de chaque coupure, seulement si la lettre d'avant se lie à la suivante. Le texte lu (aria-label) reste l'original.
const SANS_LIAISON_GAUCHE = new Set([0x621, 0x622, 0x623, 0x624, 0x625, 0x627, 0x629, 0x62f, 0x630, 0x631, 0x632, 0x648, 0x671, 0x6e5, 0x6e6]);
const JOINT = String.fromCodePoint(0x200d);
function motColore(texte, indices) {
  const garde = new Set(indices);
  const ms = morceaux(texte);
  const lie = (i) => i < ms.length - 1 && !SANS_LIAISON_GAUCHE.has(ms[i].lettre.codePointAt(0)) && ms[i + 1].lettre.codePointAt(0) !== 0x621;
  return el('span', { className: 'arabe prog-mot', lang: 'ar', dir: 'rtl', 'aria-label': texte, 'data-texte': texte },
    ...ms.map((m, i) => el('span', { className: garde.has(i) ? 'surligne' : '', textContent: (i > 0 && lie(i - 1) ? JOINT : '') + m.lettre + m.signes.join('') + (lie(i) ? JOINT : '') })));
}

// ---------- Règle de lecture ----------
async function afficherLecon(conteneur, num) {
  const lecon = getLecon(num);
  if (!lecon) { location.replace('#/programme'); return; }
  const mots = await motsJuzAmma();
  conteneur.append(el('div', { className: 'carte prog-lecon' },
    el('h2', { textContent: lecon.titre }),
    el('p', { className: 'prog-son' }, 'Son : ', el('b', { textContent: lecon.son })),
    el('p', { textContent: lecon.explication })),
  el('h2', { className: 'prog-titre', textContent: 'Dans le Coran (en couleur)' }),
  el('div', { className: 'prog-exemples' }, ...exemples(lecon, mots).map((m) => el('a', { className: 'prog-exemple', href: `#/coran/${m.cle.replace(':', '/')}/${m.position}` },
    motColore(m.texte, reperer(lecon, m.texte)), el('small', { textContent: m.cle })))),
  message('Touche un mot pour le voir dans son verset.'));
  const zone = el('div', { className: 'prog-exo' });
  conteneur.append(zone);
  const lancer = () => jouerExercice(zone, [{ lecon, mots: exercice(lecon, mots) }], () => cocher('lecon'));
  zone.append(grosBouton('À toi : l’exercice', lancer, { icone: 'ok', id: 'lancer-exo' }));
}

// Exercice : pour chaque manche, toucher les mots où on voit la règle, puis « Vérifier ».
function jouerExercice(zone, manches, quandReussi) {
  let i = 0; let bons = 0; let total = 0;
  const manche = () => {
    const { lecon, mots } = manches[i];
    const choisis = new Set();
    const grille = el('div', { className: 'prog-grille' }, ...mots.map((m, k) => {
      const b = el('button', { type: 'button', className: 'prog-choix', 'data-bon': String(m.bon) }, el('span', { className: 'arabe', lang: 'ar', dir: 'rtl', textContent: m.texte }));
      b.addEventListener('click', () => { if (choisis.has(k)) choisis.delete(k); else choisis.add(k); b.classList.toggle('choisi'); });
      return b;
    }));
    const verifier = grosBouton('Vérifier', () => {
      let justes = 0;
      grille.querySelectorAll('.prog-choix').forEach((b, k) => {
        const juste = mots[k].bon === choisis.has(k);
        if (juste) justes++;
        b.disabled = true;
        b.classList.add(mots[k].bon ? 'bon' : 'pas-bon');
        if (!juste) b.classList.add('erreur');
      });
      bons += justes; total += mots.length;
      verifier.remove();
      const dernier = i === manches.length - 1;
      zone.append(message(`${justes} sur ${mots.length} juste${justes > 1 ? 's' : ''}. En vert : les mots avec « ${lecon.titre} ».`),
        dernier ? fin() : grosBouton('Suivant', () => { i++; manche(); }, { id: 'manche-suivante' }));
    }, { id: 'verifier' });
    zone.replaceChildren(
      manches.length > 1 ? el('p', { className: 'message-doux', textContent: `${i + 1} / ${manches.length} · ${lecon.titre}` }) : null,
      el('p', { className: 'prog-consigne', textContent: `Touche les mots où tu vois : ${lecon.titre.toLowerCase()} (${lecon.son}).` }),
      grille, verifier);
  };
  const fin = () => {
    const reussi = bons / total >= 0.75;
    if (reussi) quandReussi();
    return el('div', { className: 'prog-fin' },
      el('p', { className: 'prog-score', textContent: `Score : ${bons} / ${total}` }),
      reussi
        ? lienBouton('Bravo ! Retour au programme', '#/programme', { gros: true })
        : grosBouton('Presque ! On recommence', () => { i = 0; bons = 0; total = 0; manche(); }, { id: 'recommencer' }));
  };
  manche();
}

// ---------- Quiz du 7e jour ----------
async function afficherQuiz(conteneur) {
  const j = getJour();
  const mots = await motsJuzAmma();
  const lecons = leconsDeLaSemaine(j.n).map(getLecon);
  if (!lecons.length) { conteneur.append(message('Pas de règle cette semaine.')); return; }
  conteneur.append(message(`${lecons.length} règles vues cette semaine. Il faut 75 % de bonnes réponses.`));
  const zone = el('div', { className: 'prog-exo' });
  conteneur.append(zone);
  jouerExercice(zone, lecons.map((lecon) => ({ lecon, mots: exercice(lecon, mots, { avec: 2 }) })), () => cocher('regles'));
}

// ---------- 5 mots du jour ----------
async function afficherMots(conteneur) {
  const etat = await getEtatSeance();
  if (!etat.sourate) { conteneur.append(message('Pas de sourate aujourd’hui.')); return; }
  const s = await getSourate(etat.sourate.numero);
  conteneur.append(message(`5 mots de ${s.nom}. Ils vont dans « Mes mots » : l’appli te les fera réviser demain, puis dans 3 jours, puis 1 semaine…`));
  const zone = el('div', { className: 'prog-liste-mots' }, message('Chargement des sens…'));
  conteneur.append(zone);
  const choisis = [];
  for (const v of s.versets) {
    if (choisis.length >= 5) break;
    let sens;
    try { sens = await getSensMots(v.cle); } catch { zone.replaceChildren(message('Il faut Internet pour charger le sens des mots.')); return; }
    for (const m of v.mots) {
      const x = sens.find((y) => y.position === m.position);
      if (!x?.sens || estDansMesMots(v.cle, m.position) || [...m.texte].length < 3) continue;
      if (choisis.some((c) => c.texte === m.texte)) continue;
      choisis.push({ cle: v.cle, position: m.position, texte: m.texte, sens: x.sens, langue: x.langue, source: x.source });
      if (choisis.length >= 5) break;
    }
  }
  if (!choisis.length) {
    zone.replaceChildren(message('Tu as déjà tous les mots de cette sourate dans « Mes mots ». Bravo !'));
    cocher('mots');
    return;
  }
  zone.replaceChildren(...choisis.map((m) => el('div', { className: 'carte prog-mot-sens' },
    el('span', { className: 'arabe', lang: 'ar', dir: 'rtl', textContent: m.texte }),
    el('span', { className: 'sens', textContent: m.sens }),
    el('small', { className: 'credit', textContent: m.cle }))));
  conteneur.append(el('p', { className: 'credit centre', textContent: choisis[0].langue === 'fr' ? choisis[0].source : 'Sens en anglais · quran.com' }),
    grosBouton(`Je garde ces ${choisis.length} mots`, () => {
      choisis.forEach(({ cle, position, sens, langue, source }) => ajouterMot({ cle, position, sens, langue, source }));
      cocher('mots');
      location.hash = '#/programme';
    }, { icone: 'mots', id: 'garder-mots' }));
}

// ---------- 7e jour : sourates de la semaine ----------
async function afficherSourates(conteneur) {
  const j = getJour();
  const liste = souratesDeLaSemaine(j.n);
  if (!liste.length) {
    conteneur.append(message('Aucune sourate notée cette semaine. Relis la dernière sourate de ta séance.'));
  } else {
    conteneur.append(message('Relis chaque sourate une fois, à voix haute. Touche-la pour l’ouvrir.'));
    for (const n of liste) {
      const s = await getSourate(n);
      conteneur.append(el('a', { className: 'ligne-plus', href: `#/coran/${n}` }, el('span', { textContent: `${s.numero}. ${s.nom}` })));
    }
  }
  conteneur.append(grosBouton('J’ai relu les sourates', () => { cocher('sourates'); location.hash = '#/programme'; }, { icone: 'ok', id: 'sourates-relues' }));
}

// ---------- Arabe ----------
let lecons = null;
const chargerLecons = () => (lecons ??= fetch(new URL('../../data/arabe/lecons.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null));

async function afficherArabe(conteneur) {
  const j = getJour();
  const donnees = await chargerLecons();
  if (!donnees?.lecons?.length) { conteneur.append(message('Les leçons d’arabe ne sont pas encore là.')); return; }
  const total = donnees.lecons.length;
  const rang = rangNouveau(j.n);
  // Jour de révision : toutes les leçons vues jusqu'ici ; sinon celle du jour.
  const indices = j.revision
    ? Array.from({ length: Math.min(rang, total) }, (_, i) => i)
    : [(rang - 1) % total];
  for (const i of indices) {
    const l = donnees.lecons[i];
    conteneur.append(el('div', { className: 'carte prog-lecon' },
      el('h2', { textContent: `Leçon ${i + 1} · ${l.titre}` }),
      el('p', { textContent: l.explication }),
      el('ul', { className: 'prog-phrases' }, ...l.phrases.map((p) => el('li', {},
        donnees.verifie && p.ar ? el('span', { className: 'arabe', lang: 'ar', dir: 'rtl', textContent: p.ar }) : null,
        el('span', { textContent: p.fr }))))));
  }
  if (!donnees.verifie) {
    conteneur.append(el('p', { className: 'carte prog-attente', textContent: 'Les phrases en arabe arrivent bientôt. Claude et Codex les écrivent chacun de leur côté, et on garde seulement celles qui sont identiques lettre par lettre.' }));
  } else {
    conteneur.append(message('Lis chaque phrase à voix haute 3 fois.'), el('p', { className: 'credit centre', textContent: 'Vérifié par 2 IA' }));
  }
  conteneur.append(grosBouton('J’ai fait la leçon', () => { cocher('arabe'); location.hash = '#/programme'; }, { icone: 'ok', id: 'arabe-fait' }));
}
