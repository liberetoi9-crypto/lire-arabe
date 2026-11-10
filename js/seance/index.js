// Propriétaire : Claude Code (C7). Séance du jour guidée, étape par étape (validé par Zakou, maquettes 2a-2c) :
//   #/seance/1 Écoute la sourate → /2 Lis-la 5 fois (X17 Codex) → /3 Chrono (X17 Codex) → /4 Mon texte (si « Mes textes » en a) → /fin
// Le texte arabe vient toujours des sources (Coran : fichiers officiels ; Mes textes : textes ajoutés par Zakou).
import { enregistrerEcran, changerTitre } from '../core/routeur.js';
import { on, emit } from '../core/bus.js';
import { el, icone, grosBouton, boutonSecondaire, lienBouton, etapes, message } from '../core/ui.js';
import { getSourate, creerLecteur, texteSourate, ouvrirReglagesEcoute, getEcoute } from '../coran/api.js';
import { etapeLectureCinqFois, etapeChrono } from '../exercices/api.js';
import { getTexteDuJour } from '../textes/api.js';
import { getEtatSeance, getSeanceDuJour, commencerSeance, noterEtape, finirSeance, choisirDemain, getProchaineSourate } from './api.js';

const TEXTES_ETAPES = {
  1: 'Écoute la sourate en suivant le texte',
  2: 'Lis la sourate à voix haute, 5 fois',
  3: 'Lis une dernière fois, le plus vite possible sans te tromper',
  4: 'Lis ton texte',
};

let lecteur = null;
let composant = null; // étape de Codex en cours (à détruire avant de changer d'écran)
window.addEventListener('hashchange', () => { lecteur?.arreter(); composant?.detruire?.(); composant = null; });
on('verset:debut', ({ cle }) => {
  if (!location.hash.startsWith('#/seance')) return;
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  document.querySelector(`.verset[data-cle="${cle}"]`)?.classList.add('en-cours');
  document.querySelector(`.verset[data-cle="${cle}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  majBoutonEcoute();
});
on('lecteur:fin', () => {
  if (!location.hash.startsWith('#/seance')) return;
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  majBoutonEcoute();
  document.getElementById('suivant-seance')?.classList.add('mis-en-avant');
});
on('coran:reglage', ({ nom, valeur }) => {
  if (nom === 'vitesse') lecteur?.vitesse(valeur);
  if (nom === 'recitateur') { lecteur?.arreter(); lecteur = null; }
});

enregistrerEcran('seance', {
  titre: 'Séance du jour',
  retour: '#/accueil',
  sansMenu: true,
  reglages: () => ouvrirReglagesEcoute({ traduction: false }),
  reglagesSi: (p) => p[0] === '1',
  async afficher(conteneur, [etape]) {
    const etat = await getEtatSeance();
    const s = await getSourate(etat.sourate.numero);
    const seance = commencerSeance(s.numero);
    changerTitre(s.nom);
    const avecTexte = Boolean(getTexteDuJour());
    const total = avecTexte ? 4 : 3;
    // Sans étape dans l'adresse : reprendre là où on s'était arrêté aujourd'hui.
    if (!etape) { location.replace(`#/seance/${seance.etape ?? 1}`); return; }
    if (etape === 'fin') return afficherFin(conteneur, s);
    const n = Math.min(Math.max(Number(etape) || 1, 1), total);
    noterEtape(n);
    conteneur.append(etapes(n, total, TEXTES_ETAPES[n]));
    const suivant = () => { location.hash = n < total ? `#/seance/${n + 1}` : '#/seance/fin'; };
    if (n === 1) return etapeEcoute(conteneur, s, suivant);
    if (n === 2) return etapeLire(conteneur, s, suivant);
    if (n === 3) return etapeChronometre(conteneur, s, suivant);
    return etapeMonTexte(conteneur, suivant);
  },
});

const boutonSuivant = (action, { visible = true } = {}) => {
  const b = boutonSecondaire('Suivant →', action);
  b.id = 'suivant-seance';
  b.hidden = !visible;
  return b;
};

// ---- Étape 1 : écoute ----
async function etapeEcoute(conteneur, s, suivant) {
  const texte = await texteSourate(s);
  const ecouter = grosBouton('Écouter', () => {
    if (lecteur?.enLecture) lecteur.pause();
    else if (lecteur?.cleCourante) lecteur.reprendre();
    else {
      lecteur ??= creerLecteur();
      lecteur.vitesse(getEcoute().lent ? 'lent' : 'normal');
      lecteur.jouer(s.versets.map((v) => v.cle).filter((k) => document.querySelector(`.verset[data-cle="${k}"]`)), { fois: getEcoute().fois });
    }
    majBoutonEcoute();
  }, { icone: 'ecouter', id: 'ecouter-seance' });
  conteneur.append(el('div', { className: 'carte texte-seance' }, texte), el('div', { className: 'actions-seance' }, ecouter, boutonSuivant(suivant)));
}
function majBoutonEcoute() {
  const b = document.getElementById('ecouter-seance');
  if (!b) return;
  const enLecture = lecteur?.enLecture;
  b.replaceChildren(icone(enLecture ? 'pause' : 'ecouter', 26), el('span', { textContent: enLecture ? 'Pause' : (lecteur?.cleCourante ? 'Reprendre' : 'Écouter') }));
}

