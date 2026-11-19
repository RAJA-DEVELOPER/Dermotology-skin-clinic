(function () {
  try {
    if (localStorage.getItem('dc-direction') !== 'rtl') return;

    var html = document.documentElement;
    html.setAttribute('dir', 'rtl');
    html.classList.add('is-rtl');

    var link = document.querySelector('link[href*="bootstrap@"][href$="/css/bootstrap.min.css"]');
    if (!link) return;

    var href = link.getAttribute('href');
    link.setAttribute('data-ltr-href', href);
    link.setAttribute('href', href.replace('/bootstrap.min.css', '/bootstrap.rtl.min.css'));
  } catch (e) {
    // Ignore storage or DOM errors and keep the default LTR layout.
  }
})();
