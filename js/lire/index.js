// Propriétaire : Claude Code. Partie « Lire » (1er onglet) : exercices de fluidité avec le texte officiel du Coran.
//   #/lire                 accueil de la partie + mes progrès
//   #/lire/flash[/niveau]  mot flash : un mot s'affiche un court instant, on le reconnaît parmi 3
//   #/lire/groupes[/n]     lecture par groupes : les groupes de 2-3 mots s'allument l'un après l'autre, puis le verset entier
//   #/lire/recitation[/n]     « Suis la récitation » : Husary récite, le mot dit s'allume ; la vitesse monte à chaque sourate finie
// Texte : fichiers officiels (quran.com, contrôlés avec Tanzil). Son : everyayah, Husary mu'allim.
// Moments des mots : quran.com (data/coran/segments-husary-muallim.json), servent SEULEMENT à allumer le mot.
// Sens des mots : français (anglais de quran.com traduit, Hamidullah en priorité), sinon anglais de quran.com. Traduction du verset : Hamidullah (quran.com), telle quelle.
import { enregistrerEcran, changerTitre } from '../core/routeur.js';
import { el, icone, grosBouton, boutonSecondaire, message } from '../core/ui.js';
import { lire, ecrire } from '../core/stockage.js';
import { getSourate, getListeSourates, ordreJuzAmma, urlAudio, getSensMots, getTraduction, MENTION_SENS_FR } from '../coran/api.js';
import { NIVEAUX_FLASH, motsPourNiveau, questionFlash, DUREE_FLASH, nouvelleDuree, groupes, RYTHMES, VITESSES_RECITATION, vitesseSuivante, motAuTemps } from './logique.js';

const NB_QUESTIONS = 10;
const stats = () => lire('lire.stats', {});
const noterStats = (partie, valeur) => ecrire('lire.stats', { ...stats(), [partie]: { ...(stats()[partie] ?? {}), ...valeur } });
const pourcent = (v) => `${Math.round(v * 100)} %`;
const duree = (ms) => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`; };

// Ce qu'il faut arrêter quand on quitte l'écran (son, minuteurs).
let nettoyer = () => {};
window.addEventListener('hashchange', () => { nettoyer(); nettoyer = () => {}; });

enregistrerEcran('lire', {
  titre: 'Lire',
  onglet: 'lire',
  retour: (p) => (p.length === 0 ? undefined : p.length === 1 ? '#/lire' : `#/lire/${p[0]}`),
  async afficher(conteneur, [exo, choix]) {
    if (!exo) return accueil(conteneur);
    if (exo === 'flash') return choix in NIVEAUX_FLASH ? jeuFlash(conteneur, choix) : choixNiveau(conteneur);
    if (exo === 'groupes') return choix ? lectureGroupes(conteneur, Number(choix)) : listeSourates(conteneur, 'groupes', 'Lecture par groupes');
    if (exo === 'recitation') return choix ? recitation(conteneur, Number(choix)) : listeSourates(conteneur, 'recitation', 'Suis la récitation');
    location.replace('#/lire');
  },
});

// ---- Accueil de la partie ----
function accueil(conteneur) {
  const s = stats();
  const flash = s.flash?.record ? `Ton record : ${s.flash.record} ms` : 'Pas encore fait';
  const nbGroupes = Object.keys(s.groupes ?? {}).length;
  const nbRecitation = Object.keys(s.recitation ?? {}).length;
  conteneur.append(
    message('Pour lire vite, il faut voir les mots d’un coup d’œil, pas lettre par lettre. Un peu chaque jour.'),
    carteExo('flash', 'Mot flash', 'Un mot apparaît un instant. Reconnais-le sans épeler.', flash),
    carteExo('groupes', 'Lecture par groupes', 'Lis 2 ou 3 mots d’un coup, puis le verset entier.', nbGroupes ? `${nbGroupes} sourate${nbGroupes > 1 ? 's' : ''} lue${nbGroupes > 1 ? 's' : ''}` : 'Pas encore fait'),
    carteExo('recitation', 'Suis la récitation', 'Husary récite, le mot lu s’allume. La vitesse monte petit à petit.', nbRecitation ? `${nbRecitation} sourate${nbRecitation > 1 ? 's' : ''} suivie${nbRecitation > 1 ? 's' : ''}` : 'Pas encore fait'));
}
const carteExo = (id, titre, texte, progres) => el('a', { className: 'carte carte-exo', href: `#/lire/${id}`, 'data-exo': id },
  el('span', { className: 'carte-exo-texte' }, el('strong', { textContent: titre }), el('span', { textContent: texte }), el('small', { className: 'progres', textContent: progres })),
  icone('fleche', 20));

