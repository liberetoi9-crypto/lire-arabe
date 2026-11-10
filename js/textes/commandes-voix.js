import { creerVoixTexte, morceauxTexte } from './voix.js';
import { on, emit } from '../core/bus.js';

export function ajouterCommandesVoix(carte, arabe, texte) {
  const zone = document.createElement('section');
  zone.setAttribute('aria-label', 'Écouter mon texte');
  const statut = document.createElement('p');
  statut.setAttribute('role', 'status');
  statut.setAttribute('aria-live', 'polite');
  statut.textContent = 'Écoute le texte ou touche un mot. Voix réservée à l’arabe normal.';
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '8px' });
  const boutons = {};
  const executer = action => {
    try { action(); } catch (e) { lecteur.arreter(); statut.textContent = e.message; }
  };
  const lecteur = creerVoixTexte(texte.id, { etat({ message, suite, repetition, enLecture }) {
    statut.textContent = message;
    boutons.suivante.disabled = !suite;
    boutons.reecouter.disabled = !repetition;
    boutons.arreter.disabled = !enLecture && !repetition;
  } });
  for (const [nom, titre, action] of [
    ['ecouter', 'Écouter le texte', () => lecteur.ecouter()],
    ['repeter', 'Répète après moi', () => lecteur.repeter()],
    ['reecouter', 'Réécouter la phrase', () => lecteur.reecouter()],
    ['suivante', 'Phrase suivante', () => lecteur.suivante()],
    ['arreter', 'Arrêter', () => lecteur.arreter()],
  ]) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = titre;
    b.dataset.voix = nom;
    b.disabled = ['reecouter', 'suivante', 'arreter'].includes(nom);
    b.addEventListener('click', () => executer(action));
    boutons[nom] = b; actions.append(b);
  }
  const label = document.createElement('label');
  label.textContent = 'Vitesse : ';
  const choix = document.createElement('select');
  Object.assign(choix.style, { minHeight: '44px', fontSize: '1rem' });
  for (const [valeur, titre] of [['normal', 'Normale'], ['lent', 'Lente']]) {
    const option = document.createElement('option');
    option.value = valeur; option.textContent = titre; choix.append(option);
  }
  choix.addEventListener('change', () => executer(() => lecteur.vitesse(choix.value)));
  label.append(choix); zone.append(label, statut, actions);
  // Les séparateurs sont des nœuds texte inchangés : mots + séparateurs = source exacte.
  arabe.replaceChildren();
  let position = 0;
  for (const morceau of morceauxTexte(texte.arabe)) {
    if (!morceau || /^\s+$/u.test(morceau)) { arabe.append(morceau); continue; }
    const mot = document.createElement('button');
    mot.type = 'button'; mot.className = 'mot'; mot.textContent = morceau;
    const p = position++;
    Object.assign(mot.style, { font: 'inherit', color: 'inherit', background: 'transparent', padding: '0', borderRadius: '6px', minHeight: '44px', minWidth: '44px' });
    mot.addEventListener('click', () => {
      emit('mot:touche', { source: 'texte', cle: texte.id, position: p + 1, texte: morceau });
      executer(() => lecteur.mot(p));
    });
    arabe.append(mot);
  }
  carte.insertBefore(zone, arabe);
  const voixChargees = () => {
    if (!lecteur.disponible()) statut.textContent = 'Aucune voix arabe disponible pour le moment. Active une voix arabe sur ton téléphone, puis réessaie.';
    else statut.textContent = 'Voix arabe prête. Touche « Écouter le texte » ou un mot.';
  };
  const quitter = () => { lecteur.arreter(); detruire(); };
  const masquer = () => { if (document.hidden) lecteur.arreter(); };
  const desabonner = on('texte:signale', ({ type, id }) => { if (type === 'texte' && id === texte.id) quitter(); });
  globalThis.speechSynthesis?.addEventListener('voiceschanged', voixChargees);
  window.addEventListener('hashchange', quitter);
  window.addEventListener('pagehide', quitter);
  document.addEventListener('visibilitychange', masquer);
  function detruire() {
    globalThis.speechSynthesis?.removeEventListener('voiceschanged', voixChargees);
    window.removeEventListener('hashchange', quitter);
    window.removeEventListener('pagehide', quitter);
    document.removeEventListener('visibilitychange', masquer);
    desabonner();
  }
  voixChargees();
  return () => { lecteur.arreter(); detruire(); };
}
