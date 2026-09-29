(() => {
  const button = document.querySelector('.motion-toggle');
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { paused = reduced.matches || localStorage.getItem('bahchisarai-motion') === 'paused'; } catch {}
  const update = () => {
    root.classList.toggle('motion-paused', paused || reduced.matches);
    button.hidden = reduced.matches;
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Анимация: на паузе' : 'Анимация: включена';
    button.setAttribute('aria-label', paused ? 'Включить анимацию' : 'Приостановить анимацию');
  };
  button.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('bahchisarai-motion', paused ? 'paused' : 'playing'); } catch {}
    update();
  });
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));
  update();
})();
