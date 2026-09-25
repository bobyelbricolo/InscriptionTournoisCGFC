/**
 * API JSON pour la plateforme tournois. Ce fichier est le SEUL fichier de ce
 * projet Apps Script — plus de HtmlService, plus de pages générées ici.
 * Les pages (index.html, tableau.html, inscription.html, admin.html) sont
 * hébergées ailleurs (GitHub Pages) et appellent cette API via fetch().
 *
 * Déploiement : Déployer > Nouveau déploiement > type "Application Web"
 * > Exécuter en tant que : Moi > Qui a accès : Tout le monde.
 * L'URL obtenue (qui se termine par /exec) est à coller dans api.js (API_URL).
 *
 * CONFIGURATION CENTRALE DES CHAMPS
 * Pour ajouter un champ : ajoutez une entrée dans le tableau "fields"
 * correspondant. La colonne apparaît automatiquement dans le Google Sheet
 * au prochain envoi. Il faudra aussi ajouter l'input correspondant dans la
 * page HTML concernée (ce n'est plus généré automatiquement côté affichage,
 * contrairement à l'ancienne version — la génération dynamique de formulaire
 * vivait dans les fichiers HTML qui n'existent plus ici).
 *
 * Types utilisés dans le reste du code : 'text', 'number', 'date', 'url',
 * 'radio', 'checkbox', 'bool'. dependsOn / dependsOnAny décrivent la logique
 * conditionnelle (créneaux affichés seulement si covoiturage coché, etc.),
 * utilisée par getStatsTournoi_ pour savoir quels champs agréger.
 */
const CONFIG = {
  roster: {
    sheetName: 'Effectif',
    fields: [
      { id: 'nom', label: 'Nom', type: 'text', required: true },
      { id: 'prenom', label: 'Prénom', type: 'text', required: true }
    ]
  },
  joueurs: {
    sheetName: 'Inscriptions',
    fields: [
      { id: 'nom', label: 'Nom', type: 'text', required: true, source: 'roster' },
      { id: 'prenom', label: 'Prénom', type: 'text', required: true, source: 'roster' },
      { id: 'equipe', label: "Choix d'équipe", type: 'radio', options: ['Équipe gars', 'Équipe fille'], required: true },
      { id: 'presence', label: 'Présence', type: 'radio', options: ['Je joue', 'Je supporte', 'Je ne viens pas'], required: true },
      { id: 'lunchpack', label: 'Lunchpack', type: 'radio', options: ['Oui végé', 'Oui non végé', 'Non'], default: 'Non' },
      { id: 'repasSoir', label: 'Repas du soir', type: 'radio', options: ['Oui végé', 'Oui non végé', 'Non'], default: 'Non' },
      { id: 'logement', label: 'Logement', type: 'checkbox', options: ['Vendredi soir', 'Samedi soir'] },
      { id: 'covoitAller', label: 'Covoiturage - Aller', type: 'bool' },
      { id: 'creneauxAller', label: 'Créneaux aller', type: 'checkbox', options: ['Matin', 'Après-midi', 'Soir'], dependsOn: 'covoitAller' },
      { id: 'covoitRetour', label: 'Covoiturage - Retour', type: 'bool' },
      { id: 'creneauxRetour', label: 'Créneaux retour', type: 'checkbox', options: ['Matin', 'Après-midi', 'Soir'], dependsOn: 'covoitRetour' },
      { id: 'proposeVoiture', label: 'Je propose ma voiture', type: 'radio', options: ['Oui', 'Non'], default: 'Non', dependsOnAny: ['covoitAller', 'covoitRetour'] },
      { id: 'placesDispo', label: 'Places disponibles', type: 'number', dependsOn: 'proposeVoiture', dependsValue: 'Oui' }
    ]
  },
  tournois: {
    sheetName: 'Tournois',
    fields: [
      { id: 'nomTournoi', label: 'Nom du tournoi', type: 'text', required: true },
      { id: 'ville', label: 'Ville', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'equipesEngagees', label: 'Équipes engagées', type: 'checkbox', options: ['Équipe gars A', 'Équipe gars B', 'Équipe fille'] },
      { id: 'dateLimite', label: "Date limite d'inscription", type: 'date', required: true },
      { id: 'hotelLieu', label: "Lieu de l'hôtel", type: 'text' },
      { id: 'hotelLien', label: 'Lien Google Maps', type: 'url' },
      { id: 'coutInscription', label: 'Coût inscription (€)', type: 'number' },
      { id: 'coutLunchpack', label: 'Coût lunchpack (€)', type: 'number' },
      { id: 'coutSoiree', label: 'Coût soirée (€)', type: 'number' },
      { id: 'coutHotel', label: 'Coût hôtel (€)', type: 'number' }
    ]
  }
};

// Collez ici l'identifiant de votre Google Sheet : dans son URL,
// https://docs.google.com/spreadsheets/d/CETTE_PARTIE_ICI/edit
const SHEET_ID = '15sShNIafR37-F26g9W83uPfMOTPR64SrMhtub8DAwVI';

// --- Points d'entrée web ---

function doGet(e) {
  return handleRequest_(function () {
    const action = e.parameter.action;
    switch (action) {
      case 'config': return CONFIG[e.parameter.section];
      case 'listTournois': return listTournois_();
      case 'getTournoi': return getTournoi_(e.parameter.nom);
      case 'getRoster': return getRoster_();
      case 'getStatsTournoi': return getStatsTournoi_(e.parameter.nom);
      case 'getInscription': return getInscription_(e.parameter.tournoi, e.parameter.nom, e.parameter.prenom);
      case 'listInscriptions': return listInscriptions_(e.parameter.tournoi);
      default: throw new Error('Action GET inconnue : ' + action);
    }
  });
}

