/* Native dialog behåller fokus i förstoringen; länken fungerar även utan JS. */
'use strict';
(() => {
  const ui = globalThis.YasmineUI, core = globalThis.YasmineCore;
  const links = Array.from(document.querySelectorAll('[data-gallery]'));
  const dialog = document.getElementById('image-dialog');
  if (!ui || !core || !dialog || typeof dialog.showModal !== 'function' || !links.length) return;
  const image = document.getElementById('image-dialog-img');
  const title = document.getElementById('image-dialog-title');
  const caption = document.getElementById('image-dialog-caption');
  const count = document.getElementById('image-dialog-count');
  const error = document.getElementById('image-load-status');
  const original = document.getElementById('image-original-link');
  let index = 0;
  function show(next) {
    index = core.wrapIndex(next, links.length);
    const link = links[index];
    error.hidden = true;
    const thumbnail = link.querySelector('img');
    image.alt = thumbnail.alt;
    image.width = Number(thumbnail.getAttribute('width'));
    image.height = Number(thumbnail.getAttribute('height'));
    image.src = link.href;
    title.textContent = link.dataset.title;
    caption.textContent = link.dataset.caption;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(links.length).padStart(2, '0')}`;
    if (original) original.href = link.href;
  }
  ui.registerModal(dialog);
  links.forEach((link, position) => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    show(position);
    ui.openModal(dialog, link);
  }));
  document.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
  document.querySelector('[data-gallery-prev]').addEventListener('click', () => show(index - 1));
  document.querySelector('[data-gallery-next]').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  image.addEventListener('error', () => { error.hidden = false; });
})();