// ---- Étape 2 : lis 5 fois (composant X17 de Codex) ----
async function etapeLire(conteneur, s, suivant) {
  const zone = el('div', { className: 'actions-seance' });
  const suite = boutonSuivant(suivant, { visible: false });
  conteneur.append(el('div', { className: 'carte texte-seance' }, await texteSourate(s)), zone);
  composant = etapeLectureCinqFois(zone, { id: `coran:${s.numero}`, surTermine: () => { suite.hidden = false; suite.classList.add('mis-en-avant'); } });
  zone.append(suite); // « Suivant » reste dans la barre fixée en bas
  if (composant.termine) suite.hidden = false;
}

// ---- Étape 3 : chrono (composant X17 de Codex) ----
async function etapeChronometre(conteneur, s, suivant) {
  const zone = el('div', { className: 'actions-seance' });
  const suite = boutonSuivant(suivant, { visible: false });
  conteneur.append(el('div', { className: 'carte texte-seance' }, await texteSourate(s)), zone);
  composant = etapeChrono(zone, { id: `coran:${s.numero}`, surTermine: () => { suite.hidden = false; suite.classList.add('mis-en-avant'); } });
  zone.append(suite);
}

// ---- Étape 4 : mon texte (Mes textes) ----
function etapeMonTexte(conteneur, suivant) {
  const t = getTexteDuJour();
  if (!t) { suivant(); return; }
  const carte = el('div', { className: 'carte' },
    el('p', { className: 'titre-texte', textContent: t.titre }),
    // Texte ajouté et vérifié par Zakou, affiché tel quel.
    el('p', { className: 'arabe texte-perso', lang: 'ar', dir: 'rtl', textContent: t.arabe }),
    el('p', { className: 'credit', textContent: `Source : ${t.source}` }));
  if (t.traductionFr) {
    const trad = el('div', { hidden: true }, el('p', { textContent: t.traductionFr }), el('p', { className: 'credit', textContent: `Source : ${t.sourceTraduction}` }));
    const b = boutonSecondaire('Voir la traduction', () => { trad.hidden = !trad.hidden; b.textContent = trad.hidden ? 'Voir la traduction' : 'Cacher la traduction'; });
    carte.append(b, trad);
  }
  conteneur.append(carte,
    el('div', { className: 'actions-seance' },
      grosBouton("J'ai lu mon texte", suivant, { icone: 'ok' }),
      lienBouton('Écouter avec la voix', `#/textes/${t.id}`)));
}

// ---- Fin : bravo, et la sourate de demain ----
async function afficherFin(conteneur, s) {
  const { secondes, dejaFinie } = finirSeance();
  if (!dejaFinie) {
    emit('seance:finie', { secondes });
    try { (await import('../progression/api.js')).noterSeance({ secondes, type: 'jour' }); } catch { /* progression pas encore prête (X18) */ }
  }
  const prochaine = await getProchaineSourate();
  const minutes = Math.max(1, Math.round(secondes / 60));
  const zoneDemain = el('div', { className: 'carte demain' });
  const afficherDemain = () => {
    const choix = getSeanceDuJour().demain ?? 'suivante';
    zoneDemain.replaceChildren(
      el('p', { className: 'message-doux', textContent: 'Demain :' }),
      choixDemain(`Sourate suivante : ${prochaine?.nom ?? '—'}`, 'suivante', choix, afficherDemain, !prochaine),
      choixDemain(`Encore ${s.nom}`, 'meme', choix, afficherDemain));
  };
  afficherDemain();
  conteneur.append(el('div', { className: 'fin-seance' },
    el('div', { className: 'bravo' }, icone('ok', 48), el('p', { textContent: 'Bravo, séance finie !' })),
    message(`${minutes} minute${minutes > 1 ? 's' : ''} aujourd'hui. À demain !`)),
  zoneDemain,
  lienBouton("Retour à l'accueil", '#/accueil', { gros: true }));
}
function choixDemain(texte, valeur, actuel, apres, desactive = false) {
  const b = el('button', { type: 'button', className: valeur === actuel ? 'choix-demain actif' : 'choix-demain', disabled: desactive }, valeur === actuel ? icone('ok', 20) : null, texte);
  b.addEventListener('click', () => { choisirDemain(valeur); apres(); });
  return b;
}
