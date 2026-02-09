(function () {
  var origin = window.location.origin;
  var path = window.location.pathname;
  var full = origin + (path === '/' || path === '' ? '/index.html' : path);
  var canonical = document.getElementById('canonical-url');
  if (canonical) canonical.href = full.replace(/\/index\.html$/, '/') || full;
  var ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.content = full.replace(/\/index\.html$/, '/') || full;
})();
