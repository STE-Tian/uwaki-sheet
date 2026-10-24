(() => {
  'use strict';
  const D = globalThis.SHEET_DATA;
  const C = globalThis.SheetCore;
  const STORAGE_KEY = 'uwaki-sheet-bilingual-v1';
  const REPOSITORY = 'https://github.com/zerobeyondlogic/uwaki-sheet';
  const root = document.getElementById('root');
  let state = C.initialState();
  let storageAvailable = true;
  let renderId = 0;
  let toastTimer;
  let previewUrls = [];
  try { state = C.normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { /* Keep a usable fresh sheet when storage is unavailable. */ }
  const queryLang = new URL(location.href).searchParams.get('lang');
  if (['zh', 'ja'].includes(queryLang)) state.lang = queryLang;
  const t = () => D.ui[state.lang];
  const q = index => D.questions[index][state.lang === 'ja' ? 0 : 1];
  const pad = n => String(n).padStart(2, '0');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const format = (text, values) => text.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
  const icon = (name, size = 17) => {
    const paths = {
      arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
      back: '<path d="M20 12H4m6 6-6-6 6-6"/>',
      reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
      grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
      single: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      save: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
      copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
      lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  };
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
  }
  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3000);
  }
  function changeView(view, index, focus = true) {
    state.view = view;
    if (Number.isInteger(index)) state.index = Math.min(39, Math.max(0, index));
    save();
    render();
    if (focus) {
      const heading = document.getElementById('view-heading');
      heading?.focus({ preventScroll: true });
      if (matchMedia('(max-width: 760px)').matches) document.getElementById('content').scrollIntoView({ block: 'start' });
    }
  }
  function continueAnswering() {
    const first = C.firstUnanswered(state);
    if (first !== -1) changeView('question', first);
    else changeView(typeof state.reflection === 'boolean' ? 'result' : 'reflection');
  }
  function header() {
    const u = t();
    const sheet = state.view === 'sheet';
    return `<header class="site-header">
      <nav class="language-switch" aria-label="语言 / 言語">
        <button id="lang-zh" lang="zh-CN" data-lang="zh" aria-pressed="${state.lang === 'zh'}">简体中文</button>
        <button id="lang-ja" lang="ja" data-lang="ja" aria-pressed="${state.lang === 'ja'}">日本語</button>
      </nav>
      <div class="header-actions"><span class="header-mark" aria-hidden="true">LOVE, WHERE'S THE LINE?</span>
        <button class="text-button" id="toggle-view">${icon(sheet ? 'single' : 'grid')}${sheet ? u.questionView : u.sheetView}</button>
        <button class="text-button" id="reset">${icon('reset', 16)}${u.reset}</button>
      </div></header>`;
  }
  function sidebar() {
    const u = t();
    const count = C.answered(state);
    const currentGroup = C.groupIndex(state.index);
    return `<aside class="sidebar">
      <div class="eyebrow">${u.eyebrow}</div>
      <h1 class="hero-title"><small>${u.titleTop}</small><span class="main-line">${u.titleMain}<span class="question-mark">?</span></span><span class="title-rule" aria-hidden="true"></span></h1>
      <p class="title-bottom">${u.titleBottom}</p>
      <p class="hero-lead multiline">${u.lead}</p><p class="hero-description multiline">${u.description}</p>
      <section class="progress-block" aria-label="${u.progress}">
        <div class="progress-caption"><span>${u.progress}</span><span><b>${pad(count)}</b><span class="total">/ 40</span></span></div>
        <div class="progress-track" role="progressbar" aria-label="${u.progress}" aria-valuemin="0" aria-valuemax="40" aria-valuenow="${count}"><div class="progress-fill" style="width:${count / 40 * 100}%"></div></div>
        <div class="nav-groups">${D.groups.map((g, i) => `<button class="group-button ${currentGroup === i && state.view !== 'intro' ? 'current' : ''}" data-jump="${g.start}"><b>0${i + 1}</b> ${g[state.lang]}</button>`).join('')}</div>
        ${state.view !== 'intro' ? `<nav class="question-map" aria-label="${u.map}">${state.answers.map((v, i) => `<button class="map-number ${v ? 'done' : ''} ${state.view === 'question' && state.index === i ? 'active' : ''}" data-jump="${i}" aria-label="${pad(i + 1)}. ${esc(q(i))} · ${v ? u.labels[v - 1] : u.unanswered}" ${state.view === 'question' && state.index === i ? 'aria-current="step"' : ''}>${pad(i + 1)}</button>`).join('')}</nav><p class="map-hint">${u.mapHint}</p>` : ''}
        <p class="save-note ${storageAvailable ? '' : 'warning'}">${icon(storageAvailable ? 'lock' : 'clock', 12)}<span>${storageAvailable ? u.saved : u.unsaved}</span></p>
      </section>
    </aside>`;
  }
  const paperTop = label => `<div class="paper-topline"><span class="crosses" aria-hidden="true">× × ×</span><span class="paper-label">${label}</span><span class="crosses" aria-hidden="true">× × ×</span></div>`;
  function intro() {
    const u = t();
    return `<section class="paper">${paperTop('RELATIONSHIP CHECK SHEET')}<div class="paper-body intro-body">
      <p class="intro-kicker">${u.introKicker}</p><h2 id="view-heading" tabindex="-1" class="intro-title multiline">${u.introTitle}</h2>
      <p class="intro-text">${u.introText}</p><div class="mini-legend">${u.labels.map((label, i) => `<div class="mini-legend-item"><span class="number">0${i + 1}</span><span>${label}</span></div>`).join('')}</div>
      <button class="button primary start-button" id="start">${C.answered(state) ? u.resume : u.start}${icon('arrow', 20)}</button>
      <p class="intro-foot">${icon('clock', 13)}${u.introFoot}</p>
    </div></section><div class="under-paper"><span>${u.note}</span><span class="tiny-cross" aria-hidden="true">♡</span></div>`;
  }
  function question() {
    const u = t();
    const i = state.index;
    const group = C.groupIndex(i);
    return `<section class="paper">${paperTop(`${pad(i + 1)} / 40`)}<div class="paper-body question-body">
      <div class="question-meta"><span class="chapter">0${group + 1} &nbsp; ${D.groups[group][state.lang]}</span><span>${u.question}</span></div>
      <div class="question-number" aria-hidden="true">${pad(i + 1)}<span>.</span></div>
      <h2 id="view-heading" tabindex="-1" class="question-text">${esc(q(i))}</h2>
      <fieldset class="choices"><legend>${esc(q(i))}</legend>${u.labels.map((label, k) => {
        const selected = state.answers[i] === k + 1;
        return `<label class="choice ${selected ? 'selected' : ''}" for="answer-${k + 1}"><input id="answer-${k + 1}" type="radio" name="answer" value="${k + 1}" ${selected ? 'checked' : ''} data-answer="${i}"><span class="check-box" aria-hidden="true">${selected ? icon('check', 17) : ''}</span><span><span class="choice-main">${label}</span><span class="choice-note">${u.choiceNotes[k]}</span></span><span class="choice-key" aria-hidden="true">${k + 1}</span></label>`;
      }).join('')}</fieldset>
      <div class="question-nav"><button id="previous" class="text-button">${icon('back', 16)}${u.previous}</button><button id="next" class="button primary next-button" ${state.answers[i] ? '' : 'disabled'}>${i === 39 ? u.toReflection : u.next}${icon('arrow', 17)}</button></div>
      <p class="choice-help">${u.chooseHint}</p>
    </div></section><div class="under-paper"><span class="keyboard-note">${u.keyboardHint}</span><span>${u.answered} ${C.answered(state)} / 40</span></div>`;
  }
  function reflectionChoices(name = 'reflection') {
    const u = t();
    return `<div class="reflection-choices">${[true, false].map((v, k) => `<label class="choice ${state.reflection === v ? 'selected' : ''}" for="${name}-${k}"><input type="radio" id="${name}-${k}" name="${name}" value="${v}" data-reflection ${state.reflection === v ? 'checked' : ''}><span class="check-box" aria-hidden="true">${state.reflection === v ? icon('check', 17) : ''}</span><span class="choice-main">${v ? u.yes : u.no}</span></label>`).join('')}</div>`;
  }
  function reflection() {
    const u = t();
    return `<section class="paper">${paperTop('ONE LAST QUESTION')}<div class="paper-body reflection-body">
      <p class="reflection-number">${u.reflectionKicker}</p><h2 id="view-heading" tabindex="-1" class="reflection-text multiline">${u.reflection}</h2><p class="reflection-note">${u.reflectionNote}</p>
      <fieldset class="choices"><legend>${u.reflection}</legend>${reflectionChoices()}</fieldset>
      <div class="question-nav"><button id="back-final" class="text-button">${icon('back', 16)}${u.previous}</button><button id="show-result" class="button primary" ${C.isComplete(state) ? '' : 'disabled'}>${u.resultButton}${icon('arrow', 16)}</button></div>
      ${C.answered(state) < 40 ? `<button class="pending-button" id="continue">${format(u.missing, { n: 40 - C.answered(state) })}</button>` : ''}
    </div></section>`;
  }
  function tableRows(g) {
    const u = t();
    return state.answers.slice(g.start, g.end).map((a, k) => {
      const i = g.start + k;
      return `<div class="table-row" role="group" aria-labelledby="row-${i}"><p class="row-text" id="row-${i}"><span class="n">${pad(i + 1)}.</span><span>${esc(q(i))}</span></p>${u.labels.map((label, n) => `<label class="table-choice ${a === n + 1 ? 'selected' : ''}" for="table-${i}-${n}"><input id="table-${i}-${n}" type="radio" name="row-${i}" value="${n + 1}" data-answer="${i}" aria-label="${pad(i + 1)}. ${esc(q(i))}：${label}" ${a === n + 1 ? 'checked' : ''}><span class="small-box" aria-hidden="true">${a === n + 1 ? '✓' : ''}</span></label>`).join('')}</div>`;
    }).join('');
  }
  function sheet() {
    const u = t();
    const count = C.answered(state);
    return `<section class="paper sheet-paper">${paperTop('ALL 40 QUESTIONS')}<div class="paper-body">
      <h2 id="view-heading" tabindex="-1" class="sheet-title">${u.sheetHeading}</h2><p class="sheet-description">${u.sheetDescription}</p>
      <div class="table-legend">${u.labels.map((label, i) => `<span>${i + 1}. ${label}</span>`).join('')}</div>
      ${D.groups.map((g, k) => `<section class="sheet-chapter" id="chapter-${k}"><h3>${pad(k + 1)} &nbsp; ${g[state.lang]}<span>${pad(g.start + 1)} — ${pad(g.end)}</span></h3><div class="table-head" aria-hidden="true"><span></span><span>1</span><span>2</span><span>3</span></div>${tableRows(g)}</section>`).join('')}
      <section class="sheet-reflection"><h3>${u.reflection.replace('\n', '')}</h3><fieldset class="choices"><legend>${u.reflection}</legend>${reflectionChoices('table-reflection')}</fieldset></section>
      <div class="sheet-action">${count < 40 ? `<button class="pending-button" id="continue">${format(u.missing, { n: 40 - count })}${icon('arrow', 14)}</button>` : `<p class="count-caption">${typeof state.reflection === 'boolean' ? u.complete : u.reflectionMissing}</p>`}<button id="show-result" class="button primary" ${C.isComplete(state) ? '' : 'disabled'}>${u.resultButton}${icon('arrow', 16)}</button></div>
    </div></section>`;
  }
  function result() {
    const u = t();
    const counts = C.counts(state);
    return `<section class="paper">${paperTop('YOUR BOUNDARIES')}<div class="paper-body result-body">
      <p class="intro-kicker">${u.resultKicker}</p><h2 id="view-heading" tabindex="-1" class="intro-title multiline">${u.resultTitle}</h2><p class="result-note">${u.resultNote}</p>
      <div class="count-cards">${counts.map((n, i) => `<div class="count-card"><strong>${n}</strong><small>${u.labels[i]}</small></div>`).join('')}</div><p class="count-caption">${u.resultCounts}</p>
      <div class="result-reflection"><span>${u.reflectionLabel}</span><strong>${state.reflection ? u.yesShort : u.noShort}</strong></div>
      <div class="result-actions"><button id="export-summary" class="button primary">${icon('save', 17)}${u.export}</button><button id="copy-result" class="button secondary">${icon('copy', 16)}${u.copy}</button></div>
      <textarea class="copy-fallback" id="copy-fallback" aria-label="${u.shareText}" readonly hidden></textarea>
      <p class="export-help">${u.exportHelp}</p><div class="export-pages">${D.groups.map((g, k) => `<div class="export-page"><img id="preview-${k}" alt="${u.savePreview} · ${format(u.sheetPage, { n: k + 1 })}" width="1500" height="2000"><button data-download="${k}">${format(u.download, { n: k + 1 })} ↓</button></div>`).join('')}</div>
      <details class="answers-details"><summary>${u.allAnswers}</summary><ol class="answer-list">${state.answers.map((a, i) => `<li><span class="n">${pad(i + 1)}</span><span class="text">${esc(q(i))}</span><button data-jump="${i}" aria-label="${u.edit} ${pad(i + 1)}">${u.shortLabels[a - 1]} ↗</button></li>`).join('')}</ol></details>
      <button class="text-button result-edit" id="edit">${icon('back', 15)}${u.edit}</button>
    </div></section>`;
  }
  function footer() {
    const u = t();
    return `<footer class="site-footer"><div><div class="footer-credits"><a href="${D.source}" target="_blank" rel="noopener noreferrer">${u.credit} ↗</a><a href="${D.design}" target="_blank" rel="noopener noreferrer">${u.designCredit} ↗</a></div><div class="footer-credits"><a href="${D.reference}" target="_blank" rel="noopener noreferrer">${u.referenceCredit} ↗</a><a href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">${u.project} ↗</a></div><p class="footer-note">${u.adaptation}</p></div><div class="footer-right"><p>${u.privacy}</p><p>${u.note}</p></div></footer>`;
  }
  function render(focusId) {
    const generation = ++renderId;
    for (const url of previewUrls) URL.revokeObjectURL(url);
    previewUrls = [];
    const u = t();
    document.documentElement.lang = u.htmlLang;
    document.title = u.pageTitle;
    document.querySelector('meta[name="description"]').content = u.introText;
    const views = { intro, question, reflection, sheet, result };
    root.innerHTML = `${header()}<div class="layout">${sidebar()}<main class="work-area" id="content">${views[state.view]()}</main></div>${footer()}`;
    document.getElementById('reset-title').textContent = u.resetTitle;
    document.getElementById('reset-description').textContent = u.resetDescription;
    document.getElementById('cancel-reset').textContent = u.cancel;
    document.getElementById('confirm-reset').textContent = u.confirm;
    bind();
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    if (state.view === 'result') {
      const snapshot = structuredClone(state);
      requestAnimationFrame(() => {
        for (let k = 0; k < 3; k++) {
          createImage(snapshot, k).then(blob => {
            if (generation !== renderId) return;
            const url = URL.createObjectURL(blob);
            previewUrls.push(url);
            document.getElementById(`preview-${k}`).src = url;
          }).catch(() => { if (generation === renderId) toast(t().exportFailed); });
        }
      });
    }
  }
  function bind() {
    root.querySelectorAll('[data-lang]').forEach(button => button.onclick = () => {
      const y = scrollY;
      state.lang = button.dataset.lang;
      clearTimeout(toastTimer);
      document.getElementById('toast').classList.remove('show');
      save();
      try { const url = new URL(location.href); url.searchParams.set('lang', state.lang); history.replaceState(null, '', url); } catch { /* file previews need no history support */ }
      render(`lang-${state.lang}`);
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    root.querySelectorAll('[data-jump]').forEach(button => button.onclick = () => changeView('question', Number(button.dataset.jump)));
    root.querySelectorAll('[data-answer]').forEach(input => input.onchange = () => {
      const y = scrollY;
      state.answers[Number(input.dataset.answer)] = Number(input.value);
      save();
      render(input.id);
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    root.querySelectorAll('[data-reflection]').forEach(input => input.onchange = () => {
      const y = scrollY;
      state.reflection = input.value === 'true';
      save();
      render(input.id);
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    const click = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    click('start', continueAnswering);
    click('continue', continueAnswering);
    click('toggle-view', () => {
      if (state.view === 'sheet') changeView('question', state.index);
      else changeView('sheet');
    });
    click('previous', () => state.index === 0 ? changeView('intro') : changeView('question', state.index - 1));
    click('next', next);
    click('back-final', () => changeView('question', 39));
    click('show-result', () => { if (C.isComplete(state)) changeView('result'); });
    click('edit', () => changeView('sheet'));
    click('reset', () => document.getElementById('reset-dialog').showModal());
    click('export-summary', () => downloadImage(null));
    click('copy-result', copyResult);
    root.querySelectorAll('[data-download]').forEach(button => button.onclick = () => downloadImage(Number(button.dataset.download)));
  }
  function next() {
    if (!state.answers[state.index]) return;
    changeView(state.index === 39 ? 'reflection' : 'question', state.index + 1);
  }
  document.getElementById('cancel-reset').onclick = () => document.getElementById('reset-dialog').close();
  document.getElementById('confirm-reset').onclick = () => {
    const lang = state.lang;
    state = { ...C.initialState(), lang };
    save();
    document.getElementById('reset-dialog').close();
    render('start');
    toast(t().resetDone);
  };
  document.addEventListener('keydown', event => {
    if (document.getElementById('reset-dialog').open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (state.view !== 'question') return;
    if (/TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (['1', '2', '3'].includes(event.key)) {
      event.preventDefault();
      state.answers[state.index] = Number(event.key);
      save();
      render(`answer-${event.key}`);
    } else if (event.key === 'Enter' && ['INPUT', 'BODY', 'H2'].includes(event.target.tagName)) {
      event.preventDefault();
      next();
    } else if (['ArrowRight', 'ArrowLeft'].includes(event.key) && event.target.tagName !== 'INPUT') {
      event.preventDefault();
      if (event.key === 'ArrowRight') next();
      else if (state.index > 0) changeView('question', state.index - 1);
    }
  });
  function shareText() {
    const u = t();
    const url = new URL(location.href);
    url.search = `?lang=${state.lang}`;
    url.hash = '';
    return [u.shareText, ...C.counts(state).map((n, i) => format(u.shareCount, { label: u.labels[i], n })), `${u.reflectionLabel}${state.reflection ? u.yesShort : u.noShort}`, u.footerLine, url.protocol.startsWith('http') ? url.href : 'https://zerobeyondlogic.github.io/uwaki-sheet/'].join('\n');
  }
  async function copyResult() {
    const text = shareText();
    try { await navigator.clipboard.writeText(text); toast(t().copied); }
    catch {
      const fallback = document.getElementById('copy-fallback');
      fallback.hidden = false;
      fallback.value = text;
      fallback.focus();
      fallback.select();
      toast(t().copyFailed);
    }
  }
  /* All export text is drawn locally; no font, CDN, screenshot service or image upload is needed. */
  const fontStack = lang => lang === 'ja' ? '"Yu Gothic","Meiryo",sans-serif' : '"Microsoft YaHei","PingFang SC",sans-serif';
  function canvasText(g, text, x, y, width, fontSize, { weight = 600, color = '#d81b81', lineHeight = 1.65, align = 'left', minSize = fontSize, maxLines = 3 } = {}) {
    let lines;
    let size = fontSize;
    do {
      g.font = `${weight} ${size}px ${g.canvas.dataset.font}`;
      lines = [];
      let line = '';
      for (const ch of String(text)) {
        if (ch === '\n') { lines.push(line); line = ''; }
        else if (line && g.measureText(line + ch).width > width) { lines.push(line); line = ch; }
        else line += ch;
      }
      if (line) lines.push(line);
      if (lines.length <= maxLines || size <= minSize) break;
      size -= 1;
    } while (true);
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = 'top';
    lines.forEach((line, k) => g.fillText(line, x, y + k * size * lineHeight));
    return lines.length * size * lineHeight;
  }
  function line(g, x1, y1, x2, y2, color = '#ed3aa0', width = 3) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function check(g, x, y, size) {
    g.beginPath(); g.moveTo(x + size * .16, y + size * .51); g.lineTo(x + size * .4, y + size * .78); g.lineTo(x + size * .87, y + size * .15); g.strokeStyle = '#43313d'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function drawSheet(s, page) {
    const u = D.ui[s.lang];
    const group = D.groups[page];
    const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 2000; cv.dataset.font = fontStack(s.lang);
    const g = cv.getContext('2d');
    g.fillStyle = '#f3f1f2'; g.fillRect(0, 0, 1500, 2000);
    canvasText(g, '× × × ×', 72, 44, 330, 48, { weight: 700 });
    canvasText(g, '× × × ×', 1428, 44, 330, 48, { weight: 700, align: 'right' });
    g.fillStyle = '#e83399'; g.beginPath(); g.roundRect(490, 48, 520, 54, 27); g.fill();
    canvasText(g, `${page + 1} / 3`, 750, 59, 450, 27, { color: 'white', align: 'center', lineHeight: 1 });
    line(g, 57, 157, 57, 1860, '#ed3aa0', 13); line(g, 1443, 157, 1443, 1860, '#ed3aa0', 13);
    canvasText(g, u.sheetHeading, 750, 157, 1250, 65, { weight: 800, align: 'center', minSize: 54, maxLines: 1 });
    canvasText(g, `${pad(page + 1)}  ${group[s.lang]}`, 140, 263, 1200, 25, { weight: 600 });
    g.fillStyle = '#e83399'; g.fillRect(135, 317, 1230, 55);
    u.labels.forEach((label, k) => canvasText(g, `${k + 1}. ${label}`, [167, 490, 1030][k], 331, [300, 525, 300][k], 24, { color: 'white', weight: 700 }));
    const cols = [1120, 1215, 1310];
    cols.forEach((x, k) => canvasText(g, k + 1, x, 399, 70, 38, { align: 'center', weight: 800 }));
    const top = 465;
    const rowHeight = 96;
    for (let i = group.start; i < group.end; i++) {
      const row = i - group.start;
      const cy = top + row * rowHeight;
      canvasText(g, `${pad(i + 1)}.`, 140, cy + 5, 100, 43, { weight: 800 });
      const text = D.questions[i][s.lang === 'ja' ? 0 : 1];
      const nLines = canvasText(g, text, 247, cy + 6, 785, 27, { weight: 650, lineHeight: 1.5, minSize: 22, maxLines: 2 });
      if (nLines > rowHeight - 12) throw new Error(`Export text overflows at question ${i + 1}`);
      cols.forEach((x, k) => {
        g.strokeStyle = '#e83399'; g.lineWidth = 3.5; g.strokeRect(x - 24, cy + 5, 48, 48);
        if (s.answers[i] === k + 1) check(g, x - 24, cy + 5, 48);
      });
      line(g, 135, cy + rowHeight - 13, 1365, cy + rowHeight - 13, '#ed3aa0', 2);
    }
    if (page === 2) {
      canvasText(g, u.reflectionLabel, 140, 1726, 1000, 30, { maxLines: 2 });
      canvasText(g, s.reflection ? u.yesShort : u.noShort, 1315, 1726, 180, 35, { align: 'right', weight: 800 });
      line(g, 135, 1790, 1365, 1790);
    }
    canvasText(g, u.footerLine, 750, 1890, 1300, 19, { align: 'center', color: '#806e78' });
    canvasText(g, 'zerobeyondlogic.github.io/uwaki-sheet', 750, 1930, 1300, 17, { align: 'center', color: '#806e78' });
    return cv;
  }
  function drawSummary(s) {
    const u = D.ui[s.lang];
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1330; cv.dataset.font = fontStack(s.lang);
    const g = cv.getContext('2d');
    g.fillStyle = '#f7f5f2'; g.fillRect(0, 0, 1200, 1330);
    line(g, 50, 60, 1150, 60, '#ed3aa0', 7);
    canvasText(g, u.pageTitle, 75, 97, 1050, 29, { weight: 700 });
    canvasText(g, '× × ×', 1125, 92, 300, 36, { align: 'right' });
    canvasText(g, u.summaryHeading, 75, 188, 1050, 67, { weight: 800 });
    canvasText(g, u.resultNote, 75, 299, 1050, 24, { color: '#806e78', lineHeight: 1.7, maxLines: 2 });
    const counts = C.counts(s);
    counts.forEach((n, k) => {
      const x = 75 + k * 357;
      g.fillStyle = k === 0 ? '#d81b81' : '#fde8f1'; g.fillRect(x, 410, 336, 203);
      canvasText(g, n, x + 168, 432, 310, 88, { color: k === 0 ? 'white' : '#d81b81', align: 'center', weight: 800 });
      canvasText(g, u.labels[k], x + 168, 552, 310, 20, { color: k === 0 ? 'white' : '#d81b81', align: 'center', minSize: 17, maxLines: 1 });
    });
    canvasText(g, u.resultCounts, 75, 658, 1050, 24, { color: '#806e78' });
    for (let i = 0; i < 40; i++) {
      const x = 75 + i % 10 * 108;
      const y = 724 + Math.floor(i / 10) * 84;
      const a = s.answers[i];
      g.fillStyle = a === 1 ? '#d81b81' : a === 2 ? '#f7cde2' : '#fffdfb';
      g.fillRect(x, y, 79, 62); g.strokeStyle = '#dfa5c2'; g.lineWidth = 1.5; g.strokeRect(x, y, 79, 62);
      canvasText(g, pad(i + 1), x + 39.5, y + 15, 70, 25, { color: a === 1 ? 'white' : '#8e466a', align: 'center', weight: 700 });
    }
    line(g, 75, 1085, 1125, 1085, '#eadce3', 2);
    canvasText(g, u.reflectionLabel, 75, 1117, 850, 23, { color: '#352831', maxLines: 2 });
    canvasText(g, s.reflection ? u.yesShort : u.noShort, 1125, 1114, 180, 30, { align: 'right', weight: 800 });
    canvasText(g, u.footerLine, 600, 1223, 1050, 20, { align: 'center', color: '#806e78' });
    canvasText(g, 'zerobeyondlogic.github.io/uwaki-sheet', 600, 1267, 1050, 18, { align: 'center', color: '#806e78' });
    return cv;
  }
  function createImage(snapshot, page) {
    return new Promise((resolve, reject) => {
      try {
        const cv = page === null ? drawSummary(snapshot) : drawSheet(snapshot, page);
        cv.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), 'image/png');
      } catch (error) { reject(error); }
    });
  }
  async function downloadImage(page) {
    const snapshot = structuredClone(state);
    try {
      const blob = await createImage(snapshot, page);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uwaki-sheet-${snapshot.lang}-${page === null ? 'result' : `page-${page + 1}`}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast(t().exportDone);
    } catch (error) { console.error('Image export failed', error); toast(t().exportFailed); }
  }
  save();
  render();
})();
