/* 시험용: 시뮬레이션 하나만 띄우고, 테마 전환 단추를 붙인다 (build.py --only 전용) */
(function () {
  const bar = K.el('div', { style: 'display:flex;gap:8px;margin-bottom:12px' });
  ['system', 'light', 'dark'].forEach(t => K.button(bar, {
    label: t, kind: 'small', onClick() {
      if (t === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
    },
  }));
  document.querySelector('.sandbox').prepend(bar);
  K.mountAll();
})();