// Fatiha puis Juz Amma du plus court au plus long (même ordre que la séance).
async function listeSourates(conteneur, exo, titre) {
  changerTitre(titre);
  const infos = new Map((await getListeSourates()).map((x) => [x.numero, x]));
  const fait = stats()[exo] ?? {};
  conteneur.append(message('Choisis une sourate.'));
  for (const n of [1, ...(await ordreJuzAmma())]) {
    const s = infos.get(n);
    const suite = exo === 'recitation' && fait[n] ? `Vitesse ${pourcent(fait[n].vitesse)}` : exo === 'groupes' && fait[n] ? `Meilleur temps ${duree(fait[n].meilleur)}` : `${s.nbVersets} versets`;
    conteneur.append(el('a', { className: 'ligne-plus', href: `#/lire/${exo}/${n}` },
      el('span', { className: 'ligne-plus-texte' }, `${n}. ${s.nom}`, el('small', { textContent: suite })), icone('fleche', 20)));
  }
}

// Sens des mots d'un verset : Map position → sens (absent = rien affiché).
const mentionSens = () => el('p', { className: 'mention-sens', textContent: MENTION_SENS_FR });
const sensCache = new Map();
function sensVerset(cle) {
  if (!sensCache.has(cle)) sensCache.set(cle, getSensMots(cle).then((l) => new Map(l.filter((x) => x.sens).map((x) => [x.position, x.sens]))).catch(() => new Map()));
  return sensCache.get(cle);
}
// Traduction française du verset entier (Hamidullah), texte de la source sans les appels de note.
async function blocTraduction(cle) {
  const p = el('p', { className: 'traduction-lire', lang: 'fr' });
  try {
    const t = await getTraduction(cle, 'hamidullah');
    p.append(t.morceaux.filter((m) => m.texte !== undefined).map((m) => m.texte).join(''), el('small', { className: 'credit', textContent: ` — ${t.credit}` }));
  } catch { p.textContent = 'Traduction pas disponible (vérifie Internet).'; }
  return p;
}

async function souratesLecture() { return Promise.all([1, ...(await ordreJuzAmma())].map((n) => getSourate(n))); }

// ---- Mot flash ----
function choixNiveau(conteneur) {
  changerTitre('Mot flash');
  const d = stats().flash?.duree ?? DUREE_FLASH.depart;
  conteneur.append(message(`Le mot reste ${d} ms. Si tu réussis 3 fois de suite, il reste moins longtemps.`));
  for (const [id, n] of Object.entries(NIVEAUX_FLASH)) {
    conteneur.append(el('a', { className: 'ligne-plus', href: `#/lire/flash/${id}`, 'data-niveau': id },
      el('span', { className: 'ligne-plus-texte' }, n.nom, el('small', { textContent: n.max > 50 ? `${n.min} lettres et plus` : `${n.min} à ${n.max} lettres` })), icone('fleche', 20)));
  }
}

