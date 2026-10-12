/* Общие функции: работа с базой Supabase, форматирование. */
(function () {
  const C = window.CFG;

  function headers(extra) {
    return Object.assign({
      apikey: C.key,
      Authorization: 'Bearer ' + C.key,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  async function req(method, path, body, prefer) {
    const opts = { method, headers: headers(prefer ? { Prefer: prefer } : null) };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${C.url}/rest/v1/${path}`, opts);
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${res.status} ${t}`);
    }
    if (res.status === 204) return null;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  const DB = {
    async state() {
      const rows = await req('GET', 'inv_state?id=eq.1&select=*');
      return rows && rows[0] ? rows[0] : { stage: 'brief', inject1: false, inject2: false, timer_end: null, screen: 'board' };
    },
    setState(patch) {
      return req('PATCH', 'inv_state?id=eq.1', Object.assign({ updated_at: new Date().toISOString() }, patch), 'return=minimal');
    },
    cards() {
      return req('GET', 'inv_cards?select=*&order=day.asc,minutes.asc,id.asc');
    },
    addCard(card) {
      return req('POST', 'inv_cards', card, 'return=minimal');
    },
    setCardStatus(id, status) {
      return req('PATCH', `inv_cards?id=eq.${id}`, { status }, 'return=minimal');
    },
    answers(team) {
      return req('GET', team ? `inv_answers?select=*&team=eq.${team}` : 'inv_answers?select=*&order=team.asc');
    },
    saveAnswer(team, kind, body) {
      return req('POST', 'inv_answers?on_conflict=team,kind',
        { team, kind, body, updated_at: new Date().toISOString() },
        'return=minimal,resolution=merge-duplicates');
    },
    async resetAll() {
      await req('DELETE', 'inv_cards?id=gte.0', undefined, 'return=minimal');
      await req('DELETE', 'inv_answers?id=gte.0', undefined, 'return=minimal');
      await DB.setState({ stage: 'brief', inject1: false, inject2: false, timer_end: null, screen: 'board' });
    }
  };

  const STAGES = [
    { k: 'brief', l: 'Брифинг' },
    { k: 'evidence', l: 'Этап 1. Улики' },
    { k: 'assembly', l: 'Этап 2. Сборка' },
    { k: 'report', l: 'Этап 3. Отчет' },
    { k: 'final', l: 'Финал' }
  ];
  const stageIdx = k => Math.max(0, STAGES.findIndex(s => s.k === k));
  const stageLabel = k => (STAGES.find(s => s.k === k) || STAGES[0]).l;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const nl2br = s => esc(s).replace(/\n/g, '<br>');

  function day(v) { return window.CASE.days.find(d => d.v === v) || { s: '?', l: '?' }; }
  function hhmm(min) {
    if (min == null || isNaN(min)) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function toMin(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
    return m && +m[1] < 24 && +m[2] < 60 ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function team(id) { return window.CASE.teams.find(t => t.id === +id); }
  function when(d, t, date) {
    const dd = day(d);
    return (date ? date : dd.s) + (t ? ', ' + t : '');
  }

  function timerLeft(state) {
    if (!state || !state.timer_end) return null;
    const ms = new Date(state.timer_end).getTime() - Date.now();
    return Math.max(0, Math.round(ms / 1000));
  }
  function fmtLeft(sec) {
    if (sec == null) return '';
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function poll(fn, ms) {
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try { await fn(); setNet(true); } catch (e) { console.error(e); setNet(false); }
      busy = false;
    };
    run();
    return setInterval(run, ms);
  }

  function setNet(ok) {
    let el = document.getElementById('net');
    if (!el) {
      el = document.createElement('div');
      el.id = 'net';
      el.className = 'net';
      el.textContent = 'Нет связи с сервером. Пробуем снова…';
      document.body.appendChild(el);
    }
    el.classList.toggle('show', !ok);
  }

  function configOk() {
    if (!C || !C.url || !C.key) {
      document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Не заполнен файл config.js (адрес и ключ Supabase).</p>';
      return false;
    }
    return true;
  }

  window.U = { DB, STAGES, stageIdx, stageLabel, esc, nl2br, day, hhmm, toMin, team, when, timerLeft, fmtLeft, poll, configOk };
})();
