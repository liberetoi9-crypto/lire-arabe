// Propriétaire : Claude Code (C7). SEUL fichier de la séance que les autres modules ont le droit d'importer.
// Pour l'instant (avant C7) : la sourate du jour et « séance faite aujourd'hui ».
import { lire } from '../core/stockage.js';
import { ordreJuzAmma, getListeSourates } from '../coran/api.js';

const aujourdhui = () => new Date().toLocaleDateString('sv'); // AAAA-MM-JJ, heure du téléphone

// () => Promise<{ sourate: { numero, nom }, phase: 'lecture' | 'mémorisation', faiteAujourdhui }>
export async function getEtatSeance() {
  const ordre = [1, ...(await ordreJuzAmma())]; // Fatiha, puis Juz Amma du plus court au plus long
  const position = Math.min(lire('seance.position', 0), ordre.length - 1);
  const infos = (await getListeSourates()).find((s) => s.numero === ordre[position]);
  return {
    sourate: infos ? { numero: infos.numero, nom: infos.nom } : null,
    phase: lire('seance.phase', 'lecture'),
    faiteAujourdhui: lire('seance.dernierJour', null) === aujourdhui(),
  };
}
