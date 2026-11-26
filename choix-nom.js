// choix-nom.js
// Champ texte + liste déroulante filtrable pour choisir une personne de l'effectif.
//
// Utilisation :
//   const choix = creerChoixNom(conteneur, ROSTER, { placeholder: 'Choisis ton nom', onChange: function (personne) { ... } });
//   choix.choisir(personne)  -> sélectionne une personne sans déclencher onChange
//   choix.valeur()           -> personne sélectionnée (ou null)
// "personne" est un objet de l'effectif : { nom: '...', prenom: '...' }
(function () {
  // Minuscules et sans accents, pour comparer sans se soucier de la façon de taper
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Ordre d'affichage : Nom Prénom (c'est aussi l'ordre du tri)
  function affichage(p) {
    return p.nom + ' ' + p.prenom;
  }

  // Texte dont les caractères reconnus sont en gras
  function surligner(texte, tokens) {
    const frag = document.createDocumentFragment();
    const chars = Array.from(texte);
    const texteN = chars.map(function (c) { return norm(c); }).join('');
    if (!tokens.length || texteN.length !== chars.length) {
      frag.appendChild(document.createTextNode(texte));
      return frag;
    }

    const marque = chars.map(function () { return false; });
    tokens.forEach(function (tok) {
      // On préfère une occurrence en début de mot, sinon la première trouvée
      let debut = -1;
      let i = texteN.indexOf(tok);
      while (i !== -1) {
        if (i === 0 || texteN.charAt(i - 1) === ' ') { debut = i; break; }
        if (debut === -1) debut = i;
        i = texteN.indexOf(tok, i + 1);
      }
      if (debut !== -1) {
        for (let k = debut; k < debut + tok.length; k++) marque[k] = true;
      }
    });

    let pos = 0;
    while (pos < chars.length) {
      let fin = pos;
      while (fin < chars.length && marque[fin] === marque[pos]) fin++;
      const morceau = chars.slice(pos, fin).join('');
      if (marque[pos]) {
        const b = document.createElement('b');
        b.textContent = morceau;
        frag.appendChild(b);
      } else {
        frag.appendChild(document.createTextNode(morceau));
      }
      pos = fin;
    }
    return frag;
  }

  window.creerChoixNom = function (conteneur, personnes, options) {
    options = options || {};

    // Liste triée par nom puis prénom
    const tri = personnes.slice().sort(function (a, b) {
      return affichage(a).localeCompare(affichage(b), 'fr', { sensitivity: 'base' });
    });

    const racine = document.createElement('div');
    racine.className = 'choix-nom';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = options.placeholder || 'Choisis ton nom';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    const liste = document.createElement('div');
    liste.className = 'choix-liste';
    racine.appendChild(input);
    racine.appendChild(liste);
    conteneur.innerHTML = '';
    conteneur.appendChild(racine);

    let selection = null;
    let affiches = [];
    let courant = -1;

    // Filtre : chaque mot tapé doit se trouver dans "nom prénom".
    // Ordre : nom qui commence par la saisie, puis prénom qui commence par la saisie, puis le reste.
    function filtrer(requete) {
      const tokens = norm(requete).split(/\s+/).filter(Boolean);
      if (!tokens.length) return { tokens: [], liste: tri };

      const resultats = [];
      tri.forEach(function (p) {
        const nomN = norm(p.nom);
        const prenomN = norm(p.prenom);
        const tout = nomN + ' ' + prenomN;
        const tousTrouves = tokens.every(function (t) { return tout.indexOf(t) !== -1; });
        if (!tousTrouves) return;
        const score = nomN.indexOf(tokens[0]) === 0 ? 0 : (prenomN.indexOf(tokens[0]) === 0 ? 1 : 2);
        resultats.push({ p: p, score: score });
      });
      resultats.sort(function (a, b) { return a.score - b.score; });
      return { tokens: tokens, liste: resultats.map(function (r) { return r.p; }) };
    }

    function dessiner(requete) {
      const f = filtrer(requete);
      affiches = f.liste;
      courant = -1;
      liste.innerHTML = '';

      if (affiches.length === 0) {
        const vide = document.createElement('div');
        vide.className = 'choix-vide';
        vide.textContent = 'Aucun nom trouvé';
        liste.appendChild(vide);
        return;
      }

      affiches.forEach(function (p) {
        const item = document.createElement('div');
        item.className = 'choix-item' + (p === selection ? ' choisi' : '');
        item.appendChild(surligner(affichage(p), f.tokens));
        // mousedown (et non click) pour que le champ ne perde pas le focus avant le choix
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
          valider(p);
        });
        liste.appendChild(item);
      });
    }

    function marquerActif() {
      const items = liste.querySelectorAll('.choix-item');
      items.forEach(function (el, i) { el.classList.toggle('actif', i === courant); });
      if (items[courant]) items[courant].scrollIntoView({ block: 'nearest' });
    }

    function ouvrir() { liste.classList.add('ouvert'); }
    function fermer() { liste.classList.remove('ouvert'); }

    function valider(p) {
      const change = p !== selection;
      selection = p;
      input.value = affichage(p);
      fermer();
      input.blur();
      if (change && options.onChange) options.onChange(p);
    }

    input.addEventListener('focus', function () {
      dessiner('');
      ouvrir();
      input.select();
    });

    input.addEventListener('click', function () {
      if (!liste.classList.contains('ouvert')) {
        dessiner('');
        ouvrir();
      }
    });

    input.addEventListener('input', function () {
      dessiner(input.value);
      ouvrir();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        ouvrir();
        if (affiches.length === 0) return;
        courant = e.key === 'ArrowDown' ? Math.min(courant + 1, affiches.length - 1) : Math.max(courant - 1, 0);
        marquerActif();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (courant >= 0) valider(affiches[courant]);
        else if (affiches.length === 1) valider(affiches[0]);
      } else if (e.key === 'Escape') {
        input.blur();
      }
    });

    // En quittant le champ : texte vide = on retire la sélection, sinon on remet le nom choisi
    input.addEventListener('blur', function () {
      if (input.value.trim() === '' && selection) {
        selection = null;
        if (options.onChange) options.onChange(null);
      }
      input.value = selection ? affichage(selection) : '';
      fermer();
    });

    return {
      choisir: function (p) {
        selection = p || null;
        input.value = p ? affichage(p) : '';
      },
      valeur: function () { return selection; }
    };
  };
})();