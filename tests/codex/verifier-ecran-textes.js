// À exécuter dans un navigateur sur le serveur du projet, dans un contexte isolé.
// arabe doit être lu dans une source officielle existante, jamais écrit dans ce fichier.
export async function verifierEcranTextes(arabe) {
  const { afficherTextes } = await import('../../js/textes/index.js');
  const api = await import('../../js/textes/api.js');
  const conteneur = document.getElementById('ecran');
  const resultats = [];
  const verifier = (condition, message) => {
    if (!condition) throw new Error(message);
    resultats.push(message);
  };
  afficherTextes(conteneur, ['ajouter']);
  const remplir = (nom, valeur) => { conteneur.querySelector(`[name="${nom}"]`).value = valeur; };
  remplir('titre', '<img src=x onerror=alert(1)>');
  remplir('arabe', arabe);
  remplir('source', 'Source officielle fournie au test');
  remplir('traductionFr', 'Valeur technique de test');
  remplir('sourceTraduction', 'Source de test');
  conteneur.querySelector('[name="verifie"]').checked = true;
  conteneur.querySelector('form').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const texte = api.getTextes().at(-1);
  verifier(Boolean(texte) && location.hash === `#/textes/${texte.id}`, 'Ajout par le vrai formulaire et navigation');
  verifier(conteneur.querySelector('.arabe').textContent === arabe, 'Texte source affiché caractère par caractère');
  verifier(!conteneur.querySelector('img'), 'Titre affiché comme texte, sans exécuter du HTML');
  verifier(conteneur.querySelector('.arabe').dir === 'rtl' && conteneur.querySelector('.arabe').lang === 'ar', 'Langue arabe et sens de lecture');
  const traduction = conteneur.querySelector('#texte-traduction');
  verifier(traduction.hidden, 'Traduction cachée au départ');
  const bouton = conteneur.querySelector('[aria-controls="texte-traduction"]');
  bouton.click();
  verifier(!traduction.hidden && bouton.getAttribute('aria-expanded') === 'true', 'Bouton ouvre la traduction avec sa source');
  bouton.click();
  verifier(traduction.hidden, 'Bouton cache la traduction');
  verifier([...conteneur.querySelectorAll('button')].filter(b => b.getClientRects().length).every(b => b.getBoundingClientRect().height >= 44), 'Boutons de lecture de 44 px minimum');
  verifier(document.documentElement.scrollWidth <= innerWidth, 'Lecture sans débordement horizontal');
  [...conteneur.querySelectorAll('button')].find(b => b.textContent === 'Signaler une erreur').click();
  verifier(!conteneur.querySelector('.arabe') && api.getTexte(texte.id) === null, 'Signalement retire immédiatement le texte');
  afficherTextes(conteneur, [texte.id]);
  verifier(!conteneur.querySelector('.arabe'), 'Lien direct signalé ne réaffiche pas le texte');
  afficherTextes(conteneur, []);
  verifier(!conteneur.textContent.includes(texte.titre) && api.getTexteDuJour() === null, 'Texte exclu de la liste et du choix du jour');
  afficherTextes(conteneur, ['ajouter']);
  verifier(document.documentElement.scrollWidth <= innerWidth, 'Formulaire sans débordement horizontal');
  return resultats;
}
