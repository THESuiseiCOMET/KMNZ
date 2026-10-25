(function () {
  window.KMNZ_CONFIG = Object.assign({
    firebaseConfig: null
  }, window.KMNZ_CONFIG || {});

  if (!window.FIREBASE_CONFIG && window.KMNZ_CONFIG.firebaseConfig) {
    window.FIREBASE_CONFIG = window.KMNZ_CONFIG.firebaseConfig;
  }
})();
