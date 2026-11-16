// Chat frame: Wix's chat widget look, but messages are delivered by e-mail through Web3Forms.
// Visitors type a message, then leave name and e-mail address so the reply can go out by mail.
(() => {
  const WEB3FORMS_KEY = 'c7d78f03-7352-4509-8813-214c3c4ea886';
  const ACCENT = 'rgb(235, 186, 77)';
  const FONT = 'lato-light, HelveticaNeueW01-45Ligh';
  const variant = document.documentElement.dataset.variant;
  const $ = (sel, root = document) => root.querySelector(sel);

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

  // Desktop: minimized button (276x66, as Wix sizes it) <-> open panel (370x610).
  function setOpen(open) {
    if (variant === 'mobile') {
      if (!open) post({ type: 'chat-close' });
      return;
    }
    widget.classList.toggle('+6uur', open);
    expanded.style.display = open ? '' : 'none';
    minimized.style.display = open ? 'none' : '';
    post({ type: 'chat-size', width: open ? 370 : 276, height: open ? 610 : 66 });
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
  if (variant !== 'mobile') setOpen(false);

  // ---------- conversation ----------
  const messages = [];
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
      '<input name="botcheck" type="checkbox" tabindex="-1" autocomplete="off" style="display:none">' +
      '<button type="submit">Senden</button>';
    for (const el of form.querySelectorAll('input:not([name=botcheck])')) {
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
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: 'Chat-Nachricht über papier-restaurierung.at',
            from_name: 'papier-restaurierung.at',
            name: data.name,
            email: data.email,
            replyto: data.email,
            message: messages.join('\n\n'),
            botcheck: data.botcheck ? true : '',
          }),
        });
        const out = await res.json();
        if (!out.success) throw new Error(out.message || res.status);
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
    bubble(text, true);
    if (sent) { // a further message after delivery starts a new e-mail
      messages.length = 0;
      sent = false;
      contactAsked = false;
    }
    messages.push(text);
    if (!contactAsked) askContact();
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(); }
  });
  // Grow the textarea with its content, like the Wix widget (one line = 24px, at most 4 lines).
  input.addEventListener('input', () => {
    input.style.height = '24px';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });

  // ---------- emoji and attachment buttons ----------
  const emojiBtn = $('[data-hook="emoji-keyboard"]');
  if (emojiBtn) {
    const panel = $('[data-hook="input-keyboards"]');
    const EMOJIS = '😀 😊 🙂 😉 😍 🙏 👍 👋 👏 🎨 🖼️ 📜 📄 ✉️ 📞 ✨ ❤️ 😢 🤔 ✅'.split(' ');
    emojiBtn.addEventListener('click', () => {
      if (panel.childElementCount) { panel.replaceChildren(); return; }
      panel.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;padding:8px 12px;border-top:1px solid #eee;background:#fff;';
      for (const em of EMOJIS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = em;
        b.style.cssText = 'border:0;background:none;font-size:22px;cursor:pointer;padding:4px;';
        b.addEventListener('click', () => { input.value += em; input.focus(); });
        panel.append(b);
      }
    });
  }
  // Web3Forms' free plan carries no attachments: point visitors to e-mail instead.
  const fileInput = $('[data-hook="file-upload-input"]');
  fileInput?.addEventListener('click', (e) => {
    e.preventDefault();
    bubble('Dateien oder Fotos senden Sie bitte per E-Mail an office@papier-restaurierung.at.', false);
  });
})();
