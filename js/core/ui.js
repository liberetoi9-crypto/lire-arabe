// Propriétaire : Claude Code (C13). Composants communs : le MÊME style sur tous les écrans.
// Codex les utilise (import depuis '../core/ui.js'), il ne les recopie pas.

// el('div', { className, onclick, 'aria-label': … }, enfants…) : les noms avec un tiret deviennent des attributs.
export function el(tag, props = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (k.includes('-')) e.setAttribute(k, v); else e[k] = v;
  }
  e.append(...enfants.filter((x) => x !== null && x !== undefined && x !== false));
  return e;
}

// ---- Icônes (traits simples, couleur = celle du texte) ----
const TRACES = {
  accueil: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  coran: '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5zM12 6.5v13"/>',
  mots: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  plus: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  retour: '<path d="M15 5 8 12l7 7"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  ecouter: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3.2"/>',
  repeter: '<path d="M5 10a7 7 0 0 1 12-3.5L19 9M19 4v5h-5M19 14a7 7 0 0 1-12 3.5L5 15M5 20v-5h5"/>',
  traduction: '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 6.5M11 6c-.6 3.5-3 6.2-6 7.5M13 20l3.5-8 3.5 8M14.2 17.5h4.6"/>',
  fleche: '<path d="m9 5 7 7-7 7"/>',
  verrou: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  textes: '<path d="M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h4"/>',
  progression: '<path d="M4 19h16M6 16l4-5 3 3 5-7"/>',
  memorisation: '<path d="M12 4a5 5 0 0 0-5 5c0 2 1 3 1.5 4.5V16h7v-2.5C16 12 17 11 17 9a5 5 0 0 0-5-5zM9.5 19.5h5"/>',
  sons: '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/>',
  aide: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3.1 2.2c-.6.3-.9.8-.9 1.4v.5M12 16.8v.2"/>',
  ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lire: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
};
export function icone(nom, taille = 24) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', taille);
  s.setAttribute('height', taille);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'icone');
  s.innerHTML = `<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${TRACES[nom] ?? ''}</g>`;
  return s;
}

// ---- Boutons ----
// L'action principale de l'écran (une seule par écran).
export function grosBouton(texte, action, { icone: ic, sousTexte, id } = {}) {
  return el('button', { type: 'button', className: 'gros-bouton', id, onclick: action },
    ic ? icone(ic, 26) : null, el('span', {}, texte, sousTexte ? el('small', { textContent: sousTexte }) : null));
}
export function boutonSecondaire(texte, action, { icone: ic } = {}) {
  return el('button', { type: 'button', className: 'bouton-secondaire', onclick: action }, ic ? icone(ic, 20) : null, texte);
}
export function lienBouton(texte, adresse, { gros = false, sousTexte } = {}) {
  return el('a', { className: gros ? 'gros-bouton' : 'bouton-secondaire', href: adresse },
    el('span', {}, texte, sousTexte ? el('small', { textContent: sousTexte }) : null));
}

// ---- Feuille qui monte du bas (réglages ⚙️, mot touché…) ; se ferme en touchant à côté ----
export function ouvrirFeuille({ titre, contenu = [], surFermeture } = {}) {
  const voile = el('div', { className: 'voile' });
  const feuille = el('div', { className: 'feuille', role: 'dialog', 'aria-modal': 'true', 'aria-label': titre ?? 'Panneau' },
    el('div', { className: 'poignee' }),
    titre ? el('h2', { className: 'feuille-titre', textContent: titre }) : null,
    ...contenu);
  const fermer = () => {
    voile.remove();
    feuille.remove();
    window.removeEventListener('hashchange', fermer);
    surFermeture?.();
  };
  voile.addEventListener('click', fermer);
  window.addEventListener('hashchange', fermer);
  document.body.append(voile, feuille);
  return { feuille, fermer };
}

// Une ligne de réglage dans une feuille : « Récitateur ……… Husary › » avec un choix.
export function ligneChoix(titre, options, valeur, quandChange) {
  const choix = el('select', { className: 'choix-discret', 'aria-label': titre },
    ...options.map(([v, t]) => el('option', { value: v, textContent: t, selected: v === valeur })));
  choix.addEventListener('change', () => quandChange(choix.value));
  return el('label', { className: 'ligne-reglage' }, el('span', { textContent: titre }), choix);
}

// ---- Barre d'actions en bas d'un écran de lecture (3 boutons maximum) ----
// actions : [{ icone, texte, action, principal, id }]
export function barreActions(actions) {
  return el('div', { className: 'barre-actions' }, ...actions.map((a) => el('button', {
    type: 'button', className: a.principal ? 'action principale' : 'action', id: a.id, onclick: a.action,
  }, icone(a.icone, 24), el('span', { textContent: a.texte }))));
}

// ---- Étapes de la séance : ▬ ▬ ▭ ▭ ----
export function etapes(numero, total, texte) {
  return el('div', { className: 'etapes' },
    el('div', { className: 'etapes-barre', 'aria-hidden': 'true' },
      ...Array.from({ length: total }, (_, i) => el('i', { className: i < numero ? 'fait' : '' }))),
    el('p', { className: 'etapes-texte' }, el('b', { textContent: `Étape ${numero} sur ${total}` }), texte ? ` · ${texte}` : ''));
}

// ---- Messages simples ----
export const message = (texte) => el('p', { className: 'message-doux', textContent: texte });

// ---- Page « Plus » : chaque module y range ses entrées (la page est affichée par Codex, X16) ----
// entree : { id, icone, titre, sousTitre?, adresse, badge?: () => nombre|null, verrouille?: () => booléen, ordre }
const entreesPlus = new Map();
export function enregistrerEntreePlus(entree) { entreesPlus.set(entree.id, entree); }
export const getEntreesPlus = () => [...entreesPlus.values()].sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));

// Une ligne de la page « Plus » (même style partout).
export function lignePlus(e) {
  const verrou = e.verrouille?.() ?? false;
  const badge = e.badge?.();
  return el('a', { className: 'ligne-plus' + (verrou ? ' verrouillee' : ''), href: verrou ? undefined : e.adresse, 'aria-disabled': verrou ? 'true' : undefined },
    icone(verrou ? 'verrou' : e.icone, 26),
    el('span', { className: 'ligne-plus-texte' }, e.titre, e.sousTitre ? el('small', { textContent: e.sousTitre }) : null),
    badge ? el('span', { className: 'pastille-nombre', textContent: badge }) : null,
    verrou ? null : icone('fleche', 20));
}
