/* Calendar seasons in Bakhchisaray time. Only the current image is requested. */
(function () {
  function applySeason() {
    var month = Number(new Intl.DateTimeFormat('en', {timeZone: 'Europe/Simferopol', month: 'numeric'}).format(new Date()));
    var season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
    document.documentElement.dataset.season = season;
  }
  try { applySeason(); } catch (_) { document.documentElement.dataset.season = 'summer'; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) applySeason(); });
}());
