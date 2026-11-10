import { creerVoixTexte, morceauxTexte } from './voix.js';
import { on, emit } from '../core/bus.js';
import { grosBouton, boutonSecondaire, ligneChoix, ouvrirFeuille } from '../core/ui.js';

export function ajouterCommandesVoix(carte, arabe, texte) {
  const zone = document.createElement('section');
  zone.setAttribute('aria-label', 'Écouter mon texte');
  const statut = document.createElement('p');
  statut.className = 'message-doux';
  statut.setAttribute('role', 'status');
  statut.setAttribute('aria-live', 'polite');
  statut.textContent = 'Écoute le texte ou touche un mot. Voix réservée à l’arabe normal.';
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'grid', gap: '12px' });
  const boutons = {};
  const executer = action => {
    try { action(); } catch (e) { lecteur.arreter(); statut.textContent = e.message; }
  };
  const lecteur = creerVoixTexte(texte.id, { etat({ message, suite, repetition, enLecture }) {
    statut.textContent = message;
    boutons.suivante.disabled = !suite;
    boutons.reecouter.disabled = !repetition;
    boutons.arreter.disabled = !enLecture && !repetition;
    boutons.suivante.hidden = !repetition;
    boutons.reecouter.hidden = !repetition;
    boutons.arreter.hidden = !enLecture && !repetition;
    for (const b of Object.values(boutons)) b.style.display = b.hidden ? 'none' : '';
  } });
  for (const [nom, titre, action] of [
    ['ecouter', 'Écouter le texte', () => lecteur.ecouter()],
    ['repeter', 'Répète après moi', () => lecteur.repeter()],
    ['reecouter', 'Réécouter la phrase', () => lecteur.reecouter()],
    ['suivante', 'Phrase suivante', () => lecteur.suivante()],
    ['arreter', 'Arrêter', () => lecteur.arreter()],
  ]) {
    const b = nom === 'ecouter'
      ? grosBouton(titre, () => executer(action), { icone: 'ecouter' })
      : boutonSecondaire(titre, () => executer(action));
    b.dataset.voix = nom;
    b.disabled = ['reecouter', 'suivante', 'arreter'].includes(nom);
    b.hidden = ['reecouter', 'suivante', 'arreter'].includes(nom);
    b.style.display = b.hidden ? 'none' : '';
    boutons[nom] = b; actions.append(b);
  }
  const label = ligneChoix('Vitesse', [['normal', 'Normale'], ['lent', 'Lente']], 'normal', valeur => executer(() => lecteur.vitesse(valeur)));
  label.hidden = true;
  label.style.display = 'none';
  zone.append(statut, actions, label);
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
  const nettoyer = () => { lecteur.arreter(); detruire(); };
  nettoyer.ouvrirReglages = () => {
    label.hidden = false;
    label.style.display = '';
    return ouvrirFeuille({ titre: 'Réglages', contenu: [label], surFermeture: () => { label.hidden = true; label.style.display = 'none'; zone.append(label); } });
  };
  return nettoyer;
}
