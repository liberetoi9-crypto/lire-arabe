import { creerLectureRepetee, getLectures } from './lectures.js';

export function sessionDuJour() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function creerCinqLectures({ id, session = sessionDuJour(), objectif = 5, ...options }) {
  const chrono = creerLectureRepetee({ ...options, id, session, objectif, etape: 'lecture-cinq' });
  let attenteSauvegarde = false;
  const lectures = () => getLectures(id).filter(l => l.session === session && l.etape === 'lecture-cinq').slice(0, objectif);
  if (lectures().length < objectif) chrono.demarrer();
  return {
    get lectures() { return lectures(); },
    get compteur() { return lectures().length; },
    get termine() { return lectures().length >= objectif; },
    marquer({ sansArret = false } = {}) {
      if (this.termine) return null;
      let lecture;
      try { lecture = chrono.terminer({ sansArret }); attenteSauvegarde = false; }
      catch (e) {
        attenteSauvegarde = chrono.secondes > 0;
        if (!attenteSauvegarde) chrono.demarrer();
        throw e;
      }
      if (!this.termine) chrono.demarrer();
      return lecture;
    },
    pause() { chrono.pause(); },
    reprendre() { if (!attenteSauvegarde && !this.termine && chrono.etat === 'pause') chrono.demarrer(); },
    detruire() { chrono.annuler(); },
  };
}

export function getRecordChrono(id) {
  const temps = getLectures(id).filter(l => l.etape === 'chrono').map(l => l.secondes);
  return temps.length ? Math.min(...temps) : null;
}
