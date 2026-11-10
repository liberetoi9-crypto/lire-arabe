// Propriétaire : Claude Code (C4). INTERNE : les autres modules passent par api.js (creerLecteur).
// Joue de VRAIES récitations verset par verset (jamais de voix de synthèse).
import { emit } from '../core/bus.js';

const VITESSES = { lent: 0.75, normal: 1 };

// urlPour(cle) → URL du son ; recitateurPour() → id du récitateur (pour les événements).
export function fabriquerLecteur({ urlPour, recitateurPour }) {
  const audio = new Audio();
  audio.preload = 'auto';
  if ('preservesPitch' in audio) audio.preservesPitch = true; // ralentir sans changer la voix
  const prechargement = new Audio();
  prechargement.preload = 'auto';

  let file = [];          // liste des clés à jouer
  let index = 0;
  let foisRestantes = 0;
  let options = { fois: 1, repeteApresMoi: false };
  let vitesse = 'normal';
  let enPause = false;
  let minuteur = null;
  let actif = false;
  let suiteEnAttente = null; // pendant le silence de « répète après moi »

  function arreterMinuteur() { clearTimeout(minuteur); minuteur = null; }

  function jouerCourant() {
    arreterMinuteur();
    const cle = file[index];
    if (!cle) return finir();
    audio.src = urlPour(cle);
    audio.playbackRate = VITESSES[vitesse];
    emit('verset:debut', { cle, recitateur: recitateurPour(cle) });
    const suivante = file[index + 1];
    if (suivante) prechargement.src = urlPour(suivante);
    audio.play().catch((e) => {
      emit('lecteur:erreur', { cle, message: e.message });
    });
  }

  function apresVerset() {
    const cle = file[index];
    emit('verset:fin', { cle });
    foisRestantes -= 1;
    const continuer = () => {
      suiteEnAttente = null;
      if (!actif) return;
      if (foisRestantes > 0) return jouerCourant();
      index += 1;
      foisRestantes = options.fois;
      jouerCourant();
    };
    if (options.repeteApresMoi) {
      // « Répète après moi » : silence un peu plus long que le verset, pour que l'élève répète.
      const duree = (audio.duration || 4) / VITESSES[vitesse];
      emit('lecteur:a-toi', { cle, secondes: Math.round(duree * 1.3) });
      suiteEnAttente = continuer;
      minuteur = setTimeout(continuer, duree * 1300);
    } else {
      continuer();
    }
  }

  function finir() {
    actif = false;
    arreterMinuteur();
    emit('lecteur:fin', {});
  }

  audio.addEventListener('ended', apresVerset);
  audio.addEventListener('error', () => {
    if (!actif) return;
    emit('lecteur:erreur', { cle: file[index], message: 'Son introuvable' });
  });

  return {
    // cles : ['112:1', '112:2'] ; fois : 1, 3, 5 ou 10 ; repeteApresMoi : pause après chaque verset
    jouer(cles, { fois = 1, repeteApresMoi = false } = {}) {
      if (!Array.isArray(cles) || cles.length === 0) throw new Error('Rien à jouer');
      // Nouvelle lecture : on oublie toute pause « répète après moi » en attente (défaut vu par Codex).
      arreterMinuteur();
      suiteEnAttente = null;
      file = [...cles];
      index = 0;
      options = { fois: Math.max(1, Math.floor(fois)), repeteApresMoi };
      foisRestantes = options.fois;
      actif = true;
      enPause = false;
      jouerCourant();
    },
    boucle(cle, fois) { this.jouer([cle], { fois }); },
    pause() { enPause = true; audio.pause(); arreterMinuteur(); },
    reprendre() {
      if (!actif) return;
      enPause = false;
      if (suiteEnAttente) suiteEnAttente();
      else audio.play().catch(() => {});
    },
    arreter() { actif = false; suiteEnAttente = null; audio.pause(); arreterMinuteur(); emit('lecteur:fin', {}); },
    vitesse(v) {
      if (!(v in VITESSES)) throw new Error('Vitesse : lent ou normal');
      vitesse = v;
      audio.playbackRate = VITESSES[v];
    },
    get enLecture() { return actif && !enPause; },
    get cleCourante() { return actif ? file[index] : null; },
    urlCourante() { return audio.src; },
  };
}
