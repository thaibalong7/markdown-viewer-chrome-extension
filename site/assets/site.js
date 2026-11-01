/* Buildless public-site behavior. Runs before styles to avoid a theme flash. */
(() => {
  const key = 'mdp-site-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const isTheme = (value) => value === 'light' || value === 'dark';
  let choice = null;
  try {
    const stored = window.localStorage.getItem(key);
    if (isTheme(stored)) choice = stored;
  } catch {
    // Storage can be blocked; the theme remains usable for the current page.
  }

  function applyTheme() {
    const theme = choice || (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b111c' : '#fbfcff');
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }

  applyTheme();
  system.addEventListener('change', () => { if (!choice) applyTheme(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    choice = isTheme(event.newValue) ? event.newValue : null;
    applyTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const languageControl = document.querySelector('.language-control');
    document.querySelectorAll('[data-language-link]').forEach((link) => {
      // Each edition has the same stable section IDs; keep the reader's place.
      link.hash = window.location.hash;
    });
    window.addEventListener('hashchange', () => {
      document.querySelectorAll('[data-language-link]').forEach((link) => {
        link.hash = window.location.hash;
      });
    });
    document.addEventListener('click', (event) => {
      if (!languageControl?.contains(event.target)) languageControl?.removeAttribute('open');
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && languageControl?.open) {
        languageControl.open = false;
        languageControl.querySelector('summary').focus();
      }
    });
    applyTheme();
    document.querySelector('.theme-control')?.removeAttribute('hidden');
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        choice = button.dataset.themeChoice;
        applyTheme();
        try {
          window.localStorage.setItem(key, choice);
        } catch {
          // Keep the explicit choice in memory when persistence is unavailable.
        }
      });
    });

    document.querySelector('.demo-view-control')?.removeAttribute('hidden');
    const demoButtons = [...document.querySelectorAll('[data-demo-mode]')];
    demoButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.demoMode;
        demoButtons.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.demoMode === mode)));
        document.querySelector('#sample-reader').hidden = mode !== 'reader';
        document.querySelector('#sample-source').hidden = mode !== 'source';
      });
    });

    document.querySelectorAll('.mobile-toc a').forEach((link) => {
      link.addEventListener('click', () => {
        link.closest('.mobile-toc').open = false;
        document.querySelector(link.hash)?.focus({ preventScroll: true });
      });
    });

    const sections = [...document.querySelectorAll('.policy-section, .guide-section')];
    if (!sections.length) return;
    const links = [...document.querySelectorAll('.policy-sidebar a[href^="#"]')];
    function updateCurrentSection() {
      const threshold = Number.parseFloat(getComputedStyle(root).scrollPaddingTop) + 36;
      const current = sections.filter((section) => section.getBoundingClientRect().top <= threshold).at(-1) || sections[0];
      links.forEach((link) => {
        if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    // Long chapters can cover the observer band without crossing a threshold.
    // Measure at most once per frame so navigation stays accurate while scrolling.
    let scheduled = false;
    function scheduleCurrentSection() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        updateCurrentSection();
      });
    }
    window.addEventListener('scroll', scheduleCurrentSection, { passive: true });
    window.addEventListener('resize', scheduleCurrentSection);
    scheduleCurrentSection();
  });
})();
