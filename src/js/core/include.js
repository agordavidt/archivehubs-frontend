const cache = new Map();

export async function mountPartials(root = document) {
  const nodes = [...root.querySelectorAll('[data-include]')];
  await Promise.all(nodes.map(async (el) => {
    const src = el.dataset.include;
    if (!src) return;
    try {
      let html = cache.get(src);
      if (html === undefined) {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
        cache.set(src, html);
      }
      el.innerHTML = html;
    } catch (e) {
      console.error('[include] failed for', src, e);
      el.innerHTML = `<!-- failed to include ${src} -->`;
    }
  }));
  window.dispatchEvent(new CustomEvent('partials:mounted'));
}