(function () {
  const THEME_KEY = 'kmnzTheme';
  const VARS = {
    light: {
      '--bg': '#ffffff',
      '--surface': '#ffffff',
      '--text': '#222222',
      '--muted': '#666666',
      '--border': '#eeeeee',
      '--accent': '#1e88e5',
      '--hero-overlay': 'rgba(0,0,0,0.36)',
      '--hero-foreground': '#ffffff'
    },
    dark: {
      '--bg': '#0b1116',
      '--surface': '#0f1720',
      '--text': '#e6eef8',
      '--muted': '#9aa6b2',
      '--border': 'rgba(255,255,255,0.08)',
      '--accent': '#59a6ff',
      '--hero-overlay': 'rgba(0,0,0,0.6)',
      '--hero-foreground': '#ffffff'
    }
  };

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function preferredTheme() {
    const saved = storedTheme();
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    Object.entries(VARS[next]).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}

    const button = document.getElementById('theme-toggle');
    if (button) {
      button.textContent = next === 'dark' ? '🌙' : '☀️';
      button.setAttribute('aria-label', next === 'dark' ? '切换到浅色主题' : '切换到深色主题');
      button.title = button.getAttribute('aria-label');
    }
    return next;
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  window.KMNZTheme = {
    apply: applyTheme,
    current: currentTheme,
    toggle: function () {
      return applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    }
  };

  applyTheme(preferredTheme());
})();
