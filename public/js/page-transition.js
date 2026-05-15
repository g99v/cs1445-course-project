class PageTransitionManager {
  constructor() {
    this.handleReadyState();
    this.bindLinks();
  }

  handleReadyState() {
    document.body.classList.add('is-ready');
  }

  bindLinks() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (link.target === '_blank') return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = new URL(link.href, window.location.href);
      const sameOrigin = url.origin === window.location.origin;

      if (!sameOrigin) return;

      if ('startViewTransition' in document) {
        return;
      }

      event.preventDefault();
      document.body.classList.remove('is-ready');
      document.body.classList.add('is-leaving');

      setTimeout(() => {
        window.location.href = url.href;
      }, 140);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PageTransitionManager();
});