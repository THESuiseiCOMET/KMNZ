(function () {
  const DEFAULT_AVATAR = 'assets/images/default4.png';

  window.defaultAvatars = [
    'assets/images/Lita.PNG',
    'assets/images/Tina.PNG',
    'assets/images/Nero.PNG',
    DEFAULT_AVATAR
  ];

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function getFirebaseConfig() {
    return (window.KMNZ_CONFIG && window.KMNZ_CONFIG.firebaseConfig) || window.FIREBASE_CONFIG || null;
  }

  function randomAvatar() {
    const list = window.defaultAvatars || [];
    return list.length ? list[Math.floor(Math.random() * list.length)] : DEFAULT_AVATAR;
  }

  function setStatus(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('is-error', 'is-success');
    if (type) el.classList.add(type === 'error' ? 'is-error' : 'is-success');
  }

  function ensureFirebase() {
    if (window._firebaseInitPromise) return window._firebaseInitPromise;

    window._firebaseInitPromise = new Promise((resolve, reject) => {
      const config = getFirebaseConfig();
      if (!config) return resolve(null);

      function finish() {
        try {
          if (!window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(config);
          }
          resolve(window.firebase);
        } catch (error) {
          reject(error);
        }
      }

      if (window.firebase && window.firebase.auth) {
        finish();
        return;
      }

      const base = 'https://www.gstatic.com/firebasejs/9.22.2';
      const scripts = ['firebase-app-compat.js', 'firebase-auth-compat.js'];
      let loaded = 0;

      scripts.forEach((file) => {
        const script = document.createElement('script');
        script.src = `${base}/${file}`;
        script.async = true;
        script.onload = () => {
          loaded += 1;
          if (loaded === scripts.length) finish();
        };
        script.onerror = () => reject(new Error(`加载 Firebase SDK 失败: ${file}`));
        document.head.appendChild(script);
      });
    });

    return window._firebaseInitPromise;
  }

  window.getStoredUser = function () {
    try {
      const raw = localStorage.getItem('kmnzUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  window.getUsers = function () {
    try {
      const raw = localStorage.getItem('kmnzUsers');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  window.saveUsers = function (users) {
    try {
      localStorage.setItem('kmnzUsers', JSON.stringify(users || []));
    } catch (e) {}
  };

  window.loginUser = function (user) {
    try {
      localStorage.setItem('kmnzUser', JSON.stringify(user));
    } catch (e) {}

    try {
      if (user && user.id) {
        const users = window.getUsers();
        const index = users.findIndex((item) => String(item.id) === String(user.id));
        if (index >= 0) users[index] = Object.assign({}, users[index], user);
        else users.push(Object.assign({}, user));
        window.saveUsers(users);
      }
    } catch (e) {}

    if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
  };

  window.logoutUser = function () {
    try {
      localStorage.removeItem('kmnzUser');
    } catch (e) {}
    if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
    location.href = 'auth.html#login';
  };

  window.updateAuthUI = function () {
    const user = window.getStoredUser();
    const authButton = document.getElementById('nav-auth-btn');
    const userBox = document.getElementById('nav-user');
    const avatar = document.getElementById('nav-user-avatar');
    const id = document.getElementById('nav-user-id');

    if (authButton) authButton.hidden = Boolean(user);
    if (!userBox) return;

    userBox.hidden = !user;
    userBox.dataset.logged = user ? '1' : '0';
    if (avatar) avatar.src = user && user.avatar ? user.avatar : DEFAULT_AVATAR;
    if (id) id.textContent = user ? (user.name || user.id || '') : '';
  };

  function bindNav() {
    const navToggle = document.getElementById('nav-toggle');
    const siteNav = document.getElementById('site-nav');

    if (siteNav) {
      addThemeToggle(siteNav);
    }

    if (navToggle && siteNav) {
      navToggle.addEventListener('click', () => {
        const next = siteNav.getAttribute('data-visible') !== 'true';
        siteNav.setAttribute('data-visible', String(next));
        navToggle.setAttribute('aria-expanded', String(next));
      });
    }

    const authButton = document.getElementById('nav-auth-btn');
    const signoutButton = document.getElementById('nav-signout');
    const userBox = document.getElementById('nav-user');

    if (authButton) authButton.addEventListener('click', () => { location.href = 'auth.html#login'; });
    if (signoutButton) signoutButton.addEventListener('click', () => window.logoutUser());
    if (userBox) {
      userBox.addEventListener('click', (event) => {
        if (event.target.closest('#nav-signout')) return;
        location.href = window.getStoredUser() ? 'user.html' : 'auth.html#login';
      });
    }

    window.updateAuthUI();
  }

  function addThemeToggle(siteNav) {
    if (!window.KMNZTheme || document.getElementById('theme-toggle')) return;
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.type = 'button';
    button.className = 'theme-toggle';
    siteNav.appendChild(button);
    button.addEventListener('click', () => window.KMNZTheme.toggle());
    window.KMNZTheme.apply(window.KMNZTheme.current());
  }

  function showAuthPanel(name) {
    const loginPanel = document.getElementById('panel-login');
    const registerPanel = document.getElementById('panel-register');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    if (!tabLogin || !tabRegister || !loginPanel || !registerPanel) return;

    const isRegister = name === 'register';
    loginPanel.hidden = isRegister;
    registerPanel.hidden = !isRegister;
    tabLogin.classList.toggle('active', !isRegister);
    tabRegister.classList.toggle('active', isRegister);
    tabLogin.setAttribute('aria-selected', String(!isRegister));
    tabRegister.setAttribute('aria-selected', String(isRegister));
  }

  function bindAuthForms() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    if (!tabLogin || !tabRegister) return;

    showAuthPanel(location.hash.replace('#', '') === 'register' ? 'register' : 'login');
    tabLogin.addEventListener('click', () => {
      showAuthPanel('login');
      location.hash = 'login';
    });
    tabRegister.addEventListener('click', () => {
      showAuthPanel('register');
      location.hash = 'register';
    });

    bindLoginForm();
    bindRegisterForm();
    bindPasswordHelpers();
  }

  function bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = document.getElementById('login-status');
      const email = (document.getElementById('login-email').value || '').trim();
      const password = document.getElementById('login-password').value || '';

      if (!email) return setStatus(status, '请填写邮箱。', 'error');
      if (!password) return setStatus(status, '请填写密码。', 'error');

      if (getFirebaseConfig()) {
        ensureFirebase()
          .then(() => window.firebase.auth().signInWithEmailAndPassword(email, password))
          .then((credential) => {
            const fbUser = credential.user;
            const user = {
              id: fbUser.email || fbUser.uid,
              name: fbUser.displayName || fbUser.email || email,
              avatar: fbUser.photoURL || randomAvatar()
            };
            window.loginUser(user);
            setStatus(status, '登录成功，1 秒后跳转到首页...', 'success');
            setTimeout(() => { location.href = 'index.html'; }, 1000);
          })
          .catch((error) => setStatus(status, error && error.message ? error.message : '登录失败。', 'error'));
        return;
      }

      const matched = window.getUsers().find((user) => String(user.id) === String(email));
      if (!matched) return setStatus(status, '该账户不存在，请先注册。', 'error');
      if (!matched.password) return setStatus(status, '该账户未设置密码，请重新注册。', 'error');
      if (matched.password !== password) return setStatus(status, '密码错误。', 'error');

      window.loginUser({
        id: email,
        name: matched.name || email,
        avatar: matched.avatar || randomAvatar()
      });
      setStatus(status, '登录成功，1 秒后跳转到首页...', 'success');
      setTimeout(() => { location.href = 'index.html'; }, 1000);
    });
  }

  function bindRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = document.getElementById('reg-status');
      const success = document.getElementById('reg-success');
      const name = (document.getElementById('reg-name').value || '').trim();
      const email = (document.getElementById('reg-email').value || '').trim();
      const password = document.getElementById('reg-password').value || '';
      const confirm = document.getElementById('reg-password2').value || '';
      const avatar = randomAvatar();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (success) success.hidden = true;
      if (!name) return setStatus(status, '请填写昵称。', 'error');
      if (!email) return setStatus(status, '请填写邮箱。', 'error');
      if (!emailPattern.test(email)) return setStatus(status, '请输入有效的邮箱地址。', 'error');
      if (password.length < 8) return setStatus(status, '密码长度至少 8 位。', 'error');
      if (password !== confirm) return setStatus(status, '两次密码不一致。', 'error');

      if (getFirebaseConfig()) {
        ensureFirebase()
          .then(() => window.firebase.auth().createUserWithEmailAndPassword(email, password))
          .then((credential) => {
            const fbUser = credential.user;
            if (fbUser && fbUser.updateProfile) {
              fbUser.updateProfile({ displayName: name, photoURL: avatar }).catch(() => {});
            }
            window.loginUser({ id: fbUser.email || fbUser.uid, name, avatar });
            setStatus(status, '', 'success');
            if (success) {
              success.hidden = false;
              success.textContent = '注册成功，已自动登录，1 秒后跳转...';
            }
            setTimeout(() => { location.href = 'user.html'; }, 1000);
          })
          .catch((error) => setStatus(status, error && error.message ? error.message : '注册失败。', 'error'));
        return;
      }

      const users = window.getUsers();
      if (users.some((user) => String(user.id) === String(email))) {
        return setStatus(status, '该邮箱已被注册。', 'error');
      }

      window.loginUser({ id: email, name, avatar, password });
      setStatus(status, '', 'success');
      if (success) {
        success.hidden = false;
        success.textContent = '注册成功，已自动登录，1 秒后跳转...';
      }
      setTimeout(() => { location.href = 'user.html'; }, 1000);
    });
  }

  function bindPasswordHelpers() {
    const password = document.getElementById('reg-password');
    const confirm = document.getElementById('reg-password2');
    const bar = document.getElementById('pwd-bar');
    const matchMeta = document.getElementById('match-meta');

    if (password && bar) {
      password.addEventListener('input', () => {
        const value = password.value || '';
        let score = 0;
        if (value.length >= 8) score += 1;
        if (/[A-Z]/.test(value)) score += 1;
        if (/[0-9]/.test(value)) score += 1;
        if (/[^A-Za-z0-9]/.test(value)) score += 1;
        bar.style.width = `${(score / 4) * 100}%`;
      });
    }

    if (password && confirm && matchMeta) {
      confirm.addEventListener('input', () => {
        if (!confirm.value) return setStatus(matchMeta, '', null);
        if (password.value === confirm.value) return setStatus(matchMeta, '两次密码匹配。', 'success');
        return setStatus(matchMeta, '两次密码不一致。', 'error');
      });
    }
  }

  function bindResetForm() {
    const form = document.getElementById('reset-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = document.getElementById('reset-status');
      const email = (document.getElementById('reset-email').value || '').trim();
      const password = document.getElementById('reset-password').value || '';
      const confirm = document.getElementById('reset-password2').value || '';

      if (!email) return setStatus(status, '请填写邮箱。', 'error');
      if (password.length < 8) return setStatus(status, '密码长度至少 8 位。', 'error');
      if (password !== confirm) return setStatus(status, '两次密码不一致。', 'error');

      const users = window.getUsers();
      const index = users.findIndex((user) => String(user.id) === String(email));
      if (index < 0) return setStatus(status, '该账户不存在。', 'error');

      users[index].password = password;
      window.saveUsers(users);
      window.loginUser({
        id: users[index].id,
        name: users[index].name || users[index].id,
        avatar: users[index].avatar || randomAvatar()
      });
      setStatus(status, '密码已重置并已登录，1 秒后跳转到首页...', 'success');
      setTimeout(() => { location.href = 'index.html'; }, 1000);
    });
  }

  function renderMembersGrid() {
    const grid = document.getElementById('members-grid');
    if (!grid || !window.members) return;

    grid.innerHTML = '';
    window.members.forEach((member) => {
      const link = document.createElement('a');
      link.className = 'member-link';
      link.href = `member${member.id}.html`;
      link.setAttribute('aria-label', `查看 ${member.name} 的资料`);

      const card = document.createElement('div');
      card.className = 'member-card';

      const photo = document.createElement('div');
      photo.className = 'member-photo';
      const image = document.createElement('img');
      image.src = member.photo;
      image.alt = member.name;
      image.loading = 'lazy';
      photo.appendChild(image);

      const name = document.createElement('div');
      name.className = 'member-name';
      name.textContent = member.name;

      card.append(photo, name);
      link.appendChild(card);
      grid.appendChild(link);
    });
  }

  function bindMemberPhotoStates() {
    document.querySelectorAll('.member-photo').forEach((photo) => {
      photo.addEventListener('mousedown', () => photo.classList.add('dragging'));
      photo.addEventListener('mouseup', () => photo.classList.remove('dragging'));
      photo.addEventListener('mouseleave', () => photo.classList.remove('dragging'));
      photo.addEventListener('touchstart', () => photo.classList.add('dragging'), { passive: true });
      photo.addEventListener('touchend', () => photo.classList.remove('dragging'));
    });
  }

  function initCarousel() {
    const carousel = document.querySelector('.hero-carousel');
    if (!carousel || carousel.dataset.carouselInitialized) return;
    carousel.dataset.carouselInitialized = '1';

    const slides = Array.from(carousel.querySelectorAll('.slide'));
    if (!slides.length) return;

    const prevButton = carousel.querySelector('.carousel-control.prev');
    const nextButton = carousel.querySelector('.carousel-control.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    const letters = ['K', 'M', 'N', 'Z'];
    let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
    let timer = null;
    const interval = Number(carousel.dataset.interval) > 0 ? Number(carousel.dataset.interval) : 4000;

    if (indicatorsContainer) {
      indicatorsContainer.innerHTML = '';
      slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.className = 'indicator';
        button.type = 'button';
        button.dataset.index = String(index);
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-label', `第 ${index + 1} 张`);
        button.textContent = letters[index % letters.length];
        indicatorsContainer.appendChild(button);
      });
    }

    const indicators = Array.from(carousel.querySelectorAll('.indicator'));

    function show(index) {
      current = ((index % slides.length) + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle('active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      indicators.forEach((button, buttonIndex) => {
        const active = buttonIndex === current;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
    }

    function next() {
      show(current + 1);
    }

    function prev() {
      show(current - 1);
    }

    function start() {
      if (!timer && slides.length > 1) timer = setInterval(next, interval);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function restart() {
      stop();
      start();
    }

    if (prevButton) prevButton.addEventListener('click', () => { prev(); restart(); });
    if (nextButton) nextButton.addEventListener('click', () => { next(); restart(); });
    indicators.forEach((button) => {
      button.addEventListener('click', () => {
        show(Number(button.dataset.index));
        restart();
      });
    });

    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { prev(); restart(); }
      if (event.key === 'ArrowRight') { next(); restart(); }
    });
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);

    show(current);
    start();
  }

  window.processAvatarFile = function (file, opts) {
    const maxDim = (opts && opts.maxDim) || 256;
    const maxBytes = (opts && opts.maxBytes) || 150 * 1024;

    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('不是图片文件。'));

      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          let width = image.width;
          let height = image.height;
          const ratio = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(image, 0, 0, width, height);

          const supportsWebp = (() => {
            try {
              return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
            } catch (e) {
              return false;
            }
          })();

          const mimes = supportsWebp ? ['image/webp', 'image/jpeg'] : ['image/jpeg'];
          let quality = 0.92;

          function exportImage(mime, q) {
            try {
              const dataUrl = canvas.toDataURL(mime, q);
              const body = dataUrl.split(',')[1] || '';
              return { dataUrl, bytes: Math.ceil(body.length * 3 / 4) };
            } catch (e) {
              return null;
            }
          }

          while (quality >= 0.5) {
            for (const mime of mimes) {
              const result = exportImage(mime, quality);
              if (result && result.bytes <= maxBytes) return resolve(result.dataUrl);
            }
            quality -= 0.12;
          }

          const fallback = exportImage('image/jpeg', 0.5);
          resolve(fallback ? fallback.dataUrl : canvas.toDataURL());
        };
        image.onerror = () => reject(new Error('无法加载图片。'));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error('读取文件失败。'));
      reader.readAsDataURL(file);
    });
  };

  onReady(() => {
    bindNav();
    bindAuthForms();
    bindResetForm();
    renderMembersGrid();
    bindMemberPhotoStates();
    initCarousel();
  });
})();
