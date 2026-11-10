// Propriétaire : Claude Code (C5). Compte les mots dans le texte officiel (data/coran/) et écrit
// data/coran/frequents.json. Lancer : npm run frequents (après npm run donnees).
import { readFile, writeFile } from 'node:fs/promises';
import { REGLE, compterMots, choisirPetitsMots } from '../js/coran/frequents.js';

const dossier = new URL('../data/coran/', import.meta.url);
const manifeste = JSON.parse(await readFile(new URL('manifeste.json', dossier), 'utf8'));
const versets = [];
for (const s of manifeste.sourates) {
  versets.push(...JSON.parse(await readFile(new URL(s.fichier, dossier), 'utf8')).versets);
}
const comptes = compterMots(versets);
const total = comptes.reduce((a, c) => a + c.nombre, 0);
const petits = choisirPetitsMots(comptes);
const couverts = petits.reduce((a, c) => a + c.nombre, 0);
const resultat = {
  source: 'Compté dans data/coran (texte officiel quran.com = Tanzil), les 114 sourates',
  regle: REGLE,
  totalMots: total,
  couverture: Math.round((1000 * couverts) / total) / 10, // % des mots du Coran couverts par ces petits mots
  mots: petits,
};
await writeFile(new URL('frequents.json', dossier), JSON.stringify(resultat, null, 1));
console.log(`${petits.length} petits mots fréquents, ${resultat.couverture} % des ${total} mots du Coran.`);