function doPost(e) {
  return handleRequest_(function () {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'submitJoueur': return submitJoueur_(body.data);
      case 'submitTournoi': return submitTournoi_(body.data);
      case 'addRosterMembre': return addRosterMembre_(body.data);
      default: throw new Error('Action POST inconnue : ' + body.action);
    }
  });
}

function handleRequest_(fn) {
  try {
    return jsonResponse_(fn());
  } catch (err) {
    return jsonResponse_({ erreur: err.message });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// --- Accès au Sheet : création automatique + colonnes ajoutées si absentes ---
function getSheet_(section) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const name = CONFIG[section].sheetName;
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeaders_(sheet, getFieldIds_(section));
  return sheet;
}

function getFieldIds_(section) {
  const base = CONFIG[section].fields.map(function (f) { return f.id; });
  if (section === 'joueurs') return ['horodatage', 'misAJour', 'tournoi'].concat(base);
  return ['horodatage'].concat(base);
}

function ensureHeaders_(sheet, fieldIds) {
  const lastCol = sheet.getLastColumn();
  const existing = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (existing.length === 0) {
    sheet.getRange(1, 1, 1, fieldIds.length).setValues([fieldIds]);
    return;
  }
  const missing = fieldIds.filter(function (id) { return existing.indexOf(id) === -1; });
  if (missing.length > 0) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
}

function appendRow_(section, data) {
  const sheet = getSheet_(section);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (id) {
    if (id === 'horodatage') return new Date();
    return data[id] !== undefined ? data[id] : '';
  });
  sheet.appendRow(row);
}

function serialiserValeur_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return v;
}

function sheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { headers: values[0] || [], rows: [] };
  const headers = values[0];
  const rows = values.slice(1).map(function (row, i) {
    const o = { _rowIndex: i + 2 };
    headers.forEach(function (h, j) { o[h] = serialiserValeur_(row[j]); });
    return o;
  });
  return { headers: headers, rows: rows };
}

// --- Effectif ---
function getRoster_() {
  const rows = sheetObjects_(getSheet_('roster')).rows;
  return rows.sort(function (a, b) { return (a.nom + a.prenom).localeCompare(b.nom + b.prenom); });
}

function addRosterMembre_(data) {
  appendRow_('roster', data);
  return { ok: true };
}

// --- Inscriptions : upsert par (tournoi, nom, prenom) pour permettre la modification ---
function submitJoueur_(data) {
  const sheet = getSheet_('joueurs');
  const info = sheetObjects_(sheet);
  const existant = info.rows.find(function (o) {
    return o.tournoi === data.tournoi && o.nom === data.nom && o.prenom === data.prenom;
  });
  const now = new Date();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (id) {
    if (id === 'horodatage') return existant ? new Date(existant.horodatage) : now;
    if (id === 'misAJour') return now;
    return data[id] !== undefined ? data[id] : '';
  });
  if (existant) {
    sheet.getRange(existant._rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { ok: true, modifie: !!existant };
}

function getInscription_(tournoi, nom, prenom) {
  const rows = sheetObjects_(getSheet_('joueurs')).rows;
  const trouve = rows.find(function (o) { return o.tournoi === tournoi && o.nom === nom && o.prenom === prenom; });
  return trouve || null;
}

function listInscriptions_(tournoi) {
  return sheetObjects_(getSheet_('joueurs')).rows.filter(function (o) { return o.tournoi === tournoi; });
}

function getTournoi_(nomTournoi) {
  const trouve = listTournois_().filter(function (t) { return t.nomTournoi === nomTournoi; });
  return trouve.length ? trouve[0] : null;
}

function getStatsTournoi_(nomTournoi) {
  const rows = listInscriptions_(nomTournoi);

  const parChamp = {};
  CONFIG.joueurs.fields.forEach(function (f) {
    if (f.source === 'roster') return;
    if (f.dependsOn || f.dependsOnAny) return;
    if (f.id === 'covoitAller' || f.id === 'covoitRetour') return;
    if (f.type !== 'radio' && f.type !== 'checkbox' && f.type !== 'bool') return;

    const counts = {};
    if (f.type === 'bool') {
      counts['Oui'] = rows.filter(function (o) { return o[f.id] === true; }).length;
    } else {
      f.options.forEach(function (opt) { counts[opt] = 0; });
      rows.forEach(function (o) {
        const valeurs = f.type === 'checkbox' ? (o[f.id] || '').split(',').map(function (s) { return s.trim(); }) : [o[f.id]];
        valeurs.forEach(function (v) { if (counts[v] !== undefined) counts[v]++; });
      });
    }
    parChamp[f.id] = { label: f.label, counts: counts };
  });

  function listeCovoit(champActif, champCreneaux) {
    return rows.filter(function (o) { return o[champActif] === true; }).map(function (o) {
      return {
        nom: o.prenom + ' ' + o.nom,
        creneaux: o[champCreneaux] || '',
        propose: o.proposeVoiture === 'Oui',
        places: o.placesDispo || ''
      };
    });
  }

  return {
    total: rows.length,
    parChamp: parChamp,
    covoitAller: listeCovoit('covoitAller', 'creneauxAller'),
    covoitRetour: listeCovoit('covoitRetour', 'creneauxRetour')
  };
}

// --- Tournois ---
function submitTournoi_(data) {
  appendRow_('tournois', data);
  return { ok: true };
}

function listTournois_() {
  return sheetObjects_(getSheet_('tournois')).rows.map(function (o) {
    o.statut = calculerStatut_(o.dateLimite);
    return o;
  });
}

function calculerStatut_(dateLimite) {
  if (!dateLimite) return 'Ouvert';
  const limite = new Date(dateLimite);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today <= limite ? 'Ouvert' : 'Fermé';
}
