// Propriétaire : Claude Code (C14). Écran d'Accueil + 3 écrans d'explication (première ouverture).
// Accueil : UN seul gros bouton « Commencer ma séance du jour », la série en petit, où j'en suis. Rien d'autre.
import { enregistrerEcran } from '../core/routeur.js';
import { lire, ecrire } from '../core/stockage.js';
import { el, icone, grosBouton, enregistrerEntreePlus } from '../core/ui.js';
import { getEtatSeance } from '../seance/api.js';

enregistrerEcran('accueil', {
  titre: "Lire l'arabe",
  onglet: 'accueil',
  async afficher(conteneur) {
    const etat = await getEtatSeance();
    const centre = el('div', { className: 'accueil' });
    if (etat.faiteAujourdhui) {
      centre.append(
        el('div', { className: 'bravo' }, icone('ok', 40), el('p', { textContent: 'Séance finie. À demain !' })),
        el('a', { className: 'lien-discret', href: '#/seance/1', textContent: 'Refaire une séance' }));
    } else {
      centre.append(grosBouton('Commencer ma séance du jour', () => { location.hash = '#/seance'; }, { icone: 'ecouter', id: 'commencer' }));
    }
    const serie = await getSerie();
    if (serie) centre.append(el('p', { className: 'serie', textContent: `🔥 ${serie} jour${serie > 1 ? 's' : ''} d'affilée` }));
    if (etat.sourate) centre.append(el('p', { className: 'ou-j-en-suis' }, "Aujourd'hui : ", el('b', { textContent: etat.sourate.nom }), ` · phase ${etat.phase}`));
    conteneur.append(centre);
  },
});

// Série de jours : calculée par Codex (X18) ; tant que ce n'est pas prêt, on n'affiche rien.
async function getSerie() {
  try {
    const p = await import('../progression/api.js');
    return p.getSerie() || 0;
  } catch { return 0; }
}

// ---- Première ouverture : 3 petits écrans, avec « Passer » ----
const PAGES = [
  { icone: 'coran', titre: 'Bienvenue !', texte: "Chaque jour, une petite séance de 20 minutes pour lire l'arabe et le Coran de plus en plus vite." },
  { icone: 'ecouter', titre: 'Écoute, lis, recommence', texte: "L'appli te guide : d'abord tu écoutes la sourate, ensuite tu la lis 5 fois, puis une dernière fois avec le chrono." },
  { icone: 'mots', titre: 'Touche un mot', texte: 'Touche un mot pour voir ce qu\'il veut dire, et garde-le dans « Mes mots » pour le réviser.' },
];
export const bienvenueVue = () => lire('accueil.bienvenueVue', false);

enregistrerEcran('bienvenue', {
  titre: '',
  sansMenu: true,
  afficher(conteneur, [page]) {
    const i = Math.min(Math.max(Number(page) || 0, 0), PAGES.length - 1);
    const p = PAGES[i];
    const finir = () => { ecrire('accueil.bienvenueVue', true); location.hash = '#/accueil'; };
    conteneur.append(el('div', { className: 'bienvenue' },
      el('button', { type: 'button', className: 'passer', textContent: 'Passer', onclick: finir }),
      el('div', { className: 'bienvenue-icone' }, icone(p.icone, 64)),
      el('h2', { textContent: p.titre }),
      el('p', { textContent: p.texte }),
      el('div', { className: 'points', 'aria-label': `Page ${i + 1} sur ${PAGES.length}` }, ...PAGES.map((_, k) => el('i', { className: k === i ? 'actif' : '' }))),
      grosBouton(i < PAGES.length - 1 ? 'Suivant' : "C'est parti !", () => {
        if (i < PAGES.length - 1) location.hash = `#/bienvenue/${i + 1}`; else finir();
      })));
  },
});

enregistrerEntreePlus({ id: 'explication', icone: 'aide', titre: "Revoir l'explication", adresse: '#/bienvenue', ordre: 90 });
