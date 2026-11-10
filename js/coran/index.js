// Propriétaire : Claude Code (C3, C4, C6, C12 ; nouvelle mise en page C14).
// Écrans : #/coran (liste) · #/coran/toutes (114) · #/coran/112[/verset[/mot]] (lecture)
//          #/coran/verifier · #/coran/verifier/93 (sons à vérifier)
// Le texte arabe vient TOUJOURS des fichiers officiels : ici on ne fait que l'afficher.
import { enregistrerEcran, changerTitre, rafraichir } from '../core/routeur.js';
import { emit, on } from '../core/bus.js';
import { lire, ecrire } from '../core/stockage.js';
import { signaler, estSignale, retirerSignalement } from '../core/signalement.js';
import { el, icone, grosBouton, lienBouton, boutonSecondaire, ouvrirFeuille, ligneChoix, barreActions, message, enregistrerEntreePlus } from '../core/ui.js';
import { getSourate, getVerset, getListeSourates, ordreJuzAmma, SOURCE_TEXTE,
  getRecitateurs, getRecitateurActif, setRecitateurActif, creerLecteur,
  recitateurPourSourate, getSonsAVerifier, noterVerificationSon,
  chargerMotsFrequents, estMotFrequent, getColorerFrequents, setColorerFrequents,
  getTraduction, getTraductions, getTraductionActive, setTraductionActive, getNoteHamidullah, getSensMots } from './api.js';
import { ajouterMot, estDansMesMots } from '../mots/api.js';
import { getEcoute, ouvrirReglagesEcoute } from './reglages.js';

// Numéro de verset en chiffres arabes (généré par le navigateur, pas écrit à la main).
const chiffres = (n) => n.toLocaleString('ar-EG');
const estNombre = (x) => /^\d+$/.test(x ?? '');

// ---- Réglages de l'écoute (gardés dans le téléphone) ----
const getVoirTraduction = () => lire('coran.voirTraduction', false);

// « Continuer : sourate, verset » (écran Coran)
const getDerniere = () => lire('coran.derniere', null);
const noterDerniere = (sourate, verset) => ecrire('coran.derniere', { sourate, verset });

// ---- Un seul lecteur ; il s'arrête quand on change d'écran ----
let lecteur = null;
let lecteurForce = null;
let modeRepeter = false;
window.addEventListener('hashchange', () => lecteur?.arreter());

function jouer(cles, { recitateur = null, repeter = false } = {}) {
  if (lecteur && lecteurForce !== recitateur) { lecteur.arreter(); lecteur = null; }
  lecteurForce = recitateur;
  lecteur ??= creerLecteur({ recitateur });
  const r = getEcoute();
  lecteur.vitesse(r.lent ? 'lent' : 'normal');
  modeRepeter = repeter;
  lecteur.jouer(cles, { fois: r.fois, repeteApresMoi: repeter });
  majBarre();
}

on('verset:debut', ({ cle }) => {
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  const v = document.querySelector(`.verset[data-cle="${cle}"]`);
  if (v) {
    v.classList.add('en-cours');
    v.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const [s, n] = cle.split(':').map(Number);
    if (!lecteurForce) noterDerniere(s, n);
  }
  bandeau('');
  majBarre();
});
on('lecteur:a-toi', () => bandeau('À toi ! Répète le verset.'));
on('lecteur:fin', () => {
  document.querySelectorAll('.verset.en-cours').forEach((e) => e.classList.remove('en-cours'));
  modeRepeter = false;
  bandeau('');
  majBarre();
});
on('lecteur:erreur', () => bandeau('Le son ne se charge pas. Vérifie Internet.'));

// Petit message au-dessus de la barre du bas.
function bandeau(texte) {
  const b = document.getElementById('bandeau-lecture');
  if (b) { b.textContent = texte; b.hidden = !texte; }
}

