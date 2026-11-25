// Collez ici l'URL de votre déploiement Apps Script (se termine par /exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbwPAUPl8YtaTWrO6H_pj5899wy-JkE8Cd-L7Z_Zk-3xCsu9qXDVPXfN5U5IDwPsPoqwcA/exec';

async function apiGet(action, params) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] !== undefined) url.searchParams.set(k, params[k]);
  });
  const res = await fetch(url);
  const json = await res.json();
  if (json && json.erreur) throw new Error(json.erreur);
  return json;
}

// Content-Type: text/plain volontairement (au lieu de application/json) :
// ça évite la requête de préflight CORS (OPTIONS) qu'Apps Script ne gère pas.
async function apiPost(action, data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: action, data: data })
  });
  const json = await res.json();
  if (json && json.erreur) throw new Error(json.erreur);
  return json;
}