async function jeuFlash(conteneur, niveau) {
  changerTitre(NIVEAUX_FLASH[niveau].nom);
  const mots = motsPourNiveau(await souratesLecture(), niveau);
  let dureeMs = stats().flash?.duree ?? DUREE_FLASH.depart;
  let numero = 0, justes = 0, serie = 0, minuteur = null;
  const debut = Date.now();
  nettoyer = () => clearTimeout(minuteur);
  const compteur = el('p', { className: 'flash-compteur' });
  const cadre = el('div', { className: 'carte flash-cadre' });
  const zoneChoix = el('div', { className: 'flash-choix' });
  conteneur.append(compteur, cadre, zoneChoix);

  const question = () => {
    numero++;
    compteur.textContent = `Mot ${numero} sur ${NB_QUESTIONS} · ${dureeMs} ms`;
    const q = questionFlash(mots);
    zoneChoix.replaceChildren();
    const bouton = grosBouton('Montre le mot', () => {
      zoneChoix.replaceChildren();
      cadre.replaceChildren(el('p', { className: 'arabe flash-mot', lang: 'ar', dir: 'rtl', textContent: q.bon.texte }));
      minuteur = setTimeout(() => { cadre.replaceChildren(el('p', { className: 'flash-cache', textContent: 'Quel mot as-tu vu ?' })); proposer(q); }, dureeMs);
    }, { id: 'montrer-mot' });
    cadre.replaceChildren(el('p', { className: 'flash-cache', textContent: 'Prêt ? Regarde bien le cadre.' }));
    zoneChoix.append(bouton);
  };
  const proposer = (q) => {
    zoneChoix.replaceChildren(...q.choix.map((m) => {
      const b = el('button', { type: 'button', className: 'choix-mot arabe', lang: 'ar', dir: 'rtl', textContent: m.texte });
      b.addEventListener('click', () => repondre(q, m, b));
      return b;
    }));
  };
  const repondre = (q, m, b) => {
    const juste = m === q.bon;
    if (juste) { justes++; serie++; } else serie = 0;
    zoneChoix.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.textContent === q.bon.texte) x.classList.add('juste'); });
    if (!juste) b.classList.add('faux');
    dureeMs = nouvelleDuree(dureeMs, juste, serie);
    // Le sens du mot, puis on passe au suivant quand il veut.
    const sens = el('p', { className: 'sens-flash', lang: 'en', textContent: '…' });
    cadre.replaceChildren(el('p', { className: 'arabe flash-mot', lang: 'ar', dir: 'rtl', textContent: q.bon.texte }), sens,
      el('small', { className: 'credit', textContent: `${MENTION_SENS_FR} · ${q.bon.cle}` }));
    sensVerset(q.bon.cle).then((m) => { sens.textContent = m.get(q.bon.position) ? `« ${m.get(q.bon.position)} »` : 'Sens pas disponible pour ce mot.'; });
    // Bouton dans le cadre, juste sous le sens : toujours visible, jamais caché par le menu.
    cadre.append(grosBouton(numero < NB_QUESTIONS ? 'Mot suivant' : 'Voir mon score', () => (numero < NB_QUESTIONS ? question() : fin()), { id: 'mot-suivant' }));
    cadre.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const fin = () => {
    const ancien = stats().flash ?? {};
    noterStats('flash', { duree: dureeMs, record: Math.min(dureeMs, ancien.record ?? Infinity), dernier: { justes, total: NB_QUESTIONS, ms: Date.now() - debut, date: new Date().toISOString() }, parties: (ancien.parties ?? 0) + 1 });
    compteur.textContent = '';
    cadre.replaceChildren(el('div', { className: 'bravo' }, icone('ok', 48), el('p', { textContent: `${justes} sur ${NB_QUESTIONS}` })),
      message(`Temps : ${duree(Date.now() - debut)}. Prochaine fois, le mot restera ${dureeMs} ms.`));
    zoneChoix.replaceChildren(grosBouton('Encore', () => { conteneur.replaceChildren(); jeuFlash(conteneur, niveau); }, { icone: 'repeter' }));
  };
  question();
}

// ---- Affichage d'un verset mot par mot (texte exact de la source) ----
// Sous chaque mot : son sens en anglais (quran.com), ajouté dès qu'il est chargé.
function ligneVerset(v, classe = '') {
  const ligne = el('p', { className: `arabe verset avec-sens ${classe}`, lang: 'ar', dir: 'rtl', 'data-cle': v.cle });
  const sens = [];
  v.mots.forEach((m, i) => {
    const s = el('span', { className: 'sens-mot', lang: 'en', dir: 'ltr' });
    sens.push([m.position, s]);
    ligne.append(el('span', { className: 'mot-bloc' }, el('span', { className: 'mot', textContent: m.texte, 'data-position': m.position }), s));
    if (i < v.mots.length - 1) ligne.append(' ');
  });
  sensVerset(v.cle).then((carte) => sens.forEach(([pos, s]) => { s.textContent = carte.get(pos) ?? ''; }));
  return ligne;
}