// ---- Écrans ----
enregistrerEcran('coran', {
  titre: (p) => (p[0] === 'verifier' ? 'Sons à vérifier' : p[0] === 'toutes' ? 'Les 114 sourates' : 'Coran'),
  onglet: 'coran',
  retour: (p) => {
    if (!p[0]) return null;
    if (p[0] === 'verifier') return p[1] ? '#/coran/verifier' : '#/plus';
    return '#/coran';
  },
  reglages: () => ouvrirReglages(),
  reglagesSi: (p) => estNombre(p[0]),
  async afficher(conteneur, [a, b, c]) {
    document.body.classList.remove('avec-barre');
    if (a === 'verifier') return b ? afficherVerificationSourate(conteneur, Number(b)) : afficherVerifications(conteneur);
    if (a === 'toutes') return afficherToutes(conteneur);
    if (estNombre(a)) return afficherSourate(conteneur, Number(a), Number(b) || null, Number(c) || null);
    return afficherListe(conteneur);
  },
});

// « Sons à vérifier » est rangé dans « Plus », avec le nombre restant.
enregistrerEntreePlus({
  id: 'sons-a-verifier', icone: 'sons', titre: 'Sons à vérifier', adresse: '#/coran/verifier', ordre: 40,
  badge: () => getSonsAVerifier().filter((x) => x.etat === 'a-verifier').length || null,
});

// ---- Écran Coran : « Continuer » + Juz Amma ----
async function afficherListe(conteneur) {
  const infos = new Map((await getListeSourates()).map((s) => [s.numero, s]));
  const d = getDerniere();
  if (d && infos.has(d.sourate)) {
    conteneur.append(lienBouton(`Continuer : ${infos.get(d.sourate).nom}`, `#/coran/${d.sourate}/${d.verset}`, { gros: true, sousTexte: `verset ${d.verset}` }));
  } else {
    conteneur.append(lienBouton('Commencer : Al-Fatiha', '#/coran/1', { gros: true }));
  }
  conteneur.append(
    el('p', { className: 'sous-titre', textContent: 'Juz Amma · du plus court au plus long' }),
    listeSourates([1, ...(await ordreJuzAmma())], infos),
    lienBouton('Voir les 114 sourates', '#/coran/toutes'),
  );
}

async function afficherToutes(conteneur) {
  const infos = new Map((await getListeSourates()).map((s) => [s.numero, s]));
  conteneur.append(listeSourates(Array.from({ length: 114 }, (_, i) => i + 1), infos));
}

function listeSourates(numeros, infos) {
  return el('div', { className: 'liste-sourates' }, ...numeros.map((n) => {
    const s = infos.get(n);
    return el('a', { className: 'ligne-sourate', href: `#/coran/${n}` },
      el('span', { className: 'num', textContent: n }),
      el('span', { className: 'nom' }, s.nom, el('small', { textContent: `${s.nomFr ? s.nomFr + ' · ' : ''}${s.nbVersets} versets` })),
      el('span', { className: 'arabe coran nom-arabe', lang: 'ar', dir: 'rtl', textContent: s.nomArabe }));
  }));
}

// ---- Lecture d'une sourate : le texte prend tout l'écran, barre en bas ----
let sourateAffichee = null;
let versetChoisi = null;

