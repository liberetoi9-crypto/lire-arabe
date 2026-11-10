import { lire, ecrire } from '../core/stockage.js';

const CLE = 'exercices.lectures';
const idValide = id => typeof id === 'string' && id.trim().length > 0 && id.length <= 200;
export function getLectures(id) {
  const liste = lire(CLE, []);
  return (Array.isArray(liste) ? liste : []).filter(l => l && idValide(l.id)
    && typeof l.cle === 'string' && Number.isFinite(l.secondes) && l.secondes > 0
    && Number.isFinite(Date.parse(l.date)) && (id === undefined || l.id === id)).map(l => ({ ...l }));
}

export function creerLectureRepetee({ id, objectif = 5, session, etape, horloge = () => performance.now(), date = () => new Date().toISOString() }) {
  if (!idValide(id)) throw new Error('Choisis un texte à lire.');
  if (!Number.isInteger(objectif) || objectif < 1) throw new Error('Objectif de lecture invalide.');
  for (const valeur of [session, etape]) if (valeur !== undefined && !idValide(valeur)) throw new Error('Identifiant de séance invalide.');
  let etat = 'attente', cumule = 0, depart = 0, cle = null;
  const secondes = () => Math.max(0, cumule + (etat === 'lecture' ? horloge() - depart : 0)) / 1000;
  return {
    get etat() { return etat; },
    get secondes() { return secondes(); },
    get lectures() { return getLectures(id); },
    get compteur() { return Math.min(getLectures(id).length, objectif); },
    demarrer() {
      if (etat === 'lecture') return;
      if (etat !== 'pause') {
        cumule = 0;
        cle = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      depart = horloge(); etat = 'lecture';
    },
    pause() {
      if (etat !== 'lecture') return;
      cumule += Math.max(0, horloge() - depart); etat = 'pause';
    },
    terminer({ sansArret = false } = {}) {
      if (etat !== 'lecture' && etat !== 'pause') throw new Error('Commence une lecture avant de la garder.');
      this.pause();
      const duree = secondes();
      if (duree <= 0) throw new Error('Le chronomètre doit avoir avancé.');
      const lecture = { id, cle, secondes: Math.max(0.001, Math.round(duree * 1000) / 1000), sansArret: sansArret === true, date: date() };
      if (session !== undefined) lecture.session = session;
      if (etape !== undefined) lecture.etape = etape;
      const toutes = getLectures();
      if (!toutes.some(l => l.cle === cle) && !ecrire(CLE, [...toutes, lecture])) {
        throw new Error('Le téléphone ne peut pas garder ce temps. Ne ferme pas cette page et réessaie.');
      }
      etat = 'terminee';
      return { ...lecture };
    },
    annuler() { etat = 'attente'; cumule = 0; cle = null; },
  };
}
