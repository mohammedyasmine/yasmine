/* Presentationsfilmer utan synliga spelarreglage.
   Originalfilerna bevaras. Video som visas i en webbläsare kan fortfarande kopieras. */
'use strict';
(() => {
  const shells = Array.from(document.querySelectorAll('[data-video]'));
  if (!shells.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const observed = 'IntersectionObserver' in window;
  const players = [];
  const saveData = () => Boolean(connection && connection.saveData);
  const eligible = state => state.visible && !document.hidden && !motion.matches && !saveData() && !state.failed;

  function silence(film) {
    if (!film.muted) film.muted = true;
    film.defaultMuted = true;
    if (film.volume !== 0) film.volume = 0;
  }
  function pause(state) {
    state.request += 1;
    state.pending = false;
    state.film.autoplay = false;
    state.film.pause();
    state.shell.classList.remove('is-playing');
  }
  function load(state) {
    if (state.loaded) return;
    if (state.source && !state.source.hasAttribute('src')) {
      state.source.setAttribute('src', state.source.dataset.src);
    }
    state.loaded = true;
    state.film.load();
  }
  async function start(state) {
    if (!eligible(state) || state.pending || (!state.film.paused && !state.film.ended)) return;
    state.pending = true;
    const request = ++state.request;
    silence(state.film);
    state.film.autoplay = true;
    try {
      load(state);
      await state.film.play();
      // En sen play()-upplösning får inte återstarta video i en dold flik.
      if (request !== state.request || !eligible(state)) {
        state.film.pause();
        return;
      }
      state.pending = false;
      state.shell.classList.add('is-playing');
    } catch (error) {
      if (request !== state.request) return;
      state.pending = false;
      state.failed = true;
      state.film.autoplay = false;
      state.shell.classList.remove('is-playing');
      state.shell.classList.add('is-static');
      // Behåll stillbilden. Inga reglage, originalfilslänkar eller retry-loopar.
    }
  }
  function sync(state) {
    if (eligible(state)) start(state);
    else pause(state);
  }

  for (const shell of shells) {
    const film = shell.querySelector('video');
    if (!film) continue;
    const source = film.querySelector('source');
    if (!(source && (source.dataset.src || source.getAttribute('src'))) && !film.getAttribute('src')) continue;
    const state = { shell, film, source, visible: !observed,
      loaded: Boolean(film.getAttribute('src') || (source && source.getAttribute('src'))),
      pending: false, request: 0, failed: false };
    film.autoplay = false;
    film.removeAttribute('autoplay');
    film.controls = false;
    film.removeAttribute('controls');
    film.loop = true;
    film.playsInline = true;
    film.disablePictureInPicture = true;
    film.disableRemotePlayback = true;
    film.setAttribute('playsinline', '');
    film.setAttribute('loop', '');
    film.setAttribute('tabindex', '-1');
    film.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
    film.setAttribute('disablepictureinpicture', '');
    film.setAttribute('disableremoteplayback', '');
    silence(film);
    const preventContextMenu = event => event.preventDefault();
    film.addEventListener('contextmenu', preventContextMenu);
    const stage = film.closest('.video-stage');
    if (stage && stage !== film) stage.addEventListener('contextmenu', preventContextMenu);
    film.addEventListener('play', () => {
      if (!eligible(state)) pause(state);
    });
    film.addEventListener('playing', () => {
      if (eligible(state)) shell.classList.add('is-playing');
      else pause(state);
    });
    film.addEventListener('pause', () => shell.classList.remove('is-playing'));
    film.addEventListener('volumechange', () => silence(film));
    film.addEventListener('error', () => {
      state.failed = true;
      pause(state);
      shell.classList.add('is-static');
    });
    players.push(state);
  }

  if (observed) {
    const observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        const state = players.find(player => player.film === entry.target);
        if (!state) continue;
        state.visible = entry.isIntersecting && entry.intersectionRatio >= .15;
        sync(state);
      }
    }, { threshold: [0, .15] });
    for (const state of players) observer.observe(state.film);
  } else {
    for (const state of players) sync(state);
  }
  const syncAll = () => { for (const state of players) sync(state); };
  document.addEventListener('visibilitychange', syncAll);
  if (motion.addEventListener) motion.addEventListener('change', syncAll);
  else if (motion.addListener) motion.addListener(syncAll);
  if (connection && connection.addEventListener) connection.addEventListener('change', syncAll);
})();
