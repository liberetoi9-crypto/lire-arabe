// X17 : contrôles seulement. C7 place le texte officiel à côté et gère « Suivant ».
import { el, grosBouton, message } from '../core/ui.js';
import { getSignalements } from '../core/signalement.js';
import { on } from '../core/bus.js';
import { creerCinqLectures, getRecordChrono, sessionDuJour } from './etapes-logique.js';
import { creerLectureRepetee } from './lectures.js';

const toucheSource = (id, signalement) => {
  const [type, ...reste] = id.split(':');
  const cible = reste.join(':');
  return signalement.type === type && (type === 'coran' ? signalement.id.split(':')[0] === cible : signalement.id === cible);
};
function surveiller(id, { pause, reprendre, detruire, signaler }) {
  const visibilite = () => document.hidden ? pause() : reprendre?.();
  const stop = () => detruire();
  const desabonner = on('texte:signale', s => { if (toucheSource(id, s)) signaler(); });
  document.addEventListener('visibilitychange', visibilite);
  window.addEventListener('hashchange', stop);
  window.addEventListener('pagehide', stop);
  return () => {
    desabonner(); document.removeEventListener('visibilitychange', visibilite);
    window.removeEventListener('hashchange', stop); window.removeEventListener('pagehide', stop);
  };
}
function verifierSource(id) {
  if (typeof id !== 'string' || !/^(?:coran:[1-9]\d{0,2}|texte:[\w-]+)$/.test(id)
    || (id.startsWith('coran:') && Number(id.slice(6)) > 114)) throw new Error('Choisis un texte ou une sourate.');
  if (getSignalements().some(s => toucheSource(id, s))) throw new Error('Ce texte est mis de côté.');
}

export function etapeLectureCinqFois(conteneur, { id, session = sessionDuJour(), objectif = 5, surTermine = () => {}, ...options }) {
  verifierSource(id);
  const modele = creerCinqLectures({ ...options, id, session, objectif });
  let detruit = false, notifie = false;
  const ronds = el('div', { role: 'img' });
  Object.assign(ronds.style, { display: 'flex', gap: '12px', justifyContent: 'center', margin: '20px 0' });
  const statut = message('Lis le texte, puis touche le bouton.'); statut.setAttribute('role', 'status');
  const fluide = el('input', { type: 'checkbox' });
  Object.assign(fluide.style, { minWidth: '44px', minHeight: '44px' });
  const confirmation = el('label', { className: 'ligne-reglage' }, fluide, 'J’ai lu sans m’arrêter sur les mots.');
  const bouton = grosBouton('J’ai lu une fois', () => {
    if (detruit || modele.termine) return;
    try {
      verifierSource(id); modele.marquer({ sansArret: fluide.checked }); fluide.checked = false;
      statut.textContent = modele.termine ? 'Tes cinq lectures sont gardées.' : 'Lecture gardée. Recommence le texte.';
      rafraichir();
    } catch (e) { statut.textContent = e.message; }
  });
  bouton.dataset.etape = 'lecture-cinq';
  function rafraichir() {
    ronds.setAttribute('aria-label', `${modele.compteur} lectures sur ${objectif}`);
    ronds.replaceChildren(...Array.from({ length: objectif }, (_, i) => {
      const rond = el('span', { 'aria-hidden': 'true', textContent: String(i + 1) });
      Object.assign(rond.style, { display: 'inline-grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--accent)', background: i < modele.compteur ? 'var(--accent)' : 'var(--carte)', color: i < modele.compteur ? '#fff' : 'var(--accent)' });
      return rond;
    }));
    confirmation.style.display = modele.compteur === objectif - 1 && !modele.termine ? '' : 'none';
    bouton.disabled = modele.termine;
    if (modele.termine && !notifie) { notifie = true; surTermine({ lectures: modele.lectures, session }); }
  }
  const zone = el('section', { 'aria-label': 'Lis cinq fois' }, ronds, confirmation, bouton, statut);
  conteneur.append(zone);
  let arreterSurveillance = () => {};
  const detruire = () => { if (detruit) return; detruit = true; modele.detruire(); bouton.disabled = true; arreterSurveillance(); };
  arreterSurveillance = surveiller(id, {
    pause: () => modele.pause(), reprendre: () => modele.reprendre(), detruire,
    signaler: () => { detruire(); zone.replaceChildren(message('Texte mis de côté. La lecture en cours n’a pas été gardée.')); },
  });
  rafraichir();
  return { detruire, get compteur() { return modele.compteur; }, get termine() { return modele.termine; } };
}

export function etapeChrono(conteneur, { id, session = sessionDuJour(), surTermine = () => {}, ...options }) {
  verifierSource(id);
  const chrono = creerLectureRepetee({ ...options, id, session, etape: 'chrono' });
  let detruit = false;
  const temps = el('p', { className: 'centre', textContent: '0,0 s', 'aria-label': 'Chronomètre' });
  Object.assign(temps.style, { fontSize: '2.5rem', fontVariantNumeric: 'tabular-nums', textAlign: 'center' });
  const format = n => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
  const record = message(''), statut = message('Touche « Démarrer », puis lis le texte.');
  statut.setAttribute('role', 'status');
  const majRecord = () => { const r = getRecordChrono(id); record.textContent = r === null ? 'Pas encore de record.' : `Ton record : ${format(r)}`; };
  let aGarder = false;
  const bouton = grosBouton('Démarrer', () => {
    if (detruit) return;
    try {
      verifierSource(id);
      if (aGarder || chrono.etat === 'lecture') {
        const avant = getRecordChrono(id), lecture = chrono.terminer();
        aGarder = false;
        bouton.textContent = 'Recommencer';
        temps.textContent = format(lecture.secondes);
        statut.textContent = avant === null || lecture.secondes < avant ? 'Nouveau record ! Ton temps est gardé.' : 'Ton temps est gardé.';
        majRecord(); surTermine({ lecture, record: getRecordChrono(id), session });
      } else {
        chrono.demarrer(); bouton.textContent = 'J’ai fini'; statut.textContent = 'Lis le texte. Touche « J’ai fini » à la fin.';
      }
    } catch (e) {
      statut.textContent = e.message;
      if (chrono.etat === 'pause') {
        aGarder = chrono.secondes > 0;
        bouton.textContent = aGarder ? 'Garder mon temps' : 'Reprendre';
      }
    }
  });
  bouton.dataset.etape = 'chrono';
  const zone = el('section', { 'aria-label': 'Lecture avec chrono' }, temps, bouton, statut, record);
  conteneur.append(zone); majRecord();
  const minuteur = setInterval(() => { if (chrono.etat === 'lecture') temps.textContent = format(chrono.secondes); }, 100);
  let arreterSurveillance = () => {};
  const detruire = () => { if (detruit) return; detruit = true; clearInterval(minuteur); chrono.annuler(); bouton.disabled = true; arreterSurveillance(); };
  arreterSurveillance = surveiller(id, {
    pause: () => { if (chrono.etat === 'lecture') { chrono.pause(); bouton.textContent = 'Reprendre'; statut.textContent = 'Chronomètre en pause.'; } },
    detruire, signaler: () => { detruire(); zone.replaceChildren(message('Texte mis de côté. Ton temps en cours n’a pas été gardé.')); },
  });
  return { detruire };
}
