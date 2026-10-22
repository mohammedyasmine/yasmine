/* Uppgifterna finns bara i den öppna fliken. Ingen fetch, lagring eller inskickning. */
'use strict';
(() => {
  const core = globalThis.YasmineCore, ui = globalThis.YasmineUI;
  const form = document.getElementById('inquiry-form');
  if (!core || !ui || !form) return;
  const byId = id => document.getElementById(id);
  const fields = byId('inquiry-fields'), prepareButton = byId('prepare-inquiry');
  const edit = byId('inquiry-edit'), review = byId('inquiry-review');
  const errorBox = byId('form-errors'), errorList = errorBox.querySelector('ul');
  const text = byId('inquiry-text'), draft = byId('draft-link');
  const draftStatus = byId('draft-status');
  let attempted = false;
  const read = () => Object.fromEntries(new FormData(form).entries());
  function organisationVisibility() {
    const visible = Boolean(byId('customer').value && byId('customer').value !== 'privat');
    byId('organisation-field').hidden = !visible;
    byId('organisation').disabled = !visible;
  }
  function renderErrors(errors, focus = false) {
    for (const field of form.querySelectorAll('input, select, textarea')) {
      const message = errors.find(error => error.field === field.id);
      const target = byId(`error-${field.id}`);
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      if (target) {
        target.textContent = message ? message.message : '';
        target.hidden = !message;
      }
    }
    errorList.replaceChildren();
    const shown = new Set();
    for (const error of errors) {
      if (!byId(error.field)) continue;
      if (shown.has(error.field)) continue;
      shown.add(error.field);
      const li = document.createElement('li'), link = document.createElement('a');
      link.href = `#${error.field}`;
      link.textContent = error.message;
      link.addEventListener('click', event => {
        event.preventDefault();
        byId(error.field).focus();
      });
      li.append(link);
      errorList.append(li);
    }
    errorBox.hidden = errors.length === 0;
    if (focus && errors.length) errorBox.focus();
  }
  function progress(step) {
    for (const item of document.querySelectorAll('[data-progress]')) {
      if (item.dataset.progress === String(step)) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
  }
  function prepare(event) {
    if (event) event.preventDefault();
    attempted = true;
    const result = core.compose(read());
    renderErrors(result.errors, true);
    if (result.errors.length) return;
    text.value = result.text;
    byId('mailto-length-note').hidden = Boolean(result.href);
    if (result.href) {
      draft.href = result.href;
      draft.removeAttribute('aria-disabled');
      draft.removeAttribute('tabindex');
      draft.textContent = 'Öppna SMS med förfrågan ↗';
    } else {
      draft.removeAttribute('href');
      draft.setAttribute('aria-disabled', 'true');
      draft.setAttribute('tabindex', '-1');
      draft.textContent = 'För långt för SMS-länk – kopiera texten';
    }
    draftStatus.hidden = true;
    draftStatus.textContent = '';
    edit.hidden = true;
    review.hidden = false;
    progress(2);
    review.focus();
    ui.announce('Förfrågan är sammanställd. Inget har skickats. Granska texten och skicka själv.');
  }
  form.addEventListener('submit', prepare);
  // Uppdatera synliga fel medan användaren skriver, före nästa klick.
  // Då flyttas inte granskningsknappen när sista felet försvinner vid focusout.
  form.addEventListener('input', () => {
    if (attempted) renderErrors(core.validate(read()).errors);
  });
  byId('customer').addEventListener('change', () => {
    organisationVisibility();
    if (attempted) renderErrors(core.validate(read()).errors);
  });
  form.addEventListener('focusout', event => {
    if (attempted && event.target.matches('input, select, textarea')) {
      renderErrors(core.validate(read()).errors);
    }
  });
  byId('edit-inquiry').addEventListener('click', () => {
    review.hidden = true;
    edit.hidden = false;
    progress(1);
    prepareButton.focus();
  });
  byId('copy-inquiry').addEventListener('click', event => {
    ui.copyText(text.value, event.currentTarget);
  });
  draft.addEventListener('click', event => {
    if (!draft.hasAttribute('href')) { event.preventDefault(); return; }
    draftStatus.textContent = 'Din enhet har ombetts öppna SMS till 076-852 85 12. Kontrollera texten, bifoga eventuella bilder och tryck själv på Skicka. Inget har skickats av webbplatsen.';
    draftStatus.hidden = false;
  });
  // Avsiktlig återställning vid ny laddning, utan localStorage eller cookies.
  form.reset();
  const preset = core.prefill(window.location.search);
  byId('customer').value = preset.customer;
  byId('service').value = preset.service;
  fields.disabled = false;
  organisationVisibility();
  prepareButton.disabled = false;
  document.documentElement.classList.add('form-ready');
})();