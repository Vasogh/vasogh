(() => {
  'use strict';
  const vkStatus = document.getElementById('vk-status');
  const tgStatus = document.getElementById('tg-status');
  const vkRoot = document.getElementById('vk-community');
  const tgRoot = document.getElementById('telegram-posts');

  async function readJSON(path) {
    const response = await fetch(path, {cache: 'no-cache'});
    if (!response.ok) throw new Error('Feed unavailable');
    return response.json();
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('Widget timeout')), 15000);
      script.src = src;
      script.async = true;
      script.onload = () => {clearTimeout(timer); resolve();};
      script.onerror = () => {clearTimeout(timer); reject(new Error('Widget unavailable'));};
      document.head.append(script);
    });
  }
  async function initVK() {
    try {
      const config = await readJSON('data/config.json');
      const id = Number(config.vk_group_id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Missing community');
      await loadScript('https://vk.com/js/api/openapi.js?169');
      let lastWidth = 0;
      let resizeTimer;
      const mount = () => {
        const width = Math.floor(vkRoot.parentElement.clientWidth);
        if (!width || width === lastWidth) return;
        lastWidth = width;
        vkRoot.replaceChildren();
        window.VK.Widgets.Group('vk-community', {
          mode: 4, wide: 1, width: String(width), height: '490',
          color1: 'FFFFFF', color2: '203B4E', color3: '0077FF'
        }, id);
        vkStatus.hidden = true;
      };
      mount();
      if ('ResizeObserver' in window) new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(mount, 200);
      }).observe(vkRoot.parentElement);
    } catch {
      vkStatus.textContent = 'Лента сейчас недоступна. Свежие публикации можно прочитать в нашем сообществе.';
    }
  }
  async function initTelegram() {
    try {
      const feed = await readJSON('data/telegram.json');
      const posts = Array.isArray(feed.posts) ? feed.posts.filter(p => Number.isSafeInteger(p.id) && p.id > 0).slice(0, 8) : [];
      if (!posts.length) {
        tgStatus.textContent = 'Читайте свежие публикации в нашем Telegram-канале.';
        return;
      }
      tgStatus.hidden = true;
      // Limit the external embed source to our public channel. No API token is used in the browser.
      for (const post of posts) {
        const card = document.createElement('div');
        card.className = 'telegram-post';
        const link = document.createElement('a');
        link.href = `https://t.me/bahchisarai/${post.id}`;
        link.textContent = 'Открыть публикацию в Telegram ↗';
        link.className = 'post-link';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.append(link);
        tgRoot.append(card);
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.dataset.telegramPost = `bahchisarai/${post.id}`;
        script.dataset.width = '100%';
        script.dataset.userpic = 'false';
        script.dataset.color = '168BBD';
        script.onerror = () => {link.textContent = 'Публикация доступна в Telegram ↗';};
        card.append(script);
      }
    } catch {
      tgStatus.textContent = 'Лента сейчас недоступна. Свежие публикации можно прочитать в нашем Telegram-канале.';
    }
  }
  const start = () => {initVK(); initTelegram();};
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {observer.disconnect(); start();}
    }, {rootMargin: '250px'});
    observer.observe(document.querySelector('.feeds'));
  } else start();
})();
