/* Progressiv förbättring: läsning, länkar och FAQ fungerar utan JavaScript. */
'use strict';
(() => {
  const root = document.documentElement;
  const status = document.getElementById('site-status');
  const lastFocus = new WeakMap();
  const copyTimers = new WeakMap();
  function announce(message) {
    if (status) status.textContent = message;
  }
  function openModal(dialog, opener = document.activeElement) {
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    lastFocus.set(dialog, opener);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('has-modal');
    return true;
  }
  function registerModal(dialog) {
    if (!dialog) return;
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('has-modal');
      const opener = lastFocus.get(dialog);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  function feedback(button) {
    if (!button) return;
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
    clearTimeout(copyTimers.get(button));
    button.textContent = 'Kopierat';
    copyTimers.set(button, setTimeout(() => {
      button.textContent = button.dataset.originalLabel;
    }, 2600));
  }
  const copyDialog = document.getElementById('copy-dialog');
  const copyArea = document.getElementById('manual-copy');
  registerModal(copyDialog);
  for (const button of document.querySelectorAll('[data-close-copy]')) {
    button.addEventListener('click', () => copyDialog.close());
  }
  async function copyText(text, opener) {
    if (opener) opener.disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      feedback(opener);
      announce('Texten har kopierats till urklipp. Inget meddelande har skickats.');
      return true;
    } catch {
      if (copyArea) copyArea.value = text;
      if (openModal(copyDialog, opener)) {
        copyArea.focus();
        copyArea.select();
        announce('Automatisk kopiering gick inte. Texten kan kopieras manuellt i rutan.');
      } else {
        // Endast för äldre webbläsare utan dialogstöd. Ingen sändning sker.
        window.prompt('Kopiera texten nedan. Inget har skickats.', text);
      }
      return false;
    } finally {
      if (opener) opener.disabled = false;
    }
  }
  for (const button of document.querySelectorAll('[data-copy-value]')) {
    button.addEventListener('click', () => copyText(button.dataset.copyValue, button));
  }
  root.classList.add('copy-ready');

  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (menu && nav) {
    const compact = window.matchMedia('(max-width: 70rem)');
    const setMenu = (open, restore = false) => {
      nav.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      if (restore && compact.matches) menu.focus();
    };
    menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && compact.matches && !document.querySelector('dialog[open]') &&
          menu.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        setMenu(false, true);
      }
    });
    nav.addEventListener('click', event => {
      if (compact.matches && event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', event => {
      if (compact.matches && !nav.contains(event.target) && !menu.contains(event.target)) setMenu(false);
    });
    const resized = () => {
      if (!compact.matches) setMenu(false);
    };
    if (compact.addEventListener) compact.addEventListener('change', resized);
    else if (compact.addListener) compact.addListener(resized);
    setMenu(false);
    root.classList.add('nav-ready');
  }
  globalThis.YasmineUI = Object.freeze({ announce, copyText, openModal, registerModal });
})();
