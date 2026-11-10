import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMPREINTE } from '../../js/core/acces.js';

export async function ouvrirApp(hash = '#/plus') {
  const { webkit, devices } = process.env.PLAYWRIGHT_ROOT
    ? await import(pathToFileURL(join(process.env.PLAYWRIGHT_ROOT, 'index.mjs')))
    : await import('playwright');
  const racine = new URL('../../', import.meta.url);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const serveur = createServer(async (req, res) => {
    const chemin = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    try { res.setHeader('content-type', types[extname(chemin)] ?? 'application/octet-stream'); res.end(await readFile(new URL(chemin, racine))); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => serveur.listen(0, '127.0.0.1', resolve));
  const navigateur = await webkit.launch();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'] });
  await contexte.addInitScript(e => { localStorage.setItem('la:acces', e); localStorage.setItem('la:accueil.bienvenueVue', 'true'); }, EMPREINTE);
  const page = await contexte.newPage();
  const adresse = `http://127.0.0.1:${serveur.address().port}/`;
  await page.goto(adresse + hash);
  return { page, contexte, adresse, fermer: async () => { await navigateur.close(); await new Promise(resolve => serveur.close(resolve)); } };
}
