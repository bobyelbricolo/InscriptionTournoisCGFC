function renderNav() {
  const el = document.getElementById('nav-placeholder');
  if (!el) return;
  el.innerHTML =
    '<div class="barre-nav">' +
      '<button class="btn-nav" onclick="history.back()">\u2039 Retour</button>' +
      '<a class="btn-nav" href="index.html">Accueil</a>' +
    '</div>';
}
document.addEventListener('DOMContentLoaded', renderNav);
