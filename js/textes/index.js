// Propriétaire : Codex (tâche X1).
import { enregistrerEcran, aller } from '../core/routeur.js';
import { ajouterTexte, getTextes, getTexte, signalerTexte } from './api.js';
import { ajouterCommandesVoix } from './commandes-voix.js';
import { el, lienBouton, boutonSecondaire, message, enregistrerEntreePlus } from '../core/ui.js';

let nettoyerVoix = () => {};

enregistrerEntreePlus({ id: 'textes', icone: 'textes', titre: 'Mes textes', adresse: '#/textes', ordre: 10 });
enregistrerEcran('textes', {
  titre: params => params[0] === 'ajouter' ? 'Ajouter un texte' : 'Mes textes',
  onglet: 'plus', retour: params => params.length ? '#/textes' : '#/plus',
  reglages: () => nettoyerVoix.ouvrirReglages?.(),
  reglagesSi: params => Boolean(params[0] && params[0] !== 'ajouter' && getTexte(params[0])),
  afficher: afficherTextes,
});

export function afficherTextes(conteneur, params = []) {
  nettoyerVoix(); nettoyerVoix = () => {};
  conteneur.replaceChildren();
  if (params[0] === 'ajouter') return afficherAjout(conteneur);
  if (params[0]) return afficherTexte(conteneur, params[0]);
  conteneur.append(lienBouton('Ajouter un texte', '#/textes/ajouter', { gros: true }));
  const textes = getTextes();
  if (!textes.length) conteneur.append(message('Aucun texte pour le moment. Ajoute un texte que tu as vérifié.'));
  for (const texte of textes) {
    conteneur.append(lienBouton(texte.titre, `#/textes/${texte.id}`, { sousTexte: `Source : ${texte.source}` }));
  }
}

function afficherAjout(conteneur) {
  const form = el('form', { className: 'carte' });
  const champs = {};
  for (const [nom, titre, multiligne, obligatoire] of [
    ['titre', 'Titre', false, true],
    ['arabe', 'Texte arabe vérifié', true, true],
    ['source', 'Source du texte', false, true],
    ['traductionFr', 'Traduction française (si tu en as une)', true, false],
    ['sourceTraduction', 'Source officielle de la traduction', false, false],
  ]) {
    const champ = el(multiligne ? 'textarea' : 'input', {
      id: `texte-${nom}`, name: nom, required: obligatoire,
      autocomplete: 'off', spellcheck: false,
    });
    if (multiligne) champ.rows = nom === 'arabe' ? 6 : 4;
    if (nom === 'arabe') { champ.lang = 'ar'; champ.dir = 'rtl'; champ.className = 'arabe'; }
    champ.setAttribute('autocorrect', 'off');
    champ.setAttribute('autocapitalize', 'off');
    Object.assign(champ.style, { display: 'block', width: '100%', minHeight: '52px', padding: '12px', border: '1px solid var(--trait)', borderRadius: 'var(--rayon)', background: 'var(--carte)', fontSize: nom === 'arabe' ? 'var(--taille-arabe)' : '1rem' });
    champs[nom] = champ;
    form.append(el('p', {}, el('label', { htmlFor: champ.id, textContent: titre }), champ));
  }
  const confirmation = el('input', { type: 'checkbox', required: true, name: 'verifie' });
  Object.assign(confirmation.style, { minWidth: '44px', minHeight: '44px', verticalAlign: 'middle' });
  form.append(el('label', {}, confirmation, ' J’ai vérifié le texte. Si j’ajoute une traduction, elle vient de la source officielle indiquée.'));
  const erreur = el('p', { className: 'erreur', hidden: true });
  erreur.setAttribute('role', 'alert');
  form.append(erreur, el('button', { type: 'submit', className: 'gros-bouton', textContent: 'Garder ce texte' }));
  form.addEventListener('submit', evenement => {
    evenement.preventDefault();
    try {
      const texte = ajouterTexte({ ...Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, v.value])), verifie: confirmation.checked });
      aller(`textes/${texte.id}`);
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; }
  });
  conteneur.append(form);
}

function afficherTexte(conteneur, id) {
  const texte = getTexte(id);
  if (!texte) {
    conteneur.append(el('p', { className: 'carte', textContent: 'Ce texte est absent ou mis de côté.' }));
    return;
  }
  const arabe = el('p', { className: 'arabe', lang: 'ar', dir: 'rtl', textContent: texte.arabe });
  Object.assign(arabe.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
  const carte = el('article', {}, el('h2', { textContent: texte.titre }), arabe,
    el('p', { className: 'message-doux', textContent: `Source : ${texte.source}` }));
  nettoyerVoix = ajouterCommandesVoix(carte, arabe, texte);
  if (texte.traductionFr) {
    const traduction = el('div', { hidden: true, id: 'texte-traduction' },
      el('p', { textContent: texte.traductionFr }),
      el('p', { textContent: `Source : ${texte.sourceTraduction}` }));
    traduction.style.whiteSpace = 'pre-wrap';
    const bouton = boutonSecondaire('Voir la traduction', () => {});
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-controls', traduction.id);
    bouton.addEventListener('click', () => {
      traduction.hidden = !traduction.hidden;
      bouton.textContent = traduction.hidden ? 'Voir la traduction' : 'Cacher la traduction';
      bouton.setAttribute('aria-expanded', String(!traduction.hidden));
    });
    carte.append(bouton, traduction);
  }
  const signalement = boutonSecondaire('Signaler une erreur', () => {});
  signalement.addEventListener('click', () => {
    const garde = signalerTexte(id);
    carte.replaceChildren(el('p', { textContent: garde
      ? 'Texte mis de côté. Il ne sera plus proposé avant vérification.'
      : 'Texte mis de côté pour cette ouverture. Le téléphone ne peut pas garder le signalement. Réessaie avant de fermer.' }));
  });
  carte.append(signalement);
  conteneur.append(carte);
}
