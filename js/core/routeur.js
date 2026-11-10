// Propriétaire : Claude Code. Adresses du type #/coran/112 → écran 'coran', params ['112'].
// Options d'un écran (C13, nouvelle mise en page) :
//   titre        : texte en haut (ou fonction (params) => texte)
//   onglet       : 'accueil' | 'coran' | 'mots' | 'plus' → onglet allumé dans le menu du bas
//   retour       : adresse de la flèche ‹ (ou fonction (params) => adresse) ; absent = pas de flèche
//   reglages     : fonction appelée par la roue ⚙️ ; absente = pas de roue
//   reglagesSi   : (params) => booléen : roue seulement sur certaines adresses
//   sansMenu     : true = cache le menu du bas (ex. séance guidée)
//   afficher(conteneur, params)
import { icone } from './ui.js';

const ecrans = new Map();
let ecranParDefaut = 'accueil';

export function enregistrerEcran(nom, options) {
  ecrans.set(nom, options);
}

function lireAdresse() {
  const [nom, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { nom: nom || ecranParDefaut, params };
}

const valeur = (v, params) => (typeof v === 'function' ? v(params) : v);

async function afficherEcranCourant() {
  const { nom, params } = lireAdresse();
  const ecran = ecrans.get(nom) ?? ecrans.get(ecranParDefaut);
  const conteneur = document.getElementById('ecran');
  document.getElementById('titre-ecran').textContent = valeur(ecran?.titre, params) ?? "Lire l'arabe";

  // Flèche retour et roue ⚙️ : seulement si l'écran en a besoin.
  const retour = document.getElementById('bouton-retour');
  const adresseRetour = valeur(ecran?.retour, params);
  retour.hidden = !adresseRetour;
  retour.href = adresseRetour ?? '#';
  const roue = document.getElementById('bouton-reglages');
  roue.hidden = !ecran?.reglages || (ecran.reglagesSi ? !ecran.reglagesSi(params) : false);
  roue.onclick = () => ecran?.reglages?.(params);

  document.body.classList.toggle('sans-menu', Boolean(ecran?.sansMenu));
  document.querySelectorAll('.menu a').forEach((a) => {
    const actif = a.dataset.onglet === ecran?.onglet;
    a.classList.toggle('actif', actif);
    if (actif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  conteneur.replaceChildren();
  window.scrollTo(0, 0);
  if (!ecran) return;
  try {
    await ecran.afficher(conteneur, params);
  } catch (e) {
    console.error(e);
    const p = document.createElement('p');
    p.className = 'erreur';
    p.textContent = 'Oups : ' + e.message;
    conteneur.append(p);
  }
}

// Changer le titre en haut une fois l'écran chargé (ex. nom de la sourate).
export function changerTitre(texte) { document.getElementById('titre-ecran').textContent = texte; }

export function aller(adresse) { location.hash = '#/' + adresse; }

// Réafficher l'écran courant (ex. après un changement de réglage).
export const rafraichir = () => afficherEcranCourant();

export function demarrer(defaut) {
  ecranParDefaut = defaut;
  // Icônes du menu et de l'en-tête (dessinées par ui.js : même style partout).
  document.querySelectorAll('[data-icone]').forEach((e) => e.prepend(icone(e.dataset.icone, e.dataset.taille ?? 24)));
  window.addEventListener('hashchange', afficherEcranCourant);
  afficherEcranCourant();
}
