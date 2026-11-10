// Propriétaire : Claude Code (C6). Écrans #/mots (ma liste) et #/mots/revision (cartes).
// Le mot arabe est toujours relu dans le texte officiel (sourate + verset + position) : jamais recopié à la main.
import { enregistrerEcran } from '../core/routeur.js';
import { getVerset, chargerMotsFrequents } from '../coran/api.js';
import { getMesMots, getMotsAReviser, retirerMot, reviserMot } from './api.js';

const el = (tag, props = {}, ...enfants) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...enfants);
  return e;
};

// Le mot et son verset, depuis la source officielle. Contrôle : la position doit exister dans ce verset.
async function depuisLaSource(m) {
  const v = await getVerset(m.cle);
  const mot = v.mots.find((x) => x.position === m.position);
  if (!mot) throw new Error(`Mot n° ${m.position} introuvable dans le verset ${m.cle}`);
  return { verset: v, mot };
}

const lienVerset = (m) => `#/coran/${m.sourate}/${m.verset}/${m.position}`;

enregistrerEcran('mots', {
  titre: 'Mes mots',
  async afficher(conteneur, [mode]) {
    await chargerMotsFrequents();
    if (mode === 'revision') return afficherRevision(conteneur);
    return afficherListe(conteneur);
  },
});

async function afficherListe(conteneur) {
  const mots = getMesMots();
  if (!mots.length) {
    conteneur.append(el('p', { className: 'carte aide', textContent: 'Aucun mot pour l\'instant. Dans le Coran, touche un mot puis « Ajouter à mes mots ».' }));
    return;
  }
  const aReviser = getMotsAReviser().length;
  conteneur.append(el('a', { className: 'bouton bouton-large', href: '#/mots/revision',
    textContent: aReviser ? `Réviser (${aReviser} carte${aReviser > 1 ? 's' : ''})` : 'Rien à réviser aujourd\'hui' }));
  conteneur.append(el('p', { className: 'aide', textContent: `${mots.length} mot${mots.length > 1 ? 's' : ''}` }));
  for (const m of [...mots].reverse()) {
    const ligne = el('div', { className: 'carte mot-liste' });
    try {
      const { mot } = await depuisLaSource(m);
      ligne.append(
        el('p', { className: 'arabe coran', lang: 'ar', dir: 'rtl', textContent: mot.texte }),
        el('p', { className: 'sens', textContent: m.sens ?? 'Sens non disponible' }),
        el('p', { className: 'credit', textContent: `Sourate ${m.sourate}, verset ${m.verset}` }),
        el('div', { className: 'ligne-boutons' },
          el('a', { className: 'bouton secondaire', href: lienVerset(m), textContent: 'Voir dans le verset' }),
          el('button', { className: 'secondaire', textContent: 'Retirer', onclick: () => { retirerMot(m.id); ligne.remove(); } })),
      );
    } catch (e) {
      ligne.append(el('p', { className: 'erreur', textContent: e.message }));
    }
    conteneur.append(ligne);
  }
}

async function afficherRevision(conteneur) {
  const file = getMotsAReviser();
  let i = 0;
  const zone = el('div');
  conteneur.append(el('a', { href: '#/mots', className: 'retour', textContent: '← Mes mots' }), zone);

  async function carte() {
    if (i >= file.length) {
      zone.replaceChildren(el('p', { className: 'carte', textContent: 'Bravo, révision finie pour aujourd\'hui !' }));
      return;
    }
    const m = file[i];
    const { verset, mot } = await depuisLaSource(m);
    const dos = el('div', { className: 'dos-carte', hidden: true });
    // Le verset entier, avec le mot révisé mis en valeur (le texte reste celui de la source).
    const ligneVerset = el('p', { className: 'arabe coran verset', lang: 'ar', dir: 'rtl' });
    verset.mots.forEach((x, k) => {
      ligneVerset.append(el('span', { className: x.position === m.position ? 'mot mot-cible' : 'mot', textContent: x.texte }), k < verset.mots.length - 1 ? ' ' : '');
    });
    dos.append(
      el('p', { className: 'sens grand', textContent: m.sens ?? 'Sens non disponible' }),
      ligneVerset,
      el('p', { className: 'credit' }, `Sourate ${m.sourate}, verset ${m.verset} — `, el('a', { href: lienVerset(m), textContent: 'ouvrir le verset' })),
      el('div', { className: 'ligne-boutons' },
        el('button', { textContent: '✔ Je savais', onclick: () => { reviserMot(m.id, true); i++; carte(); } }),
        el('button', { className: 'danger', textContent: '✖ À revoir', onclick: () => { reviserMot(m.id, false); i++; carte(); } })),
    );
    const voir = el('button', { className: 'bouton-large', textContent: 'Voir le sens', onclick: () => { dos.hidden = false; voir.remove(); } });
    zone.replaceChildren(el('div', { className: 'carte carte-revision' },
      el('p', { className: 'aide', textContent: `Carte ${i + 1} sur ${file.length}` }),
      el('p', { className: 'arabe coran mot-revision', lang: 'ar', dir: 'rtl', textContent: mot.texte }),
      voir, dos));
  }
  if (!file.length) zone.append(el('p', { className: 'carte', textContent: 'Rien à réviser aujourd\'hui.' }));
  else await carte();
}
