/* Gemensam, DOM-oberoende logik. Kan testas med Nodes inbyggda testverktyg. */
'use strict';
(() => {
  const EMAIL = 'yasminesavfall@gmail.com';
  const PHONE = '+46768528512';
  const MAX_MAILTO = 1900; // Conservatively limit pre-filled SMS length
  const customers = Object.freeze({
    privat: 'Privatperson', kommun: 'Kommunal beställare',
    forvaltare: 'Förvaltare / fastighetsägare', brf: 'Bostadsrättsförening',
    foretag: 'Företag'
  });
  const services = Object.freeze({
    tradgardsavfall: 'Ris, grenar & trädgårdsavfall', mobler: 'Möbler & skrymmande avfall',
    rojning: 'Tömning av förråd & lokaler', slyrojning: 'Slyröjning & större markområden', bostad: 'Bostad & dödsbo',
    'mindre-trad': 'Trädfällning med bortforsling', fastighet: 'Företag & fastighet',
    osaker: 'Flera tjänster / jag är osäker'
  });
  const limits = Object.freeze({ organisation: 120, place: 80, amount: 120,
    description: 1200, access: 280, timing: 100, name: 100, email: 254, phone: 32 });
  const labels = Object.freeze({ organisation: 'Organisation', place: 'Ort / plats',
    amount: 'Mängd', description: 'Beskrivning', access: 'Tillgänglighet',
    timing: 'Önskad tid', name: 'Namn', email: 'E-post', phone: 'Telefon' });
  const own = (map, key) => Object.prototype.hasOwnProperty.call(map, key);
  function clean(value, multiline = false) {
    const text = String(value ?? '').replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
    return multiline ? text : text.replace(/\s+/g, ' ');
  }
  function normalize(raw = {}) {
    const result = { customer: clean(raw.customer), service: clean(raw.service) };
    for (const field of Object.keys(limits)) {
      result[field] = clean(raw[field], field === 'description' || field === 'access');
    }
    if (result.customer === 'privat') result.organisation = '';
    return result;
  }
  function validate(raw) {
    const data = normalize(raw), errors = [];
    const add = (field, message) => errors.push({ field, message });
    if (!own(customers, data.customer)) add('customer', 'Välj vilken kundtyp du kontaktar oss som.');
    if (!own(services, data.service)) add('service', 'Välj en tjänst, eller välj att du är osäker.');
    if (data.place.length < 2) add('place', 'Ange ort eller plats för uppdraget.');
    if (data.description.length < 20) add('description', 'Beskriv uppdraget med minst 20 tecken.');
    if (data.name.length < 2) add('name', 'Ange namn eller kontaktperson med minst 2 tecken.');
    if (!data.email && !data.phone) {
      add('email', 'Ange minst en kontaktväg: e-post eller telefon.');
      add('phone', 'Ange ett telefonnummer där vi kan nå dig.');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(data.email)) {
      add('email', 'Kontrollera e-postadressen, till exempel namn@exempel.se.');
    }
    if (data.phone) {
      const digits = data.phone.replace(/\D/g, '');
      if (!/^\+?[0-9 ()\-.]+$/.test(data.phone) || digits.length < 7 || digits.length > 15) {
        add('phone', 'Ange ett telefonnummer med 7–15 siffror. +, mellanslag och bindestreck går bra.');
      }
    }
    for (const [field, max] of Object.entries(limits)) {
      if (data[field].length > max) add(field, `${labels[field]} får innehålla högst ${max} tecken.`);
    }
    return { data, errors };
  }
  function prefill(search = '') {
    const params = new URLSearchParams(search);
    const customer = params.get('kund'), service = params.get('tjanst');
    return { customer: own(customers, customer) ? customer : '',
      service: own(services, service) ? service : '' };
  }
  function compose(raw) {
    const { data, errors } = validate(raw);
    if (errors.length) return { errors, data, text: '', href: null };
    const lines = ['OFFERTFÖRFRÅGAN', '',
      `Kundtyp: ${customers[data.customer]}`];
    if (data.organisation) lines.push(`Organisation: ${data.organisation}`);
    lines.push(`Tjänst: ${services[data.service]}`, `Ort / plats: ${data.place}`);
    if (data.amount) lines.push(`Ungefärlig mängd: ${data.amount}`);
    lines.push('', 'UPPDRAGET', data.description);
    if (data.access) lines.push('', 'TILLGÄNGLIGHET PÅ PLATSEN', data.access);
    if (data.timing) lines.push('', `Önskad tid / period: ${data.timing}`);
    lines.push('', 'KONTAKTPERSON', `Namn: ${data.name}`);
    if (data.email) lines.push(`E-post: ${data.email}`);
    if (data.phone) lines.push(`Telefon: ${data.phone}`);
    lines.push('', 'Jag bifogar själv eventuella bilder i mitt SMS.',
      'Detta är en förfrågan, inte en bokning. Omfattning, pris och tid stäms av separat.');
    const text = lines.join('\n');
    const subject = `Förfrågan: ${services[data.service]} – ${data.place}`;
    const candidate = `sms:${PHONE}?body=${encodeURIComponent(text)}`;
    return { errors: [], data, text, subject,
      href: candidate.length <= MAX_MAILTO ? candidate : null,
      mailtoLength: candidate.length };
  }
  function wrapIndex(index, size) {
    return size > 0 ? ((index % size) + size) % size : 0;
  }
  const api = Object.freeze({ EMAIL, PHONE, MAX_MAILTO, customers, services, limits,
    clean, normalize, validate, prefill, compose, wrapIndex });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.YasmineCore = api;
})();