async function afficherSourate(conteneur, n, versetCible = null, motCible = null) {
  const s = await getSourate(n);
  sourateAffichee = s;
  versetChoisi = null;
  lecteurForce = null;
  await chargerMotsFrequents();
  document.body.classList.toggle('sans-frequents', !getColorerFrequents());
  changerTitre(s.nom);

  const texte = el('div', { className: 'texte-sourate' });
  // Basmala (sauf sourates 1 et 9), prise dans la source (verset 1:1) ; retirée si 1:1 est signalé.
  if (n !== 1 && n !== 9 && !estSignale('coran', '1:1')) {
    const b = await getVerset('1:1');
    texte.append(el('p', { className: 'arabe coran basmala', lang: 'ar', dir: 'rtl', textContent: b.texte, 'data-cle-source': '1:1' }));
  }
  for (const v of s.versets) {
    texte.append(estSignale('coran', v.cle) ? avisMisDeCote(v.cle) : blocVerset(v, n));
  }
  conteneur.append(texte, creditTexte());
  if (getVoirTraduction()) afficherTraductions();

  // Avis : Dosari pas encore vérifié sur cette sourate → Husary récite.
  if (recitateurPourSourate(n) !== getRecitateurActif()) {
    conteneur.prepend(el('p', { className: 'avis-doux' }, "Dosari n'est pas encore vérifié sur cette sourate : c'est Husary qui récite. ",
      el('a', { href: `#/coran/verifier/${n}`, textContent: 'Vérifier' })));
  }

  document.body.classList.add('avec-barre');
  conteneur.append(el('p', { id: 'bandeau-lecture', className: 'bandeau-lecture', role: 'status', hidden: true }),
    barreActions([
      { id: 'action-ecouter', icone: 'ecouter', texte: 'Écouter', principal: true, action: () => basculerEcoute() },
      { id: 'action-repeter', icone: 'repeter', texte: 'Répéter', action: () => lancerRepeter() },
      { id: 'action-traduction', icone: 'traduction', texte: 'Traduction', action: () => basculerTraductions() },
    ]));
  majBarre();

  // Arrivée depuis « Mes mots » ou « Continuer » : aller au verset (et montrer le mot).
  if (versetCible) {
    const ligne = conteneur.querySelector(`.verset[data-cle="${n}:${versetCible}"]`);
    if (ligne) {
      choisirVerset(`${n}:${versetCible}`);
      if (motCible) ligne.querySelector(`.mot[data-position="${motCible}"]`)?.classList.add('mot-cible');
      requestAnimationFrame(() => ligne.scrollIntoView({ block: 'center' }));
    }
  } else {
    noterDerniere(n, getDerniere()?.sourate === n ? getDerniere().verset : 1);
  }
}

// Un verset : mots touchables, numéro touchable (= choisir le verset), appui long (= menu du verset).
function blocVerset(v, n) {
  if (v.cle !== `${n}:${v.verset}`) throw new Error(`Contrôle : verset ${v.cle} au mauvais endroit`);
  const ligne = el('p', { className: 'arabe coran verset', lang: 'ar', dir: 'rtl', 'data-cle': v.cle });
  let dernier = null;
  v.mots.forEach((m, i) => {
    // Couleur seulement : le texte du mot reste exactement celui de la source.
    const mot = el('span', { className: estMotFrequent(m.texte) ? 'mot frequent' : 'mot', textContent: m.texte, 'data-position': m.position });
    mot.addEventListener('click', () => {
      if (appuiLongFait) return;
      emit('mot:touche', { source: 'coran', cle: v.cle, position: m.position, texte: m.texte });
    });
    if (i < v.mots.length - 1) ligne.append(mot, ' ');
    else dernier = mot;
  });
  const num = el('button', { type: 'button', className: 'num-verset', textContent: chiffres(v.verset), 'aria-label': `Choisir le verset ${v.verset}` });
  num.addEventListener('click', () => choisirVerset(v.cle));
  // Le dernier mot et le numéro restent ensemble (le numéro n'est jamais seul sur une ligne).
  ligne.append(el('span', { className: 'fin-verset' }, dernier, ' ', num));
  const bloc = el('div', { className: 'bloc-verset', 'data-cle': v.cle }, ligne, el('div', { className: 'traduction', hidden: true }));
  appuiLong(bloc, () => menuVerset(v.cle));
  return bloc;
}

function choisirVerset(cle) {
  versetChoisi = cle;
  document.querySelectorAll('.bloc-verset.choisi').forEach((b) => b.classList.remove('choisi'));
  document.querySelector(`.bloc-verset[data-cle="${cle}"]`)?.classList.add('choisi');
  const [s, n] = cle.split(':').map(Number);
  if (!lecteurForce) noterDerniere(s, n);
}

