// Propriétaire : Claude Code (C9). Code d'accès : l'appli est pour Zakou seul (choix du 10/11).
// « Petit cadenas » : le code n'est PAS écrit ici, seulement son empreinte (SHA-256).
// Limite connue (dite à Zakou) : le dépôt est public, un informaticien pourrait contourner ce cadenas.
// Le code est demandé une fois par appareil, puis gardé dans le téléphone.

export const EMPREINTE = 'd22345854b326349e196ba6de51f1a81955331ca416b595e4c90a292a1381e7d';
const CLE = 'la:acces';

export async function empreinte(code) {
  const octets = new TextEncoder().encode(`lire-arabe:${String(code).trim()}`);
  const h = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const codeJuste = async (code) => (await empreinte(code)) === EMPREINTE;

function dejaOuvert() {
  try { return localStorage.getItem(CLE) === EMPREINTE; } catch { return false; }
}

// Affiche l'écran du code si besoin ; se termine quand l'accès est ouvert.
export function demanderAcces() {
  if (dejaOuvert()) return Promise.resolve();
  document.body.classList.add('verrouille');
  return new Promise((ouvrir) => {
    const ecran = document.createElement('form');
    ecran.className = 'ecran-code';
    ecran.innerHTML = `
      <h1>Lire l'arabe</h1>
      <label for="code-acces">Code d'accès</label>
      <input id="code-acces" inputmode="numeric" autocomplete="off" maxlength="12" required>
      <button type="submit">Ouvrir</button>
      <p class="erreur" role="alert" hidden>Code faux. Réessaie.</p>`;
    const champ = ecran.querySelector('input');
    const erreur = ecran.querySelector('.erreur');
    ecran.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (await codeJuste(champ.value)) {
        try { localStorage.setItem(CLE, EMPREINTE); } catch { /* il faudra le retaper la prochaine fois */ }
        ecran.remove();
        document.body.classList.remove('verrouille');
        ouvrir();
      } else {
        erreur.hidden = false;
        champ.value = '';
      }
    });
    document.body.append(ecran);
    champ.focus();
  });
}
