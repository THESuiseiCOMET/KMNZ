(function () {
  function setMessage(element, message, type) {
    if (!element) return;
    element.textContent = message || '';
    element.classList.remove('is-error', 'is-success');
    if (type) element.classList.add(type === 'error' ? 'is-error' : 'is-success');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const user = window.getStoredUser && window.getStoredUser();
    if (!user) {
      location.href = 'auth.html#login';
      return;
    }

    const avatarImg = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const idEl = document.getElementById('user-id');
    const fileInput = document.getElementById('user-avatar-file');
    const urlInput = document.getElementById('user-avatar-url');
    const msg = document.getElementById('avatar-msg');
    const saveButton = document.getElementById('btn-avatar-save');
    const clearButton = document.getElementById('btn-avatar-clear');
    const backButton = document.getElementById('btn-back');
    const defaultsContainer = document.getElementById('default-avatars');

    if (avatarImg) avatarImg.src = user.avatar || (window.defaultAvatars && window.defaultAvatars[0]) || 'assets/images/default4.png';
    if (nameEl) nameEl.textContent = user.name || user.id || '用户';
    if (idEl) idEl.textContent = `ID: ${user.id || '-'}`;

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const value = (urlInput.value || '').trim();
        if (value && /^https?:\/\//i.test(value) && avatarImg) avatarImg.src = value;
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        setMessage(msg, '处理中...', null);
        try {
          const dataUrl = await window.processAvatarFile(file, { maxDim: 256, maxBytes: 150 * 1024 });
          if (avatarImg) avatarImg.src = dataUrl;
          setMessage(msg, '已准备好，点击保存以应用。', 'success');
        } catch (error) {
          setMessage(msg, `头像处理失败: ${error && error.message ? error.message : '未知错误'}`, 'error');
        }
      });
    }

    if (defaultsContainer) {
      defaultsContainer.innerHTML = '';
      (window.defaultAvatars || []).forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'default-avatar-thumb';
        button.setAttribute('role', 'listitem');
        button.title = '选择默认头像';

        const image = document.createElement('img');
        image.src = src;
        image.alt = `默认头像 ${index + 1}`;
        button.appendChild(image);

        button.addEventListener('click', () => {
          defaultsContainer.querySelectorAll('.default-avatar-thumb').forEach((item) => item.classList.remove('selected'));
          button.classList.add('selected');
          if (avatarImg) avatarImg.src = src;
          setMessage(msg, '已选择默认头像，点击保存以应用。', 'success');
        });
        defaultsContainer.appendChild(button);
      });
    }

    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        try {
          const file = fileInput && fileInput.files && fileInput.files[0];
          let finalSrc = '';

          if (file) {
            setMessage(msg, '正在生成头像...', null);
            finalSrc = await window.processAvatarFile(file, { maxDim: 256, maxBytes: 150 * 1024 });
          } else {
            const url = (urlInput && urlInput.value || '').trim();
            if (url && /^https?:\/\//i.test(url)) finalSrc = url;
          }

          if (!finalSrc && defaultsContainer) {
            const selected = defaultsContainer.querySelector('.default-avatar-thumb.selected img');
            if (selected) finalSrc = selected.getAttribute('src') || selected.src;
          }

          if (!finalSrc) {
            setMessage(msg, '请先选择上传文件、填写有效 URL 或选择默认头像。', 'error');
            return;
          }

          const currentUser = window.getStoredUser() || { id: 'user' };
          currentUser.avatar = finalSrc;
          window.loginUser(currentUser);
          if (typeof window.updateAuthUI === 'function') window.updateAuthUI();

          if (fileInput) fileInput.value = '';
          if (urlInput) urlInput.value = '';
          if (defaultsContainer) defaultsContainer.querySelectorAll('.default-avatar-thumb').forEach((item) => item.classList.remove('selected'));
          setMessage(msg, '已保存。', 'success');
        } catch (error) {
          setMessage(msg, `保存失败: ${error && error.message ? error.message : '未知错误'}`, 'error');
        }
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        const currentUser = window.getStoredUser() || { id: 'user' };
        const avatars = window.defaultAvatars || ['assets/images/default4.png'];
        currentUser.avatar = avatars[Math.floor(Math.random() * avatars.length)];
        window.loginUser(currentUser);
        if (avatarImg) avatarImg.src = currentUser.avatar;
        setMessage(msg, '已重置为默认头像。', 'success');
      });
    }

    if (backButton) backButton.addEventListener('click', () => { location.href = 'index.html'; });
  });
})();
