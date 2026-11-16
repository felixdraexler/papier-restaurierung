// Behaviour of the original Wix site, reimplemented for the static copy. All timings and thresholds were measured
// on the live site (see tools/probe-*.js).
(() => {
  const html = document.documentElement;
  const variant = html.dataset.variant;
  const page = html.dataset.page;
  const mobile = variant === 'mobile';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------- smooth scrolling ----------
  let scrollAnim = 0;
  function animateScroll(to, duration, ease, delay, done) {
    const from = scrollY;
    const id = ++scrollAnim;
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        if (id !== scrollAnim) return;
        const u = Math.min((now - t0) / duration, 1);
        scrollTo(0, from + (to - from) * ease(u));
        if (u < 1) requestAnimationFrame(step);
        else if (done) done();
      };
      requestAnimationFrame(step);
    }, delay);
  }
  // Wix: ease-in-out sine, duration growing with distance (fitted: 336ms + 11ms * px^0.6), ~100ms start delay.
  const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
  function scrollToY(y, done) {
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    animateScroll(y, 336 + 11.01 * Math.pow(Math.abs(y - scrollY), 0.6), easeInOutSine, 100, done);
  }
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, () => scrollAnim++, { passive: true }));

  // ---------- desktop menu layout ----------
  // Wix sizes each menu item from its label as rendered in the visitor's browser (wix-dropdown-menu custom
  // element): width = floor(round(label width) + gap), gap = data-original-gap-between-text-and-btn (10px).
  // Text widths differ between systems, so this must be computed here, not frozen into the HTML.
  function layoutMenu() {
    const items = $$('#comp-ihm8jbpcitemsContainer > li.wixui-dropdown-menu__item');
    items.forEach((li) => { li.style.width = ''; }); // measure the labels at their natural width
    const widths = items.map((li) => Math.floor(Math.round($('p', li).getBoundingClientRect().width) +
      parseFloat(li.dataset.originalGapBetweenTextAndBtn)));
    items.forEach((li, i) => { li.style.width = widths[i] + 'px'; });
  }
  if ($('#comp-ihm8jbpcitemsContainer')) {
    layoutMenu();
    document.fonts.ready.then(layoutMenu);
  }

  // ---------- anchor menu ----------
  // Menu entries reference Wix data items; these are the anchor components they point to.
  const ANCHORS = {
    'dataItem-izmrbemx': 'comp-izmrbemw', // Tätigkeitsbereiche
    'dataItem-izmrbemz': 'comp-izmrbemy', // Atelier
    'dataItem-j6rvbbjo': 'comp-j6rvbbj1', // Referenzen
    'dataItem-izmrbeo6': 'comp-izmrbeo5', // Kontakt
  };
  const header = $('#SITE_HEADER');
  const headerOffset = () => (header && /fixed|sticky/.test(getComputedStyle(header).position) ? header.offsetHeight : 0);
  const anchorTop = (key) => $('#' + ANCHORS[key]).getBoundingClientRect().top + scrollY - headerOffset();

  // Desktop menu items carry data-state/aria-current, mobile ones aria-current plus a class.
  const desktopItems = $$('[id^="comp-ihm8jbpc"]').filter((el) => /^comp-ihm8jbpc\d+$/.test(el.id));
  const mobileItems = $$('#MENU_AS_CONTAINER li.wixui-vertical-menu__item');
  const MOBILE_SELECTED = 'jqR3kU';
  const itemAnchor = (item) => $('a[data-anchor]', item)?.dataset.anchor;
  function setSelected(anchorKey) {
    // The page entry (START) is selected unless an anchor entry is.
    const pick = (items) => {
      const hit = items.find((it) => anchorKey && itemAnchor(it) === anchorKey);
      return hit || items.find((it) => !itemAnchor(it) && $('a', it)?.getAttribute('href') === './');
    };
    const d = page === 'index' ? pick(desktopItems) : null;
    desktopItems.forEach((it) => {
      if (page !== 'index') return;
      const on = it === d;
      it.setAttribute('data-state', `menu ${on ? 'selected' : 'false'}  link`);
      if (on) it.setAttribute('aria-current', 'page'); else it.removeAttribute('aria-current');
    });
    const m = page === 'index' ? pick(mobileItems) : null;
    mobileItems.forEach((it) => {
      if (page !== 'index') return;
      const on = it === m;
      it.classList.toggle(MOBILE_SELECTED, on);
      if (on) it.setAttribute('aria-current', 'page'); else it.removeAttribute('aria-current');
    });
  }
  // Mobile: Wix highlights an anchor's entry while the anchor (a thin strip) lies on the line just below the
  // header. Desktop (measured): scrolling never highlights; after a menu click only TÄTIGKEITSBEREICHE stays
  // highlighted (the other targets end up showing START), until the visitor scrolls themselves.
  let desktopClicked = null;
  let arrivedKey = null; // arrived from another page via a menu entry: Wix highlights it in addition to START
  const userScroll = () => { desktopClicked = null; arrivedKey = null; };
  addEventListener('wheel', userScroll, { passive: true });
  addEventListener('touchmove', userScroll, { passive: true });
  function updateSelected() {
    if (page !== 'index') return;
    if (!mobile) {
      setSelected(desktopClicked === 'dataItem-izmrbemx' ? desktopClicked : null);
      const arrived = arrivedKey && desktopItems.find((it) => itemAnchor(it) === arrivedKey);
      if (arrived) arrived.setAttribute('data-state', 'menu selected  link');
      return;
    }
    const line = headerOffset();
    let active = null;
    for (const [key, id] of Object.entries(ANCHORS)) {
      const r = $('#' + id).getBoundingClientRect();
      if (r.top <= line && r.bottom > line) active = key;
    }
    setSelected(active);
  }
  let selPending = false;
  addEventListener('scroll', () => {
    if (selPending) return;
    selPending = true;
    requestAnimationFrame(() => { selPending = false; updateSelected(); });
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const key = a.dataset.anchor;
    if (key && ANCHORS[key]) {
      e.preventDefault();
      closeMenu();
      desktopClicked = key;
      if (page === 'index') scrollToY(anchorTop(key), updateSelected);
      else location.href = './#' + key;
    } else if (page === 'index' && a.getAttribute('href') === './') {
      e.preventDefault(); // START / logo on the home page: scroll back to the top
      closeMenu();
      scrollToY(0, updateSelected);
    }
  });
  if (page === 'index' && ANCHORS[location.hash.slice(1)]) {
    const key = location.hash.slice(1);
    history.replaceState(null, '', location.pathname + location.search);
    // Arriving from another page, Wix additionally highlights the chosen entry (START stays highlighted too).
    addEventListener('load', () => scrollToY(anchorTop(key), () => { arrivedKey = key; updateSelected(); }));
  }

  // ---------- "Mehr erfahren" / "Zuklappen" ----------
  $$('[data-testid="ellipsis_text_viewer_expand_control"]').forEach((btn) => {
    const text = $('.wixui-collapsible-text__text', btn.closest('[data-testid="ellipsis_text_viewer_root"]'));
    const collapseClass = [...text.classList].find((c) => c.endsWith('--collapse'));
    btn.addEventListener('click', () => {
      const expand = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(expand));
      btn.textContent = expand ? 'Zuklappen' : 'Mehr erfahren';
      text.classList.toggle(collapseClass, !expand);
    });
  });

  // ---------- mobile menu ----------
  const toggle = $('#MENU_AS_CONTAINER_TOGGLE');
  const menu = $('#MENU_AS_CONTAINER');
  const quickBar = $('#QUICK_ACTION_BAR');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.classList.toggle('d0L2ow', open);
    $('.vlJDcR', toggle)?.classList.toggle('d0L2ow', open);
    $('.DS2KZ9', toggle)?.classList.toggle('diaQsa', open);
    toggle.setAttribute('aria-label', open ? 'Navigationsmenü schließen' : 'Navigationsmenü öffnen');
    menu.setAttribute('data-undisplayed', String(!open));
    menu.classList.toggle('I_VSKP', open);
    const overlay = $('#overlay-MENU_AS_CONTAINER');
    const container = $('#container-MENU_AS_CONTAINER');
    if (open) {
      overlay.style.cssText = 'opacity: 1; visibility: inherit;';
      container.style.cssText = 'visibility: inherit;';
      $('#inlineContentParent-MENU_AS_CONTAINER').style.cssText = 'overscroll-behavior-y: contain;';
      menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out' });
    } else {
      overlay.removeAttribute('style');
      container.removeAttribute('style');
      $('#inlineContentParent-MENU_AS_CONTAINER').removeAttribute('style');
    }
    document.body.classList.toggle('siteScrollingBlockedIOSFix', open);
    quickBar?.classList.toggle('Xgbjio', open);
  }
  function closeMenu() { if (menu && menu.classList.contains('I_VSKP')) setMenu(false); }
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('I_VSKP')));
  $('#overlay-MENU_AS_CONTAINER')?.addEventListener('click', closeMenu);

  // ---------- mobile back-to-top button ----------
  // Appears on scrolling once past ~525px and fades out ~2.5s after appearing.
  const btt = $('#BACK_TO_TOP_BUTTON');
  if (btt) {
    let hideTimer = 0;
    addEventListener('scroll', () => {
      if (btt.classList.contains('z7UpAt') || scrollY < 525) return;
      btt.classList.add('z7UpAt');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => btt.classList.remove('z7UpAt'), 2500);
    }, { passive: true });
    // Measured curve (fraction of the distance still to go over time).
    const curve = [[0, 1], [126, 0.862], [190, 0.453], [275, 0.237], [378, 0.113], [486, 0.048], [557, 0.019], [648, 0.004], [724, 0]];
    const easeBtt = (u) => {
      const t = u * 724;
      for (let i = 1; i < curve.length; i++) {
        if (t <= curve[i][0]) {
          const [t0, f0] = curve[i - 1], [t1, f1] = curve[i];
          return 1 - (f0 + (f1 - f0) * (t - t0) / (t1 - t0));
        }
      }
      return 1;
    };
    btt.addEventListener('click', () => animateScroll(0, 724, easeBtt, 0));
  }

  // ---------- entrance animations (mobile layout) ----------
  // Wix's CSS keeps these animations paused until the element scrolls into view.
  const animated = $$('[id^="comp-"]').filter((el) => {
    const cs = getComputedStyle(el);
    return cs.animationName !== 'none' && cs.animationPlayState.includes('paused');
  });
  if (animated.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        let pending = getComputedStyle(el).animationName.split(',').length;
        el.addEventListener('animationend', function end() {
          if (--pending) return;
          el.removeEventListener('animationend', end);
          el.setAttribute('data-motion-enter', 'done');
          el.style.animationPlayState = '';
        });
        el.style.animationPlayState = 'running';
      }
    });
    animated.forEach((el) => io.observe(el));
  }

  // ---------- chat ----------
  const chatHolder = $('#comp-kh08gc5c');
  const chatFrame = chatHolder && $('iframe', chatHolder);
  const MOBILE_CHAT_OPEN = 'display: block; position: absolute; margin: 0px; top: calc(-1 * var(--wix-ads-height)); bottom: 0px; left: 0px; right: 0px; z-index: 2000; height: auto; width: auto; place-self: unset;';
  addEventListener('message', (e) => {
    if (!chatFrame || e.source !== chatFrame.contentWindow) return;
    const msg = e.data || {};
    if (msg.type === 'chat-size') chatHolder.setAttribute('style', `width: ${msg.width}px; height: ${msg.height}px; content: attr(x);`);
    if (msg.type === 'chat-close' && mobile) {
      chatHolder.setAttribute('style', 'display: none;');
      quickBar?.classList.replace('_7AdYpa', 'JSIBA4');
    }
  });
  $('#dynamicAction-QUICK_ACTION_BAR-0')?.addEventListener('click', () => {
    chatHolder.setAttribute('style', MOBILE_CHAT_OPEN);
    quickBar?.classList.replace('JSIBA4', '_7AdYpa');
    chatFrame.contentWindow.postMessage({ type: 'chat-open' }, '*');
  });
})();
