// Propriétaire : Claude Code (C6 ; nouvelle mise en page C14). Écrans #/mots et #/mots/revision.
// Le mot arabe est toujours relu dans le texte officiel (sourate + verset + position) : jamais recopié à la main.
import { enregistrerEcran } from '../core/routeur.js';
import { el, grosBouton, lienBouton, boutonSecondaire, ouvrirFeuille, message } from '../core/ui.js';
import { getVerset, getListeSourates, chargerMotsFrequents } from '../coran/api.js';
import { estSignale } from '../core/signalement.js';
import { getMesMots, getMotsAReviser, retirerMot, reviserMot } from './api.js';

// Le mot et son verset, depuis la source officielle. Contrôle : la position doit exister dans ce verset.
async function depuisLaSource(m) {
  if (estSignale('coran', m.cle)) throw new Error('Verset mis de côté (tu as signalé une erreur).');
  const v = await getVerset(m.cle);
  const mot = v.mots.find((x) => x.position === m.position);
  if (!mot) throw new Error(`Mot introuvable dans le verset ${m.cle}`);
  return { verset: v, mot };
}

const lienVerset = (m) => `#/coran/${m.sourate}/${m.verset}/${m.position}`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

enregistrerEcran('mots', {
  titre: (p) => (p[0] === 'revision' ? 'Révision' : 'Mes mots'),
  onglet: 'mots',
  retour: (p) => (p[0] === 'revision' ? '#/mots' : null),
  async afficher(conteneur, [mode]) {
    await chargerMotsFrequents();
    if (mode === 'revision') return afficherRevision(conteneur);
    return afficherListe(conteneur);
  },
});

async function afficherListe(conteneur) {
  const mots = getMesMots();
  if (!mots.length) {
    conteneur.append(el('div', { className: 'vide' },
      el('p', { textContent: 'Pas encore de mots.' }),
      message('Dans le Coran, touche un mot, puis « Ajouter à mes mots ».'),
      lienBouton('Ouvrir le Coran', '#/coran', { gros: true })));
    return;
  }
  const aReviser = getMotsAReviser().filter((m) => !estSignale('coran', m.cle)).length;
  conteneur.append(aReviser
    ? lienBouton(`Réviser ${pluriel(aReviser, 'mot')}`, '#/mots/revision', { gros: true })
    : el('p', { className: 'carte centre', textContent: 'Rien à réviser aujourd\'hui. Bravo !' }));
  conteneur.append(el('p', { className: 'sous-titre', textContent: `${pluriel(mots.length, 'mot gardé')} · touche un mot pour le revoir dans son verset` }));
  const noms = new Map((await getListeSourates()).map((s) => [s.numero, s.nom]));
  const liste = el('div', { className: 'liste-sourates' });
  for (const m of [...mots].reverse()) {
    const ligne = el('a', { className: 'ligne-mot', href: lienVerset(m) });
    try {
      const { mot } = await depuisLaSource(m);
      ligne.append(
        el('span', { className: 'ligne-mot-texte' }, el('b', { textContent: m.sens ?? 'Sens pas disponible' }), el('small', { textContent: `${noms.get(m.sourate)} · verset ${m.verset}${m.source ? ' · ' + m.source : ''}` })),
        el('span', { className: 'arabe coran', lang: 'ar', dir: 'rtl', textContent: mot.texte }));
    } catch (e) {
      ligne.append(el('span', { className: 'ligne-mot-texte' }, el('small', { textContent: e.message })));
    }
    // Appui long : retirer le mot (rare, donc caché).
    let minuteur;
    ligne.addEventListener('pointerdown', () => { minuteur = setTimeout(() => {
      const f = ouvrirFeuille({ titre: 'Ce mot', contenu: [boutonSecondaire('Retirer de mes mots', () => { retirerMot(m.id); ligne.remove(); f.fermer(); })] });
    }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => ligne.addEventListener(t, () => clearTimeout(minuteur)));
    ligne.addEventListener('contextmenu', (e) => e.preventDefault());
    liste.append(ligne);
  }
  conteneur.append(liste);
}

async function afficherRevision(conteneur) {
  const file = getMotsAReviser().filter((m) => !estSignale('coran', m.cle));
  let i = 0;
  const zone = el('div', { className: 'zone-revision' });
  conteneur.append(zone);

  async function carte() {
    if (i >= file.length) {
      zone.replaceChildren(el('div', { className: 'vide' }, el('p', { textContent: 'Bravo, révision finie pour aujourd\'hui !' }), lienBouton('Retour à mes mots', '#/mots', { gros: true })));
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
      el('p', { className: 'sens', textContent: m.sens ?? 'Sens pas disponible' }),
      ...(m.source ? [el('p', { className: 'credit centre', textContent: `Sens : ${m.source}` })] : []),
      ligneVerset,
      el('div', { className: 'deux-boutons' },
        grosBouton('Je savais', () => { reviserMot(m.id, true); i++; carte(); }, { icone: 'ok' }),
        boutonSecondaire('À revoir', () => { reviserMot(m.id, false); i++; carte(); })));
    const voir = grosBouton('Voir le sens', () => { dos.hidden = false; voir.remove(); });
    zone.replaceChildren(
      el('p', { className: 'message-doux', textContent: `Carte ${i + 1} sur ${file.length}` }),
      el('div', { className: 'carte carte-revision' }, el('p', { className: 'arabe coran mot-revision', lang: 'ar', dir: 'rtl', textContent: mot.texte })),
      voir, dos);
  }
  if (!file.length) zone.append(message('Rien à réviser aujourd\'hui.'));
  else await carte();
}