// ---- Lecture par groupes ----
async function lectureGroupes(conteneur, n) {
  const s = await getSourate(n);
  changerTitre(s.nom);
  let rythme = lire('lire.rythme', 'moyen');
  if (!(rythme in RYTHMES)) rythme = 'moyen';
  let i = 0, minuteur = null, debut = null;
  nettoyer = () => clearTimeout(minuteur);
  const compteur = el('p', { className: 'flash-compteur' });
  const zone = el('div', { className: 'carte texte-groupes' });
  const actions = el('div', { className: 'actions-seance actions-lire' });
  const choixRythme = el('div', { className: 'choix-rythme' }, ...Object.entries(RYTHMES).map(([id, r]) => {
    const b = el('button', { type: 'button', className: id === rythme ? 'puce actif' : 'puce', textContent: r.nom, 'data-rythme': id });
    b.addEventListener('click', () => { rythme = id; ecrire('lire.rythme', id); choixRythme.querySelectorAll('.puce').forEach((x) => x.classList.toggle('actif', x === b)); });
    return b;
  }));
  conteneur.append(choixRythme, compteur, zone, mentionSens(), actions);

  const montrer = () => {
    debut ??= Date.now();
    const v = s.versets[i];
    compteur.textContent = `Verset ${i + 1} sur ${s.versets.length}`;
    const ligne = ligneVerset(v, 'groupes-attente');
    zone.replaceChildren(ligne);
    const spans = [...ligne.querySelectorAll('.mot')];
    const gs = groupes(spans);
    actions.replaceChildren();
    let g = 0;
    const etape = () => {
      spans.forEach((x) => x.classList.remove('allume'));
      if (g < gs.length) { gs[g].forEach((x) => x.classList.add('allume')); g++; minuteur = setTimeout(etape, RYTHMES[rythme].ms); return; }
      ligne.classList.replace('groupes-attente', 'groupes-entier');
      blocTraduction(v.cle).then((p) => { if (ligne.isConnected) zone.append(p); });
      actions.replaceChildren(boutonSecondaire('Revoir', montrer, { icone: 'repeter' }),
        grosBouton(i < s.versets.length - 1 ? 'Verset suivant' : 'Fini', suivant, { id: 'verset-suivant' }));
    };
    etape();
  };
  const suivant = () => {
    if (i < s.versets.length - 1) { i++; montrer(); return; }
    const ms = Date.now() - debut;
    const ancien = (stats().groupes ?? {})[n];
    noterStats('groupes', { [n]: { meilleur: Math.min(ms, ancien?.meilleur ?? Infinity), fois: (ancien?.fois ?? 0) + 1 } });
    compteur.textContent = '';
    zone.replaceChildren(el('div', { className: 'bravo' }, icone('ok', 48), el('p', { textContent: `Sourate lue en ${duree(ms)}` })),
      message(ancien?.meilleur ? `Ton meilleur temps avant : ${duree(ancien.meilleur)}.` : 'Premier temps enregistré.'));
    actions.replaceChildren(grosBouton('Recommencer', () => { i = 0; debut = null; montrer(); }, { icone: 'repeter' }));
  };
  actions.append(grosBouton('Commencer', montrer, { icone: 'ecouter', id: 'commencer-groupes' }));
  zone.append(message(`${s.versets.length} versets. Choisis le rythme, puis commence.`));
}

// ---- Suis la récitation ----
let segmentsHusary = null;
async function chargerSegments() {
  segmentsHusary ??= fetch('data/coran/segments-husary-muallim.json').then((r) => (r.ok ? r.json() : { sourates: {} })).catch(() => ({ sourates: {} }));
  return segmentsHusary;
}

