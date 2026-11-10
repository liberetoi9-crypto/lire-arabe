import { creerLectureRepetee } from './lectures.js';

export function lectureRepetee(conteneur, options) {
  const lecteur = creerLectureRepetee(options);
  const objectif = options.objectif ?? 5;
  const el = (tag, texte) => { const e = document.createElement(tag); if (texte) e.textContent = texte; return e; };
  const carte = el('section'); carte.className = 'carte';
  carte.setAttribute('aria-label', 'Lecture répétée');
  const compteur = el('p'), chrono = el('p'), message = el('p');
  compteur.setAttribute('role', 'status');
  chrono.setAttribute('aria-label', 'Temps de lecture');
  message.setAttribute('role', 'status');
  const fluide = el('input'); fluide.type = 'checkbox';
  Object.assign(fluide.style, { minWidth: '44px', minHeight: '44px', verticalAlign: 'middle' });
  const label = el('label'); label.append(fluide, ' J’ai lu sans m’arrêter sur les mots.');
  const actions = el('div');
  Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' });
  const historique = el('ol'); historique.setAttribute('aria-label', 'Mes temps de lecture');
  const boutons = {};
  const temps = secondes => `${Math.floor(secondes / 60)} min ${Math.floor(secondes % 60)} s`;
  function rafraichir() {
    compteur.textContent = `Lu ${lecteur.compteur}/${objectif}`;
    chrono.textContent = temps(lecteur.secondes);
    boutons.demarrer.textContent = lecteur.etat === 'pause' ? 'Reprendre' : lecteur.etat === 'terminee' ? 'Lire encore' : 'Commencer';
    boutons.demarrer.disabled = lecteur.etat === 'lecture';
    boutons.pause.disabled = lecteur.etat !== 'lecture';
    boutons.terminer.disabled = !['lecture', 'pause'].includes(lecteur.etat);
    boutons.annuler.disabled = !['lecture', 'pause'].includes(lecteur.etat);
    for (const b of Object.values(boutons)) b.style.opacity = b.disabled ? '0.45' : '1';
  }
  function afficherHistorique() {
    historique.replaceChildren(...lecteur.lectures.map((l, i) => el('li', `Lecture ${i + 1} : ${l.secondes.toFixed(1)} s${l.sansArret ? ' — sans arrêt sur les mots' : ''}`)));
  }
  for (const [nom, titre, action] of [
    ['demarrer', 'Commencer', () => { if (lecteur.etat !== 'pause') fluide.checked = false; lecteur.demarrer(); message.textContent = 'Lis le texte. Touche « J’ai fini » quand tu as terminé.'; }],
    ['pause', 'Pause', () => { lecteur.pause(); message.textContent = 'Chronomètre en pause.'; }],
    ['terminer', 'J’ai fini', () => { lecteur.terminer({ sansArret: fluide.checked }); afficherHistorique(); message.textContent = 'Lecture gardée.'; }],
    ['annuler', 'Annuler cette lecture', () => { lecteur.annuler(); fluide.checked = false; message.textContent = 'Lecture annulée. Aucun temps ajouté.'; }],
  ]) {
    const bouton = el('button', titre); bouton.type = 'button'; bouton.dataset.lecture = nom;
    bouton.style.font = 'inherit';
    bouton.addEventListener('click', () => { try { action(); } catch (e) { message.textContent = e.message; } rafraichir(); });
    boutons[nom] = bouton; actions.append(bouton);
  }
  carte.append(compteur, chrono, label, actions, message, el('h3', 'Mes temps'), historique);
  conteneur.append(carte);
  afficherHistorique(); rafraichir();
  // Le tic ne touche qu'au chrono, pour ne pas modifier un bouton pendant un toucher.
  const minuteur = setInterval(() => { chrono.textContent = temps(lecteur.secondes); }, 250);
  const masquer = () => { if (document.hidden) { lecteur.pause(); message.textContent = 'Chronomètre en pause. Touche « Reprendre » pour continuer.'; rafraichir(); } };
  const detruire = () => {
    clearInterval(minuteur); lecteur.annuler();
    document.removeEventListener('visibilitychange', masquer);
    window.removeEventListener('hashchange', detruire);
    window.removeEventListener('pagehide', detruire);
  };
  document.addEventListener('visibilitychange', masquer);
  window.addEventListener('hashchange', detruire);
  window.addEventListener('pagehide', detruire);
  return { detruire, lecteur };
}
