/* Runs before the page draws: the colour theme the visitor picked last time (no flash of the wrong one).
   A file, not an inline script, so the published site can forbid inline scripts (sitepublish.py). */
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) { /* storage blocked: the system theme is used */ }
