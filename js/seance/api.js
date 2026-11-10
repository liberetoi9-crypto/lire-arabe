// Propriétaire : Claude Code (C7). SEUL fichier de la séance que les autres modules ont le droit d'importer.
// Ordre des sourates de la séance (phase lecture) : Fatiha, puis Juz Amma du plus court au plus long.
// Après chaque séance finie, la sourate suivante est proposée pour le lendemain ; Zakou peut choisir de garder la même.
import { lire, ecrire } from '../core/stockage.js';
import { ordreJuzAmma, getListeSourates } from '../coran/api.js';

export const aujourdhui = () => new Date().toLocaleDateString('sv'); // AAAA-MM-JJ, heure du téléphone

async function ordreSeance() { return [1, ...(await ordreJuzAmma())]; }

// La séance d'aujourd'hui (une par jour) : { date, sourate, etape, debut, fin?, demain? }
export function getSeanceDuJour() {
  const s = lire('seance.jour', null);
  return s?.date === aujourdhui() ? s : {};
}

// () => Promise<{ sourate: { numero, nom }, phase, faiteAujourdhui }>
export async function getEtatSeance() {
  const ordre = await ordreSeance();
  const position = Math.min(Math.max(lire('seance.position', 0), 0), ordre.length - 1);
  const jour = getSeanceDuJour();
  const numero = jour.sourate ?? ordre[position]; // une séance commencée garde sa sourate toute la journée
  const infos = (await getListeSourates()).find((x) => x.numero === numero);
  return {
    sourate: infos ? { numero: infos.numero, nom: infos.nom } : null,
    phase: lire('seance.phase', 'lecture'),
    faiteAujourdhui: lire('seance.dernierJour', null) === aujourdhui(),
  };
}

export function commencerSeance(sourate) {
  const s = getSeanceDuJour();
  if (s.date) return s;
  const nouvelle = { date: aujourdhui(), sourate, etape: 1, debut: Date.now() };
  ecrire('seance.jour', nouvelle);
  return nouvelle;
}

export function noterEtape(etape) {
  const s = getSeanceDuJour();
  if (s.date) ecrire('seance.jour', { ...s, etape });
}

// Fin de séance : garde la date (Accueil « séance finie ») et la durée. Une seule fois par jour.
export function finirSeance() {
  const s = getSeanceDuJour();
  if (!s.date) return { secondes: 0, dejaFinie: true };
  if (s.fin) return { secondes: Math.round((s.fin - s.debut) / 1000), dejaFinie: true };
  const fin = Date.now();
  ecrire('seance.jour', { ...s, fin, demain: s.demain ?? 'suivante' });
  ecrire('seance.dernierJour', s.date);
  appliquerDemain('suivante', null);
  return { secondes: Math.round((fin - s.debut) / 1000), dejaFinie: false };
}

// Choix pour demain : 'suivante' (sourate suivante) ou 'meme' (garder la même).
export function choisirDemain(choix) {
  const s = getSeanceDuJour();
  if (!s.fin || !['suivante', 'meme'].includes(choix)) return;
  const avant = s.demain ?? 'suivante';
  ecrire('seance.jour', { ...s, demain: choix });
  appliquerDemain(choix, avant);
}
function appliquerDemain(choix, avant) {
  if (choix === avant) return;
  const p = lire('seance.position', 0);
  if (choix === 'suivante') ecrire('seance.position', p + 1);
  else if (avant === 'suivante') ecrire('seance.position', Math.max(0, p - 1));
}

// La sourate de demain si on avance (ou null à la fin du Juz Amma).
export async function getProchaineSourate() {
  const ordre = await ordreSeance();
  const s = getSeanceDuJour();
  const i = ordre.indexOf(s.sourate);
  const numero = ordre[i + 1];
  if (!numero) return null;
  return (await getListeSourates()).find((x) => x.numero === numero) ?? null;
}