async function recitation(conteneur, n) {
  const [s, segs] = await Promise.all([getSourate(n), chargerSegments()]);
  changerTitre(s.nom);
  const parVerset = segs.sourates?.[n] ?? {};
  const fait = (stats().recitation ?? {})[n];
  let vitesse = fait?.vitesse ?? VITESSES_RECITATION[0];
  let i = 0, enCours = false, image = null;
  const audio = new Audio();
  audio.preload = 'auto';
  const regler = () => { audio.playbackRate = vitesse; audio.preservesPitch = true; audio.webkitPreservesPitch = true; };
  nettoyer = () => { audio.pause(); audio.removeAttribute('src'); cancelAnimationFrame(image); };

  const texte = el('div', { className: 'carte texte-seance texte-recitation' }, ...s.versets.map((v) => ligneVerset(v)));
  const infoVitesse = el('p', { className: 'flash-compteur' });
  const bouton = grosBouton('Écouter', () => (enCours ? pause() : jouer()), { icone: 'ecouter', id: 'ecouter-recitation' });
  const choixVitesse = el('div', { className: 'choix-rythme' }, ...VITESSES_RECITATION.map((x) => {
    const b = el('button', { type: 'button', className: 'puce', textContent: pourcent(x), 'data-vitesse': x });
    b.addEventListener('click', () => { vitesse = x; regler(); majVitesse(); });
    return b;
  }));
  const majVitesse = () => {
    infoVitesse.textContent = `Vitesse : ${pourcent(vitesse)}`;
    choixVitesse.querySelectorAll('.puce').forEach((b) => b.classList.toggle('actif', Number(b.dataset.vitesse) === vitesse));
  };
  const majBouton = () => bouton.replaceChildren(icone(enCours ? 'pause' : 'ecouter', 26), el('span', { textContent: enCours ? 'Pause' : (audio.src ? 'Reprendre' : 'Écouter') }));
  conteneur.append(choixVitesse, infoVitesse, texte, mentionSens(), el('div', { className: 'actions-seance actions-lire' }, bouton));
  majVitesse();

  const lignes = () => [...texte.querySelectorAll('.verset')];
  // Verset fini : sa traduction française apparaît dessous (une seule fois).
  const montrerTraduction = (k) => {
    const l = lignes()[k];
    if (l.nextElementSibling?.classList.contains('traduction-lire')) return;
    blocTraduction(s.versets[k].cle).then((p) => { if (!l.nextElementSibling?.classList.contains('traduction-lire')) l.after(p); });
  };
  const allumer = () => {
    const v = s.versets[i];
    const ligne = lignes()[i];
    const sg = parVerset[v.cle];
    const t = audio.currentTime * 1000;
    // Sans moments fiables pour ce verset : on allume le verset entier.
    const pos = sg ? motAuTemps(sg, t) : 0;
    ligne.querySelectorAll('.mot').forEach((m) => m.classList.toggle('allume', Number(m.dataset.position) === pos));
    // Husary mu'allim laisse un silence après le verset (pour répéter) : on passe au suivant dès la fin du dernier mot.
    if (sg && t >= sg[sg.length - 1][1] + 250) { versetSuivant(); return; }
    if (enCours) image = requestAnimationFrame(allumer);
  };
  const chargerVerset = () => {
    lignes().forEach((l, k) => l.classList.toggle('en-cours', k === i));
    lignes()[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    audio.src = urlAudio(s.versets[i].cle, 'husary_muallim');
    regler();
  };
  const jouer = async () => {
    if (!audio.src) chargerVerset();
    enCours = true; majBouton();
    try { await audio.play(); regler(); image = requestAnimationFrame(allumer); }
    catch { enCours = false; majBouton(); infoVitesse.textContent = 'Le son ne démarre pas. Vérifie Internet et réessaie.'; }
  };
  const pause = () => { enCours = false; audio.pause(); cancelAnimationFrame(image); majBouton(); };
  const versetSuivant = () => {
    cancelAnimationFrame(image);
    lignes()[i].querySelectorAll('.mot').forEach((m) => m.classList.remove('allume'));
    montrerTraduction(i);
    if (i < s.versets.length - 1) { i++; chargerVerset(); audio.play().then(() => { regler(); image = requestAnimationFrame(allumer); }).catch(() => pause()); return; }
    finSourate();
  };
  audio.addEventListener('ended', () => { if (enCours) versetSuivant(); });
  const finSourate = () => {
    enCours = false; audio.pause();
    lignes().forEach((l) => l.classList.remove('en-cours'));
    const prochaine = vitesseSuivante(vitesse);
    noterStats('recitation', { [n]: { vitesse: prochaine, fois: (fait?.fois ?? 0) + 1 } });
    i = 0; audio.removeAttribute('src');
    texte.before(el('div', { className: 'carte bravo recitation-fin' }, icone('ok', 48),
      el('p', { textContent: prochaine > vitesse ? `Bravo ! La prochaine fois : ${pourcent(prochaine)}` : 'Bravo ! Tu es à la vitesse maximale.' })));
    vitesse = prochaine; regler(); majVitesse(); majBouton();
  };
}
