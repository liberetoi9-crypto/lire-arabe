// Propriétaire : Claude Code (C3). Écrans : #/coran (liste) et #/coran/112 (lecture).
import { enregistrerEcran } from '../core/routeur.js';
import { emit, on } from '../core/bus.js';
import { boutonSignaler, estSignale } from '../core/signalement.js';
import { getSourate, getVerset, getListeSourates, ordreJuzAmma, SOURCE_TEXTE,
  getRecitateurs, getRecitateurActif, setRecitateurActif, creerLecteur,
  recitateurPourSourate, getSonsAVerifier, noterVerificationSon,
  chargerMotsFrequents, estMotFrequent, getColorerFrequents, setColorerFrequents,
  getTraduction, getTraductions, getTraductionActive, setTraductionActive, getNoteHamidullah, getSensMots } from './api.js';
import { ajouterMot, estDansMesMots } from '../mots/api.js';

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
  async afficher(conteneur, [numero, sous, pos]) {
    if (numero === 'verifier') return sous ? afficherVerificationSourate(conteneur, Number(sous)) : afficherVerifications(conteneur);
    if (numero) return afficherSourate(conteneur, Number(numero), Number(sous) || null, Number(pos) || null);
    return afficherListe(conteneur);
  },
});

async function afficherListe(conteneur) {
  const juz = await ordreJuzAmma();
  const toutes = Array.from({ length: 114 }, (_, i) => i + 1);
  const aVerifier = getSonsAVerifier().filter((x) => x.etat === 'a-verifier').length;
  if (aVerifier) {
    conteneur.append(el('a', { className: 'carte lien-verif', href: '#/coran/verifier' },
      `🎧 Sons de Dosari à vérifier : ${aVerifier} sourate${aVerifier > 1 ? 's' : ''}`));
  }
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

async function afficherSourate(conteneur, n, versetCible = null, motCible = null) {
  const s = await getSourate(n);
  await chargerMotsFrequents();
  document.body.classList.toggle('sans-frequents', !getColorerFrequents());
  conteneur.append(el('h2', { className: 'titre-sourate', textContent: `${n}. ${s.nom}${s.nomFr ? ' — ' + s.nomFr : ''}` }));

  // Basmala (sauf sourates 1 et 9) : texte pris dans la source (verset 1:1), jamais écrit à la main.
  if (n !== 1 && n !== 9) {
    const b = await getVerset('1:1');
    conteneur.append(el('p', { className: 'arabe coran basmala', lang: 'ar', dir: 'rtl', textContent: b.texte }));
  }

  conteneur.append(barreLecture(s));

  for (const v of s.versets) {
    const zoneTraduction = el('div', { className: 'traduction', hidden: true });
    const boutonTraduction = el('button', { className: 'secondaire', textContent: 'Traduction' });
    boutonTraduction.addEventListener('click', () => basculerTraduction(v.cle, zoneTraduction, boutonTraduction));
    const bloc = el('div', { className: 'bloc-verset' + (estSignale('coran', v.cle) ? ' signale' : '') }, ligneVerset(v, n),
      el('div', { className: 'actions-verset' },
        el('button', { className: 'secondaire', textContent: '▶ Écouter', onclick: () => jouer([v.cle]) }),
        boutonTraduction,
        boutonSignaler('coran', v.cle)),
      zoneTraduction);
    conteneur.append(bloc);
  }
  conteneur.append(credit());

  // Arrivée depuis « Mes mots » : #/coran/112/3/2 → aller au verset 3 et montrer le mot n° 2.
  if (versetCible) {
    const ligne = conteneur.querySelector(`.verset[data-cle="${n}:${versetCible}"]`);
    if (!ligne) throw new Error(`Verset ${n}:${versetCible} inexistant`);
    ligne.closest('.bloc-verset').classList.add('cible');
    if (motCible) ligne.querySelector(`.mot[data-position="${motCible}"]`)?.classList.add('mot-cible');
    requestAnimationFrame(() => ligne.scrollIntoView({ block: 'center' }));
  }
}

// ---- Traduction française du verset (Hamidullah / Rachid Maach) ----
async function basculerTraduction(cle, zone, bouton) {
  if (!zone.hidden) { zone.hidden = true; bouton.textContent = 'Traduction'; return; }
  zone.hidden = false;
  bouton.textContent = 'Cacher la traduction';
  zone.replaceChildren(el('p', { className: 'aide', textContent: 'Chargement…' }));
  try {
    const t = await getTraduction(cle);
    const texte = el('p', { className: 'texte-traduction', lang: 'fr' });
    const notes = el('div', { className: 'notes', hidden: true });
    for (const m of t.morceaux) {
      if (m.texte !== undefined) texte.append(m.texte);
      else {
        // Appel de note Hamidullah : on l'affiche en petit ; toucher = lire la note (quran.com).
        const sup = el('sup', { className: 'appel-note', textContent: m.numero });
        sup.addEventListener('click', async () => {
          notes.hidden = false;
          notes.append(el('p', { textContent: `[${m.numero}] ${await getNoteHamidullah(m.note)}` }));
        }, { once: true });
        texte.append(sup);
      }
    }
    const infos = el('p', { className: 'credit' }, t.credit);
    if (t.version) infos.append(` — version ${t.version}`);
    if (t.traducteur) infos.append(el('br'), t.traducteur);
    zone.replaceChildren(texte, notes, infos);
    if (t.notes) {
      // Notes de Rachid Maach : affichées telles quelles (condition QuranEnc n° 1).
      notes.append(el('p', { className: 'notes-texte', textContent: t.notes }));
      zone.append(el('button', { className: 'secondaire petit', textContent: 'Notes', onclick: () => { notes.hidden = !notes.hidden; } }));
    }
    if (t.lienSignaler) {
      zone.append(el('a', { className: 'lien-discret', href: t.lienSignaler, target: '_blank', rel: 'noopener', textContent: 'Prévenir QuranEnc d\'une erreur de traduction' }));
    }
  } catch (e) {
    zone.replaceChildren(el('p', { className: 'erreur', textContent: e.message }));
  }
}

// ---- Toucher un mot : son sens (anglais, quran.com) + « Ajouter à mes mots » ----
on('mot:touche', async ({ source, cle, position, texte }) => {
  if (source !== 'coran') return;
  const panneau = panneauMot();
  const motArabe = el('p', { className: 'arabe coran mot-panneau', lang: 'ar', dir: 'rtl', textContent: texte });
  const zoneSens = el('p', { className: 'sens', textContent: 'Chargement du sens…' });
  const [s, v] = cle.split(':');
  const boutonAjout = el('button', { textContent: estDansMesMots(cle, position) ? '✔ Dans mes mots' : '+ Ajouter à mes mots', disabled: estDansMesMots(cle, position) });
  panneau.contenu.replaceChildren(motArabe, zoneSens,
    el('p', { className: 'credit', textContent: `Sourate ${s}, verset ${v} — sens mot à mot en anglais (quran.com)` }),
    el('div', { className: 'ligne-boutons' }, boutonAjout, el('button', { className: 'secondaire', textContent: 'Fermer', onclick: panneau.fermer })));
  panneau.ouvrir();
  let sens = null;
  try {
    sens = (await getSensMots(cle)).find((x) => x.position === position);
    zoneSens.textContent = sens?.sens ?? 'Sens non disponible pour ce mot.';
  } catch (e) {
    zoneSens.textContent = e.message;
  }
  boutonAjout.addEventListener('click', () => {
    ajouterMot({ cle, position, sens: sens?.sens ?? null, langue: sens?.langue ?? null, source: sens?.source ?? null });
    boutonAjout.textContent = '✔ Dans mes mots';
    boutonAjout.disabled = true;
  });
});

let panneauExistant = null;
function panneauMot() {
  if (panneauExistant) return panneauExistant;
  const contenu = el('div', { className: 'panneau-contenu' });
  const fond = el('div', { className: 'panneau-fond', hidden: true });
  const boite = el('div', { className: 'panneau', hidden: true, role: 'dialog' }, contenu);
  const fermer = () => { fond.hidden = true; boite.hidden = true; };
  fond.addEventListener('click', fermer);
  window.addEventListener('hashchange', fermer);
  document.body.append(fond, boite);
  panneauExistant = { contenu, fermer, ouvrir: () => { fond.hidden = false; boite.hidden = false; } };
  return panneauExistant;
}

// Un verset : chaque mot est touchable. Contrôle automatique du numéro.
function ligneVerset(v, n) {
  if (v.cle !== `${n}:${v.verset}`) throw new Error(`Contrôle : verset ${v.cle} au mauvais endroit`);
  const ligne = el('p', { className: 'arabe coran verset', lang: 'ar', dir: 'rtl' });
  ligne.dataset.cle = v.cle;
  v.mots.forEach((m, i) => {
    // Couleur seulement : le texte du mot reste exactement celui de la source.
    const mot = el('span', { className: estMotFrequent(m.texte) ? 'mot frequent' : 'mot', textContent: m.texte });
    mot.dataset.position = m.position;
    mot.addEventListener('click', () => emit('mot:touche', { source: 'coran', cle: v.cle, position: m.position, texte: m.texte }));
    ligne.append(mot, i < v.mots.length - 1 ? ' ' : '');
  });
  ligne.append(' ', el('span', { className: 'num-verset', textContent: chiffres(v.verset) }));
  return ligne;
}

// ---- Écran « Sons à vérifier » (#/coran/verifier et #/coran/verifier/93) ----
const NOMS_ETAT = { 'a-verifier': 'À vérifier', ok: 'Vérifié, c\'est bon', erreur: 'Erreur signalée' };

async function afficherVerifications(conteneur) {
  const infos = new Map((await getListeSourates()).map((s) => [s.numero, s]));
  conteneur.append(
    el('h2', { className: 'titre-section', textContent: 'Sons à vérifier' }),
    el('p', { className: 'aide', textContent: "Sur ces sourates, l'ordinateur ne peut pas prouver que chaque son de Dosari est le bon verset. Écoute-les. Tant que ce n'est pas vérifié, c'est Husary qui récite à la place." }),
  );
  const liste = el('div', { className: 'liste-sourates' });
  for (const x of getSonsAVerifier()) {
    const s = infos.get(x.sourate);
    liste.append(el('a', { className: `carte sourate-lien etat-${x.etat}`, href: `#/coran/verifier/${x.sourate}` },
      el('span', { className: 'num', textContent: x.sourate }),
      el('span', { className: 'nom', textContent: `${s.nom} — ${x.nom}` }),
      el('span', { className: 'pastille', textContent: NOMS_ETAT[x.etat] }),
      el('span', { className: 'infos', textContent: `${s.nbVersets} versets` }),
    ));
  }
  conteneur.append(liste);
}

async function afficherVerificationSourate(conteneur, n) {
  const x = getSonsAVerifier().find((y) => y.sourate === n);
  if (!x) throw new Error(`Rien à vérifier sur la sourate ${n}`);
  const s = await getSourate(n);
  await chargerMotsFrequents();
  conteneur.append(
    el('a', { href: '#/coran/verifier', className: 'retour', textContent: '← Sons à vérifier' }),
    el('h2', { className: 'titre-sourate', textContent: `${n}. ${s.nom} — ${x.nom}` }),
    el('p', { className: 'aide', textContent: "Écoute chaque verset en lisant le texte. Le son doit dire exactement le verset surligné, ni celui d'avant, ni celui d'après." }),
    el('p', { className: 'etat-actuel', textContent: `État : ${NOMS_ETAT[x.etat]}` }),
    el('div', { className: 'barre-lecture' },
      el('div', { className: 'ligne-boutons' },
        el('button', { id: 'bouton-lecture', textContent: '▶ Écouter la sourate', onclick: () => basculerLecture(s, x.recitateur) }),
        el('button', { className: 'secondaire', textContent: '■ Stop', onclick: () => lecteur?.arreter() })),
      el('p', { id: 'message-lecteur', className: 'message-lecteur', role: 'status' })),
  );
  for (const v of s.versets) {
    conteneur.append(el('div', { className: 'bloc-verset' }, ligneVerset(v, n),
      el('div', { className: 'actions-verset' },
        el('button', { className: 'secondaire', textContent: `▶ ${x.nom.split(' ').pop()}`, onclick: () => jouer([v.cle], x.recitateur) }))));
  }
  const repondre = (etat) => { lecteur?.arreter(); noterVerificationSon(x.recitateur, n, etat); location.hash = '#/coran/verifier'; };
  conteneur.append(el('div', { className: 'carte reponse-verif' },
    el('button', { textContent: '✔ Vérifié, c\'est bon', onclick: () => repondre('ok') }),
    el('button', { className: 'danger', textContent: '✖ Erreur', onclick: () => repondre('erreur') }),
    x.etat !== 'a-verifier' ? el('button', { className: 'secondaire', textContent: 'Remettre « à vérifier »', onclick: () => repondre(null) }) : ''));
}

function basculerLecture(s, recitateur = null) {
  if (lecteur?.enLecture) lecteur.pause();
  else if (lecteur?.cleCourante) lecteur.reprendre();
  else jouer(s.versets.map((v) => v.cle), recitateur);
  majBoutonLecture();
}

let lecteurForce = null;
function jouer(cles, recitateurForce = null) {
  if (lecteur && lecteurForce !== recitateurForce) { lecteur.arreter(); lecteur = null; }
  lecteurForce = recitateurForce;
  lecteur ??= creerLecteur({ recitateur: recitateurForce });
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
  const note = el('p', { className: 'note-recitateur' });
  const majNote = () => {
    const joue = recitateurPourSourate(s.numero);
    note.replaceChildren();
    if (joue !== getRecitateurActif()) {
      note.append("Dosari n'est pas encore vérifié sur cette sourate : c'est Husary qui récite. ",
        el('a', { href: `#/coran/verifier/${s.numero}`, textContent: 'Vérifier maintenant' }));
    }
  };
  majNote();
  choixRecitateur.addEventListener('change', () => { lecteur?.arreter(); setRecitateurActif(choixRecitateur.value); majNote(); });

  const choixFois = el('select', { className: 'choix', 'aria-label': 'Répéter chaque verset' },
    ...[1, 3, 5, 10].map((n) => el('option', { value: n, textContent: n === 1 ? 'Chaque verset 1 fois' : `Chaque verset ${n} fois`, selected: n === reglages.fois })));
  choixFois.addEventListener('change', () => { reglages.fois = Number(choixFois.value); });

  const caseRepete = el('input', { type: 'checkbox', checked: reglages.repeteApresMoi });
  caseRepete.addEventListener('change', () => { reglages.repeteApresMoi = caseRepete.checked; });
  const caseFrequents = el('input', { type: 'checkbox', checked: getColorerFrequents() });
  caseFrequents.addEventListener('change', () => { setColorerFrequents(caseFrequents.checked); document.body.classList.toggle('sans-frequents', !caseFrequents.checked); });
  const choixTraduction = el('select', { className: 'choix', 'aria-label': 'Traduction française' },
    ...getTraductions().map((t) => el('option', { value: t.id, textContent: t.nom, selected: t.id === getTraductionActive() })));
  choixTraduction.addEventListener('change', () => {
    setTraductionActive(choixTraduction.value);
    document.querySelectorAll('.traduction').forEach((z) => { z.hidden = true; });
    document.querySelectorAll('.actions-verset button').forEach((b) => { if (b.textContent === 'Cacher la traduction') b.textContent = 'Traduction'; });
  });
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
      el('summary', { textContent: 'Réglages (récitateur, traduction…)' }),
      el('label', { className: 'ligne-reglage' }, 'Récitateur', choixRecitateur),
      choixFois,
      el('label', { className: 'ligne-case' }, caseRepete, ' Répète après moi (une pause après chaque verset)'),
      el('label', { className: 'ligne-case' }, caseLent, ' Lent'),
      el('label', { className: 'ligne-case' }, caseFrequents, ' Colorer les petits mots fréquents'),
      el('label', { className: 'ligne-reglage' }, 'Traduction française du verset', choixTraduction),
    ),
    note,
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
