(() => {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target.matches('.story-chapter')) {
        document.documentElement.style.setProperty('--story-step', entry.target.dataset.step || 1);
      }
    });
  }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });
  items.forEach(item => observer.observe(item));
})();
