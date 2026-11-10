// Navigateur, contexte de test vide. Voix simulée : aucun son n'est prononcé.
export async function verifierEcranVoix() {
  const ancienSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
  const ancienUtterance = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance');
  const synthese = new EventTarget();
  const lus = [];
  let annulations = 0;
  let voix = [{ lang: 'ar-SA' }];
  Object.assign(synthese, { getVoices: () => voix, speak: u => lus.push(u), cancel: () => { annulations++; } });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthese });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
  const { afficherTextes } = await import('../../js/textes/index.js');
  const { ajouterTexte, signalerTexte } = await import('../../js/textes/api.js');
  const racine = document.getElementById('ecran');
  const resultats = [];
  const verifier = (condition, message) => { if (!condition) throw new Error(message); resultats.push(message); };
  const cliquer = nom => racine.querySelector(`[data-voix="${nom}"]`).click();
  try {
    const t = ajouterTexte({ titre: 'Essai des commandes', arabe: 'Premier test.\nDeuxième test!', source: 'Source technique de test', verifie: true });
    afficherTextes(racine, [t.id]);
    verifier(lus.length === 0, 'Aucun son automatique à l’ouverture');
    verifier(racine.querySelector('.arabe').textContent === t.arabe, 'Texte et espaces inchangés après découpage en boutons');
    cliquer('ecouter');
    verifier(lus[0].text === t.arabe && lus[0].lang === 'ar-SA', 'Bouton texte : bon contenu et langue arabe');
    racine.querySelectorAll('.arabe button')[1].click();
    verifier(lus.at(-1).text === 'test.', 'Toucher un mot ne lit que ce mot');
    const select = racine.querySelector('select');
    select.value = 'lent'; select.dispatchEvent(new Event('change'));
    cliquer('ecouter');
    verifier(lus.at(-1).rate === 0.7, 'Sélecteur : vitesse lente appliquée');
    cliquer('repeter');
    verifier(lus.at(-1).text === 'Premier test.\n', 'Répétition : première phrase seulement, saut de ligne intact');
    lus.at(-1).onend();
    verifier(!racine.querySelector('[data-voix="suivante"]').disabled, 'Pause : phrase suivante proposée après l’écoute');
    cliquer('suivante');
    verifier(lus.at(-1).text.includes('Deuxième test!'), 'Suite au toucher uniquement');
    const avantArret = annulations;
    cliquer('arreter');
    verifier(annulations > avantArret, 'Arrêter annule la voix');
    verifier([...racine.querySelectorAll('button, select')].every(b => b.getBoundingClientRect().height >= 44), 'Boutons et sélecteur hauts de 44 px minimum');
    verifier(document.documentElement.scrollWidth <= innerWidth, 'Pas de débordement horizontal à 390 px');
    voix = []; synthese.dispatchEvent(new Event('voiceschanged'));
    cliquer('ecouter');
    verifier(racine.querySelector('[role="status"]').textContent.includes('Aucune voix arabe'), 'Message clair sans voix arabe');
    voix = [{ lang: 'ar-SA' }]; synthese.dispatchEvent(new Event('voiceschanged'));
    cliquer('ecouter');
    const avantSignalement = annulations;
    signalerTexte(t.id);
    verifier(annulations > avantSignalement, 'Signalement arrête immédiatement la voix');
    afficherTextes(racine, [t.id]);
    verifier(!racine.querySelector('[data-voix]'), 'Aucune commande pour un texte signalé');
    const t2 = ajouterTexte({ titre: 'Navigation', arabe: 'Essai navigation.', source: 'Source technique de test', verifie: true });
    afficherTextes(racine, [t2.id]); cliquer('ecouter');
    const avantNavigation = annulations;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    verifier(annulations > avantNavigation, 'Changement d’écran arrête la voix');
    return resultats;
  } finally {
    afficherTextes(racine, []);
    if (ancienSynth) Object.defineProperty(window, 'speechSynthesis', ancienSynth); else delete window.speechSynthesis;
    if (ancienUtterance) Object.defineProperty(window, 'SpeechSynthesisUtterance', ancienUtterance); else delete window.SpeechSynthesisUtterance;
  }
}
