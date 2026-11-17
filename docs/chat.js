// Chat frame: Wix's chat widget look, but messages (and attached files) are delivered by e-mail through
// FormSubmit. Visitors type a message, then leave name and e-mail address so the reply can go out by mail.
(() => {
  // FormSubmit form address (the random alias FormSubmit issues after activation hides the e-mail address).
  const ENDPOINT = 'https://formsubmit.co/ebb785655ca7752608875f93baf10b2e'; // test: fdraexler@gmail.com
  const fileField = (i) => (i === 0 ? 'attachment' : 'attachment' + (i + 1));
  const MAX_FILES_BYTES = 10 * 1024 * 1024; // FormSubmit's limit for all attachments of one e-mail
  const ACCENT = 'rgb(235, 186, 77)';
  const FONT = 'lato-light, HelveticaNeueW01-45Ligh';
  const variant = document.documentElement.dataset.variant;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const widget = $('[data-hook="chat-widget"]');
  const expanded = $('[data-hook="input-wrapper"]');
  const minimized = $('[data-hook="minimized-chat-wrapper"]');
  const list = $('#chat-messages-list');
  const input = $('[data-hook="input"]');
  const post = (msg) => parent.postMessage(msg, '*');

  // The captured open state still carries the focus ring of the live session.
  document.querySelectorAll('.focus-visible').forEach((el) => {
    el.classList.remove('focus-visible');
    el.removeAttribute('data-focus-visible-added');
  });

  // Desktop: minimized button <-> open panel (370x610). Like Wix, the closed frame is sized to the button as
  // rendered here (its right edge plus 20px of shadow room; 276x66 with Wix's fonts on Chrome/Linux).
  function closedSize() {
    const r = $('[data-hook="minimized-chat"]').getBoundingClientRect();
    return { type: 'chat-size', width: r.right + 20, height: r.bottom };
  }
  function setOpen(open) {
    if (variant === 'mobile') {
      if (!open) post({ type: 'chat-close' });
      return;
    }
    widget.classList.toggle('+6uur', open);
    expanded.style.display = open ? '' : 'none';
    minimized.style.display = open ? 'none' : '';
    post(open ? { type: 'chat-size', width: 370, height: 610 } : closedSize());
    if (open) focusRing(input);
  }
  // Wix focuses the input (desktop) or the close button (mobile) on opening, with its keyboard-focus ring.
  function focusRing(el) {
    el.classList.add('focus-visible');
    el.setAttribute('data-focus-visible-added', '');
    el.addEventListener('blur', () => {
      el.classList.remove('focus-visible');
      el.removeAttribute('data-focus-visible-added');
    }, { once: true });
    el.focus();
  }
  $('[data-hook="minimized-chat"]')?.addEventListener('click', () => setOpen(true));
  $('[data-hook="close-button"]').addEventListener('click', () => setOpen(false));
  addEventListener('message', (e) => { if (e.data?.type === 'chat-open') focusRing($('[data-hook="close-button"]')); });
  if (variant !== 'mobile') {
    setOpen(false);
    document.fonts.ready.then(() => { if (!widget.classList.contains('+6uur')) post(closedSize()); });
  }

  // ---------- delivery ----------
  // FormSubmit only forwards attachments from a classic multipart form post (not from fetch), so the e-mail is
  // posted as a real form into a hidden frame. FormSubmit then redirects that frame to ../chat-sent.html on this
  // site; reaching it (same origin) confirms delivery. Anything else (error or captcha page) counts as failure.
  function deliver(fields) {
    return new Promise((resolve, reject) => {
      const name = 'deliver-' + Date.now();
      const frame = Object.assign(document.createElement('iframe'), { name, hidden: true });
      const form = Object.assign(document.createElement('form'), {
        action: ENDPOINT, method: 'POST', enctype: 'multipart/form-data', target: name, hidden: true,
      });
      const add = (n, v) => form.append(Object.assign(document.createElement('input'), { type: 'hidden', name: n, value: v }));
      Object.entries(fields).forEach(([n, v]) => add(n, v));
      add('_next', new URL('../chat-sent.html', location.href).href);
      files.forEach((f, i) => {
        const input = Object.assign(document.createElement('input'), { type: 'file', name: fileField(i) });
        const dt = new DataTransfer();
        dt.items.add(f);
        input.files = dt.files;
        form.append(input);
      });
      const timer = setTimeout(() => done(false), 60000);
      function done(ok) {
        clearTimeout(timer);
        frame.remove();
        form.remove();
        ok ? resolve() : reject(new Error('delivery failed'));
      }
      frame.addEventListener('load', () => {
        let here = '';
        try { here = frame.contentWindow.location.pathname; } catch (e) { /* cross-origin: FormSubmit page */ }
        if (here.endsWith('/chat-sent.html')) done(true);
        else if (here !== 'blank') setTimeout(() => done(false), 0);
      });
      document.body.append(frame, form);
      form.submit();
    });
  }

  // ---------- conversation ----------
  const messages = [];
  const files = [];
  let contactAsked = false;
  let sent = false;

  function bubble(content, mine) {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'};margin-top:12px;`;
    const b = document.createElement('div');
    b.style.cssText = `max-width:80%;padding:10px 14px;border-radius:8px;font-family:${FONT};font-size:15px;line-height:1.4;` +
      `white-space:pre-wrap;word-wrap:break-word;${mine ? `background:${ACCENT};color:#fff;` : 'background:#fff;color:#000;'}`;
    if (typeof content === 'string') b.textContent = content; else b.append(content);
    row.append(b);
    list.append(row);
    list.scrollTop = list.scrollHeight;
    return b;
  }

  function askContact() {
    contactAsked = true;
    const form = document.createElement('form');
    form.innerHTML =
      '<div style="margin-bottom:8px">Danke für Ihre Nachricht! Wie können wir Ihnen antworten?</div>' +
      '<input name="name" required placeholder="Name" autocomplete="name">' +
      '<input name="email" type="email" required placeholder="E-Mail" autocomplete="email">' +
      '<input name="_honey" type="text" tabindex="-1" autocomplete="off" style="display:none">' +
      '<button type="submit">Senden</button>';
    for (const el of form.querySelectorAll('input:not([name=_honey])')) {
      el.style.cssText = `display:block;width:100%;box-sizing:border-box;margin:0 0 8px;padding:8px 10px;border:1px solid #e8e6e6;border-radius:6px;font:inherit;font-size:15px;`;
    }
    const btn = form.querySelector('button');
    btn.style.cssText = `width:100%;padding:9px;border:0;border-radius:6px;background:${ACCENT};color:#fff;font:inherit;font-size:15px;cursor:pointer;`;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Wird gesendet …';
      const data = Object.fromEntries(new FormData(form));
      try {
        await deliver({
          _subject: 'Chat-Nachricht über papier-restaurierung.at',
          _template: 'table',
          _captcha: 'false',
          _replyto: data.email,
          _honey: data._honey || '',
          Name: data.name,
          'E-Mail': data.email,
          Nachricht: messages.join('\n\n') || '(nur Anhang)',
        });
        sent = true;
        form.closest('div[style*="flex"]').remove();
        bubble(`Vielen Dank, ${data.name}! Ihre Nachricht ist angekommen – wir antworten so schnell wie möglich per E-Mail.`, false);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Senden';
        bubble('Die Nachricht konnte leider nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie an office@papier-restaurierung.at.', false);
      }
    });
    bubble(form, false);
    form.querySelector('input').focus();
  }

  function submitMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '24px';
    updateSendButton();
    bubble(text, true);
    startNewIfSent();
    messages.push(text);
    if (!contactAsked) askContact();
  }
  function startNewIfSent() { // a further message after delivery starts a new e-mail
    if (!sent) return;
    messages.length = 0;
    files.length = 0;
    sent = false;
    contactAsked = false;
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(); }
  });
  // Grow the textarea with its content, like the Wix widget (one line = 24px, at most 4 lines).
  input.addEventListener('input', () => {
    input.style.height = '24px';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    updateSendButton();
  });
  // While the input holds text, Wix replaces the paperclip with a send arrow.
  const attachBtn = $('[data-hook="attachment-button"]');
  const sendBtn = $('#send-button').content.firstElementChild.cloneNode(true);
  sendBtn.addEventListener('click', () => { submitMessage(); input.focus(); });
  function updateSendButton() {
    const typing = input.value.trim() !== '';
    if (typing && attachBtn.isConnected) attachBtn.replaceWith(sendBtn);
    if (!typing && sendBtn.isConnected) sendBtn.replaceWith(attachBtn);
  }

  // ---------- emoji picker (Wix's, desktop only) ----------
  // Picker, category panels and the "open" icon are Wix markup kept in <template>s (see tools/build.py).
  const emojiBtn = $('[data-hook="emoji-keyboard"]');
  const keyboards = $('[data-hook="input-keyboards"]');
  const tpl = (id) => $('#' + id)?.content;
  if (emojiBtn && tpl('emoji-picker')) {
    const iconHolder = $('[data-hook="emoji-button-style"]', emojiBtn);
    const closedIcon = iconHolder.innerHTML;
    const openIcon = $('#emoji-icon-open').innerHTML;
    const SELECTED = '_0t1nU';
    function showCategory(i) {
      $$('[data-hook="emoji-category"]', keyboards).forEach((tab, j) => {
        tab.classList.toggle(SELECTED, i === j);
        tab.setAttribute('aria-selected', String(i === j));
      });
      $('[data-hook="inner-panel"]', keyboards).replaceChildren(tpl('emoji-panel-' + i).cloneNode(true));
    }
    function setPicker(open) {
      keyboards.replaceChildren(...(open ? [tpl('emoji-picker').cloneNode(true)] : []));
      keyboards.classList.toggle('ZN2TR', !open);
      if (open) keyboards.style.borderTop = '1px solid rgb(238, 238, 238)'; else keyboards.removeAttribute('style');
      iconHolder.innerHTML = open ? openIcon : closedIcon;
      if (open) $('#emojis-tab-0', keyboards).focus(); // Wix focuses the first category (browser focus ring)
    }
    emojiBtn.addEventListener('click', () => setPicker(!keyboards.childElementCount));
    keyboards.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-hook="emoji-category"]');
      if (tab) { showCategory(+tab.id.replace('emojis-tab-', '')); return; }
      const em = e.target.closest('[data-hook="emoji"]');
      if (!em) return;
      // Insert at the cursor; the picker stays open, as on Wix.
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      input.value = input.value.slice(0, start) + em.textContent + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start + em.textContent.length;
      focusRing(input); // focus returns to the input, as on Wix
      updateSendButton();
    });
  }

  // ---------- attachments ----------
  // The paperclip opens the file chooser (same file types as Wix); each file appears in the conversation and
  // is attached to the e-mail.
  const fileInput = $('[data-hook="file-upload-input"]');
  fileInput?.addEventListener('change', () => {
    for (const f of fileInput.files) {
      if (files.reduce((n, x) => n + x.size, 0) + f.size > MAX_FILES_BYTES) {
        bubble(`„${f.name}“ ist zu groß (zusammen höchstens 10 MB). Größere Dateien bitte per E-Mail an office@papier-restaurierung.at.`, false);
        continue;
      }
      startNewIfSent();
      files.push(f);
      if (f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        img.style.cssText = 'display:block;max-width:100%;max-height:200px;border-radius:4px;';
        bubble(img, true);
      } else {
        bubble('📎 ' + f.name, true);
      }
    }
    fileInput.value = '';
    if (files.length && !contactAsked) askContact();
  });
})();
