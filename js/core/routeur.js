// Propriétaire : Claude Code. Adresses du type #/coran/112 → écran 'coran', params ['112'].
const ecrans = new Map();
let ecranParDefaut = 'seance';

export function enregistrerEcran(nom, { titre, afficher }) {
  ecrans.set(nom, { titre, afficher });
}

function lireAdresse() {
  const [nom, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { nom: nom || ecranParDefaut, params };
}

async function afficherEcranCourant() {
  const { nom, params } = lireAdresse();
  const ecran = ecrans.get(nom) ?? ecrans.get(ecranParDefaut);
  const conteneur = document.getElementById('ecran');
  document.getElementById('titre-ecran').textContent = ecran?.titre ?? "Lire l'arabe";
  document.querySelectorAll('.menu a').forEach((a) => {
    a.classList.toggle('actif', a.getAttribute('href') === `#/${nom}`);
  });
  conteneur.replaceChildren();
  if (!ecran) return;
  try {
    await ecran.afficher(conteneur, params);
  } catch (e) {
    console.error(e);
    const p = document.createElement('p');
    p.className = 'erreur';
    p.textContent = 'Erreur : ' + e.message;
    conteneur.append(p);
  }
}

export function aller(adresse) { location.hash = '#/' + adresse; }

export function demarrer(defaut) {
  ecranParDefaut = defaut;
  window.addEventListener('hashchange', afficherEcranCourant);
  afficherEcranCourant();
}