// Appui long (iPhone : on évite la loupe et le menu « Copier »).
let appuiLongFait = false;
function appuiLong(element, action) {
  let minuteur = null;
  let depart = null;
  const annuler = () => clearTimeout(minuteur);
  element.addEventListener('pointerdown', (e) => {
    appuiLongFait = false;
    depart = [e.clientX, e.clientY];
    minuteur = setTimeout(() => { appuiLongFait = true; action(); }, 550);
  });
  element.addEventListener('pointermove', (e) => {
    if (depart && Math.hypot(e.clientX - depart[0], e.clientY - depart[1]) > 10) annuler();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => element.addEventListener(t, annuler));
  element.addEventListener('contextmenu', (e) => { e.preventDefault(); });
}

function menuVerset(cle) {
  const [, n] = cle.split(':');
  const f = ouvrirFeuille({ titre: `Verset ${n}`, contenu: [
    grosBouton('Écouter ce verset', () => { f.fermer(); choisirVerset(cle); jouer([cle], { recitateur: lecteurForce }); }, { icone: 'ecouter' }),
    boutonSecondaire('Signaler une erreur', () => { f.fermer(); signaler('coran', cle); }),
  ] });
}

// Clés à jouer : à partir du verset choisi (ou du début), versets signalés exclus.
function clesAJouer() {
  const toutes = sourateAffichee.versets.map((v) => v.cle).filter((k) => !estSignale('coran', k));
  const i = versetChoisi ? toutes.indexOf(versetChoisi) : 0;
  return toutes.slice(Math.max(0, i));
}

function basculerEcoute(recitateur = lecteurForce) {
  if (lecteur?.enLecture && !modeRepeter) lecteur.pause();
  else if (lecteur?.cleCourante && !modeRepeter) lecteur.reprendre();
  else jouer(clesAJouer(), { recitateur });
  majBarre();
}

// « Répéter » = répète après moi : un verset, une pause pour le redire, puis le suivant.
function lancerRepeter() {
  if (modeRepeter && lecteur?.cleCourante) { lecteur.arreter(); return; }
  lecteur?.arreter();
  jouer(clesAJouer(), { recitateur: lecteurForce, repeter: true });
  bandeau('Écoute, puis répète pendant la pause.');
}

function majBarre() {
  const b = document.getElementById('action-ecouter');
  if (b) {
    const enLecture = lecteur?.enLecture && !modeRepeter;
    b.dataset.texte ??= b.textContent;
    const texte = enLecture ? 'Pause' : (lecteur?.cleCourante && !modeRepeter ? 'Reprendre' : b.dataset.texte);
    b.replaceChildren(icone(enLecture ? 'pause' : 'ecouter', 24), el('span', { textContent: texte }));
  }
  document.getElementById('action-repeter')?.classList.toggle('actif', modeRepeter && Boolean(lecteur?.cleCourante));
  document.getElementById('action-traduction')?.classList.toggle('actif', getVoirTraduction());
}

// ---- Versets signalés : mis de côté tout de suite (et aux ouvertures suivantes) ----
function avisMisDeCote(cle) {
  return el('div', { className: 'avis-mis-de-cote', 'data-cle': cle },
    el('p', { textContent: `Verset ${cle.split(':')[1]} mis de côté : tu as signalé une erreur.` }),
    boutonSecondaire('Annuler le signalement', () => { retirerSignalement('coran', cle); rafraichir(); }));
}

on('texte:signale', ({ type, id }) => {
  if (type !== 'coran') return;
  lecteur?.arreter();
  document.querySelectorAll(`.bloc-verset[data-cle="${id}"]`).forEach((b) => b.replaceWith(avisMisDeCote(id)));
  if (id === '1:1') document.querySelectorAll('.basmala[data-cle-source="1:1"]').forEach((b) => b.remove());
});

// ---- Traduction : sous chaque verset, bouton « Traduction » de la barre ----
function basculerTraductions() {
  ecrire('coran.voirTraduction', !getVoirTraduction());
  if (getVoirTraduction()) afficherTraductions();
  else document.querySelectorAll('.traduction').forEach((z) => { z.hidden = true; });
  majBarre();
}

async function afficherTraductions() {
  let infos = null;
  for (const bloc of [...document.querySelectorAll('.bloc-verset')]) {
    const zone = bloc.querySelector('.traduction');
    zone.hidden = false;
    if (zone.dataset.traduction === getTraductionActive()) continue;
    zone.replaceChildren(el('p', { className: 'message-doux', textContent: 'Chargement…' }));
    try {
      const t = await getTraduction(bloc.dataset.cle);
      zone.replaceChildren(texteTraduction(t));
      zone.dataset.traduction = t.id;
      infos = t;
    } catch (e) {
      zone.replaceChildren(el('p', { className: 'erreur', textContent: e.message }));
      return;
    }
  }
  if (infos) majCreditTraduction(infos);
}

// Le texte de la traduction, tel quel ; les appels de note ([2] ou ¹) s'ouvrent en les touchant.
function texteTraduction(t) {
  const p = el('p', { className: 'texte-traduction', lang: 'fr' });
  for (const m of t.morceaux) {
    if (m.texte === undefined) {
      p.append(appelNote(m.numero, () => getNoteHamidullah(m.note)));
      continue;
    }
    // Rachid Maach : le texte contient « [2] » ; on garde ces caractères, on les rend seulement touchables.
    m.texte.split(/(\[\d+\])/).forEach((bout) => {
      const num = /^\[(\d+)\]$/.exec(bout);
      if (num && t.notes) p.append(appelNote(bout, async () => noteRachid(t.notes, num[1]) ?? t.notes));
      else if (bout) p.append(bout);
    });
  }
  return p;
}
function noteRachid(notes, numero) {
  return notes.split('\n').find((l) => l.startsWith(`[${numero}]`)) ?? null;
}
function appelNote(texte, charger) {
  return el('button', { type: 'button', className: 'appel-note', textContent: texte, onclick: async () => {
    const zone = el('p', { className: 'message-doux', textContent: 'Chargement…' });
    ouvrirFeuille({ titre: 'Note', contenu: [zone] });
    try {
      zone.replaceWith(el('p', { className: 'texte-note', textContent: await charger() }));
    } catch (e) { zone.replaceWith(el('p', { className: 'erreur', textContent: e.message })); }
  } });
}

function majCreditTraduction(t) {
  const c = document.getElementById('credit-traduction') ?? el('p', { id: 'credit-traduction', className: 'credit' });
  c.replaceChildren(`Traduction : ${t.credit}`);
  if (t.version) c.append(` — version ${t.version}`);
  if (t.traducteur) c.append(` — ${t.traducteur}`);
  if (t.lienSignaler) c.append(el('br'), el('a', { href: t.lienSignaler, target: '_blank', rel: 'noopener', textContent: 'Prévenir QuranEnc d\'une erreur de traduction' }));
  document.querySelector('.texte-sourate')?.after(c);
}

function creditTexte() {
  return el('p', { className: 'credit' }, SOURCE_TEXTE.texte + ' — ',
    el('a', { href: SOURCE_TEXTE.lien, target: '_blank', rel: 'noopener', textContent: 'tanzil.net' }));
}

// ---- ⚙️ Réglages : feuille partagée avec la séance (reglages.js) ----
const ouvrirReglages = () => ouvrirReglagesEcoute();
on('coran:reglage', ({ nom, valeur }) => {
  if (nom === 'recitateur') { lecteur?.arreter(); if (sourateAffichee && location.hash.startsWith('#/coran/')) rafraichir(); }
  if (nom === 'vitesse') lecteur?.vitesse(valeur);
  if (nom === 'traduction') {
    document.querySelectorAll('.traduction').forEach((z) => { delete z.dataset.traduction; });
    if (getVoirTraduction() && document.querySelector('.bloc-verset .traduction')) afficherTraductions();
  }
});

// ---- Toucher un mot : son sens + « Ajouter à mes mots » (une seule action) ----
on('mot:touche', async ({ source, cle, position, texte }) => {
  if (source !== 'coran') return;
  const dejaGarde = estDansMesMots(cle, position);
  const sens = el('p', { className: 'sens', textContent: 'Chargement…' });
  const bouton = grosBouton(dejaGarde ? 'Déjà dans mes mots' : 'Ajouter à mes mots', null, { icone: dejaGarde ? 'ok' : 'mots' });
  bouton.disabled = dejaGarde;
  const [s, v] = cle.split(':');
  ouvrirFeuille({ contenu: [
    el('p', { className: 'arabe coran mot-panneau', lang: 'ar', dir: 'rtl', textContent: texte }),
    sens,
    el('p', { className: 'credit centre', textContent: `Sourate ${s}, verset ${v} · sens en anglais · quran.com` }),
    bouton,
  ] });
  let infos = null;
  try {
    infos = (await getSensMots(cle)).find((x) => x.position === position);
    sens.textContent = infos?.sens ? `« ${infos.sens} »` : 'Sens pas disponible pour ce mot.';
  } catch (e) { sens.textContent = e.message; }
  bouton.onclick = () => {
    ajouterMot({ cle, position, sens: infos?.sens ?? null, langue: infos?.langue ?? null, source: infos?.source ?? null });
    bouton.replaceChildren(icone('ok', 26), el('span', { textContent: 'Ajouté à mes mots' }));
    bouton.disabled = true;
  };
});

// ---- Sons à vérifier (Dosari) ----
const NOMS_ETAT = { 'a-verifier': 'À vérifier', ok: 'Vérifié', erreur: 'Erreur' };

async function afficherVerifications(conteneur) {
  const infos = new Map((await getListeSourates()).map((s) => [s.numero, s]));
  conteneur.append(message("Sur ces sourates, l'ordinateur ne peut pas prouver que chaque son de Dosari est le bon. Écoute-les. En attendant, c'est Husary qui récite."));
  conteneur.append(el('div', { className: 'liste-sourates' }, ...getSonsAVerifier().map((x) => el('a', { className: `ligne-sourate etat-${x.etat}`, href: `#/coran/verifier/${x.sourate}` },
    el('span', { className: 'num', textContent: x.sourate }),
    el('span', { className: 'nom' }, infos.get(x.sourate).nom, el('small', { textContent: `${infos.get(x.sourate).nbVersets} versets` })),
    el('span', { className: 'pastille', textContent: NOMS_ETAT[x.etat] })))));
}

async function afficherVerificationSourate(conteneur, n) {
  const x = getSonsAVerifier().find((y) => y.sourate === n);
  if (!x) throw new Error(`Rien à vérifier sur la sourate ${n}`);
  const s = await getSourate(n);
  sourateAffichee = s;
  versetChoisi = null;
  await chargerMotsFrequents();
  changerTitre(`${s.nom} · Dosari`);
  const texte = el('div', { className: 'texte-sourate' });
  for (const v of s.versets) texte.append(estSignale('coran', v.cle) ? avisMisDeCote(v.cle) : blocVerset(v, n));
  const repondre = (etat) => { lecteur?.arreter(); noterVerificationSon(x.recitateur, n, etat); location.hash = '#/coran/verifier'; };
  conteneur.append(
    message('Écoute en suivant le texte. Le son doit dire exactement le verset surligné.'),
    texte,
    el('div', { className: 'reponse-verif' },
      grosBouton("Vérifié, c'est bon", () => repondre('ok'), { icone: 'ok' }),
      boutonSecondaire('Il y a une erreur', () => repondre('erreur')),
      x.etat !== 'a-verifier' ? boutonSecondaire('Remettre « à vérifier »', () => repondre(null)) : null),
    el('p', { id: 'bandeau-lecture', className: 'bandeau-lecture', role: 'status', hidden: true }),
    barreActions([{ id: 'action-ecouter', icone: 'ecouter', texte: 'Écouter Dosari', principal: true, action: () => basculerEcoute(x.recitateur) }]),
  );
  document.querySelector('.barre-actions').classList.add('une-action');
  document.body.classList.add('avec-barre');
  lecteurForce = x.recitateur;
}
