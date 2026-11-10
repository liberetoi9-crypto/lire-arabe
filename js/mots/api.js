// Propriétaire : Claude Code (C6). SEUL fichier de « Mes mots » que les autres modules ont le droit d'importer.
import { lire, ecrire } from '../core/stockage.js';
import { emit } from '../core/bus.js';
import { ajouter, retirer, aReviser, noterRevision, idMot } from './mesmots.js';

const CLE = 'mots.liste';

export const getMesMots = () => lire(CLE, []);
export const getMotsAReviser = () => aReviser(getMesMots());
export const estDansMesMots = (cle, position) => getMesMots().some((x) => x.id === idMot(cle, position));

// ({ cle, position, sens, langue, source }) : garde la sourate et le verset d'où vient le mot.
export function ajouterMot(mot) {
  ecrire(CLE, ajouter(getMesMots(), mot));
  emit('mots:change', {});
}

export function retirerMot(id) {
  ecrire(CLE, retirer(getMesMots(), id));
  emit('mots:change', {});
}

export function reviserMot(id, savait) {
  ecrire(CLE, noterRevision(getMesMots(), id, savait));
}
