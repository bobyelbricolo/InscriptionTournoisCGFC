// Collez ici l'URL de votre déploiement Apps Script (se termine par /exec)
const API_URL = 'COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT';

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
