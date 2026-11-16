"""Turns the captured Wix DOMs (tools/capture.js) into self-contained static pages under docs/.

Wix serves three layouts from the same URLs (chosen by user agent): desktop, tablet (desktop layout at a fixed
980px viewport) and mobile. The copy keeps them as docs/, docs/t/ and docs/m/; an inline script at the top of
each page switches to the layout Wix would have served.

Per page: removes Wix scripts, downloads every Wix-hosted asset (images, CSS, fonts) byte-identical to what the
browser received, rewrites links to relative paths, points the chat frame at the local chat replacement and
adds site.js (menu, animations, chat, ...).
Usage: uv run --with beautifulsoup4 --with requests --with fonttools --with brotli tools/build.py <capture dir> <states dir>
"""
import hashlib, os, re, shutil, sys, urllib.parse
from pathlib import Path
import requests
from bs4 import BeautifulSoup, Comment

REF, STATES = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
ASSETS = DOCS / 'assets'
CACHE = Path.home() / 'data/papier-restaurierung/cache'
SITE = 'https://www.papier-restaurierung.at'
PAGES = ['index', 'impressum', 'agb', 'datenschutz']
VARIANTS = {'desktop': '', 'tablet': 't/', 'mobile': 'm/'}
ASSET_HOSTS = ('static.wixstatic.com', 'static.parastorage.com')
URL_RE = re.compile(r'''(?:https?:)?//(?:%s)/[^\s"'()<>]+''' % '|'.join(re.escape(h) for h in ASSET_HOSTS))
CSS_URL_RE = re.compile(r'''url\(\s*(['"]?)([^'")]+)\1\s*\)''')
session = requests.Session()
# Same Accept header as Chrome, so Wix serves the same encodings (AVIF) the live site shows.
session.headers['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
local_names = {}

# Runs before anything renders: switch to the layout Wix serves this device (same UA rules as Wix: phones get
# the mobile site, tablets the desktop layout at 980px, everything else - including iPads with a Mac UA - desktop).
ROUTER = """(function(){var ua=navigator.userAgent,v=/iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|Mobi/i.test(ua)?'m/':/iPad|Android|Tablet|Silk|Kindle|PlayBook/i.test(ua)?'t/':'',
cur='%(cur)s',page='%(page)s';if(v!==cur){location.replace('%(up)s'+v+(page==='index'?'':page)+location.search+location.hash)}})();"""


def fetch(url):
    key = hashlib.sha1(url.encode()).hexdigest()
    cached = CACHE / key
    if not cached.exists():
        r = session.get(url, timeout=60)
        r.raise_for_status()
        cached.write_bytes(r.content)
        (CACHE / (key + '.type')).write_text(r.headers.get('content-type', ''))
    return cached.read_bytes(), (CACHE / (key + '.type')).read_text()


def ext_for(url, ctype):
    for t, e in (('avif', 'avif'), ('webp', 'webp'), ('css', 'css'), ('svg', 'svg'), ('png', 'png'), ('jpeg', 'jpg'),
                 ('woff2', 'woff2'), ('woff', 'woff'), ('ttf', 'ttf'), ('opentype', 'otf'), ('otf', 'otf'),
                 ('eot', 'eot'), ('gif', 'gif'), ('icon', 'ico')):
        if t in ctype:
            return e
    m = re.search(r'\.(woff2?|ttf|eot|otf|svg|css)$', urllib.parse.urlparse(url).path, re.I)
    if m:
        return m.group(1).lower()
    raise ValueError(f'unknown asset type {ctype!r} for {url}')


def localize(url):
    """Downloads an asset once and returns its file name in docs/assets/."""
    url = url.replace('&amp;', '&')
    if url.startswith('//'):
        url = 'https:' + url
    if url in local_names:
        return local_names[url]
    data, ctype = fetch(url)
    name = hashlib.sha1(url.encode()).hexdigest()[:16] + '.' + ext_for(url, ctype)
    local_names[url] = name
    if name.endswith('.css'):
        data = rewrite_css(data.decode(), base=url, prefix='').encode()
    (ASSETS / name).write_bytes(data)
    return name


# Commercial fonts Wix licenses for Wix-hosted sites only. No visible text uses them, but empty or invisible
# characters set in them still shape line heights. They are replaced by Lato (OFL) with the original fonts'
# vertical metrics (hhea = win metrics, in % of the em), so every line box keeps its exact height.
# The chat subtitle's Helvetica Neue Light is replaced by the system's own copy (present on Apple devices).
LICENSED_FONT = re.compile(r'static\.parastorage\.com/(fonts/v2/|services/third-party/fonts/Helvetica/)')
LATO_LIGHT = 'https://static.wixstatic.com/ufonts/79ea19_784df4151f6a4bfbac43f54048eeb8a9/woff2/file.woff2'
# Visible Futura text (mobile menu, "Mehr erfahren") is set in Jost (OFL, Futura-style), scaled to Futura's widths.
JOST = 'https://fonts.gstatic.com/s/jost/v20/92zatBhPNqw73oTd4g.woff2'  # latin subset, variable wght 100-900
SAMPLE = 'TÄTIGKEITSBEREICHE START ATELIER REFERENZEN KONTAKT Mehr erfahren Zuklappen'


def jost_instance(weight):
    """Static Jost cut at the given weight (the Futura families are single-weight families)."""
    from io import BytesIO
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    name = f'jost-{weight}.woff2'
    if not (ASSETS / name).exists():
        font = instantiateVariableFont(TTFont(BytesIO(fetch(JOST)[0])), {'wght': weight})
        font.flavor = 'woff2'
        font.save(ASSETS / name)
    return name


def text_width(data):
    from io import BytesIO
    from fontTools.ttLib import TTFont
    f = TTFont(BytesIO(data))
    cmap, hmtx = f.getBestCmap(), f['hmtx']
    return sum(hmtx[cmap[ord(c)]][0] for c in SAMPLE) / f['head'].unitsPerEm

HELVETICA_LOCAL = ("@font-face{font-family:'HelveticaNeueW01-45Ligh';src:local('HelveticaNeue-Light'),local('Helvetica Neue Light'),"
                   "local('Helvetica Neue'),local('Arial'),local('Liberation Sans'),local('Roboto Light'),local('Roboto');}")


def font_metrics(url):
    """Ascent/descent (% of em) Chrome uses for a font: hhea, or OS/2 typo metrics if USE_TYPO_METRICS is set."""
    from io import BytesIO
    from fontTools.ttLib import TTFont
    f = TTFont(BytesIO(fetch(url)[0]))
    upm, os2, hhea = f['head'].unitsPerEm, f['OS/2'], f['hhea']
    if os2.fsSelection & 128 or hhea.lineGap:
        raise ValueError(f'metrics of {url} need line-gap/typo handling')
    return round(hhea.ascent * 100 / upm, 3), round(-hhea.descent * 100 / upm, 3)


def drop_licensed_fonts(css, base):
    def repl(m):
        block = m.group(0)
        urls = [urllib.parse.urljoin(base, u.strip()) for _, u in CSS_URL_RE.findall(block)]
        urls = [u if u.startswith('http') else 'https:' + u for u in urls]
        if not any(LICENSED_FONT.search(u) for u in urls):
            return block
        if any(name and name in block for name in os.environ.get('KEEP_FONTS', '').split(',')):
            return block  # explicitly allowed (local verification, or licensed by the site owner)
        if any('/third-party/fonts/Helvetica/' in u for u in urls):
            # Chat frame font set: only the Light cut is used (as system font); the rest is unused.
            return HELVETICA_LOCAL if 'HelveticaNeueW01-45Ligh' in block else ''
        for u in urls:  # some of Wix's mirrors refuse direct downloads; any copy of the font will do
            try:
                ascent, descent = font_metrics(u)
                original = u
                break
            except Exception:  # 403 from Wix, or a format fontTools cannot read (eot, svg)
                continue
        else:
            raise ValueError(f'no downloadable file for {block[:120]}')
        rules = re.sub(r'src\s*:[^;}]*;?', '', block[block.index('{') + 1:-1]).strip().rstrip(';')
        if 'futura' in original:
            jost = jost_instance(300 if 'light' in original else 400)
            scale = text_width(fetch(original)[0]) / text_width((ASSETS / jost).read_bytes())
            # Chrome scales the metric overrides by size-adjust as well, so divide to keep Futura's line boxes.
            return (f'@font-face{{{rules};src:url("@local/{jost}") format("woff2");size-adjust:{scale * 100:.2f}%;'
                    f'ascent-override:{ascent / scale:.3f}%;descent-override:{descent / scale:.3f}%;line-gap-override:0%}}')
        return (f'@font-face{{{rules};src:url("@local/{localize(LATO_LIGHT)}") format("woff2");'
                f'ascent-override:{ascent}%;descent-override:{descent}%;line-gap-override:0%}}')
    return re.sub(r'@font-face\s*\{[^}]*\}', repl, css)


def rewrite_css(css, base, prefix):
    css = re.sub(r'/\*# sourceMappingURL=[^*]*\*/', '', css)
    css = drop_licensed_fonts(css, base)

    def repl(m):
        u = m.group(2).strip()
        if u.startswith(('data:', '#')):
            return m.group(0)
        if u.startswith('@local/'):  # already a local asset (metric-matched font substitutes)
            return f'url("{prefix}{u[7:]}")'
        absu = urllib.parse.urljoin(base, u)
        if urllib.parse.urlparse(absu).hostname not in ASSET_HOSTS:
            raise ValueError(f'unexpected CSS url {absu}')
        return f'url("{prefix}{localize(absu)}")'
    return CSS_URL_RE.sub(repl, css)


def clean(soup, prefix):
    """Removes Wix runtime code and makes all asset references local."""
    for el in soup.find_all(['script', 'noscript']):
        el.decompose()
    for el in soup.find_all('link'):
        rel = ' '.join(el.get('rel', []))
        if rel in ('prefetch', 'preload', 'preconnect', 'dns-prefetch', 'modulepreload', 'canonical') or el.get('as') == 'fetch':
            el.decompose()
        elif 'user-site-fonts' in el.get('href', '') and el['href'].endswith('languages.css'):
            el.decompose()  # Wix's font set for non-Latin scripts; unused here and partly no longer downloadable
    for el in soup.find_all('meta'):
        if (el.get('http-equiv') or '').startswith('X-Wix') or el.get('http-equiv') == 'etag':
            el.decompose()
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        c.extract()
    for el in soup.find_all('style'):
        for attr in ('data-href', 'data-url'):
            el.attrs.pop(attr, None)
        el.string = rewrite_css(el.get_text(), SITE + '/', prefix)
    for el in soup.find_all(True):
        for attr, val in list(el.attrs.items()):
            if not isinstance(val, str):
                continue
            if attr == 'style':
                val = rewrite_css(val, SITE + '/', prefix)
            if attr in ('href', 'src', 'srcset', 'xlink:href', 'content', 'style', 'data-src', 'poster'):
                val = URL_RE.sub(lambda m: prefix + localize(m.group(0)), val)
            if attr == 'href' and val.startswith(SITE):
                val = val[len(SITE):].strip('/') or './'
            el[attr] = val
    leftovers = set(re.findall(r'(?:https?:)?//[a-z0-9.-]*(?:wix|parastorage|filesusr)[a-z0-9.-]*\.[a-z]+[^\s"\'<>)]*', str(soup)))
    leftovers = {u for u in leftovers if not u.startswith(('//www.wix.com/jobs', 'https://www.wix.com/jobs'))}
    if leftovers:
        raise ValueError('remaining Wix URLs: ' + ', '.join(sorted(leftovers)[:5]))


def build_page(variant, page):
    soup = BeautifulSoup((REF / f'{variant}.{page}.html').read_text(), 'html.parser')
    sub = VARIANTS[variant]
    up = '../' if sub else ''

    for iframe in soup.find_all('iframe'):
        if iframe.get('title') != 'Wix Chat':
            raise ValueError(f'unexpected iframe {iframe}')
        iframe['src'] = up + 'chat/' + ('mobile' if variant == 'mobile' else 'desktop') + '.html'
        del iframe['allow']
    for el in soup.find_all(attrs={'data-motion-enter': True}):
        del el['data-motion-enter']  # site.js replays the entrance animations
    clean(soup, up + 'assets/')

    router = soup.new_tag('script')
    router.string = ROUTER % {'cur': sub, 'page': page, 'up': up}
    soup.head.insert(0, router)
    soup.head.append(soup.new_tag('script', src=up + 'site.js', defer=True))
    soup.html['data-variant'] = variant
    soup.html['data-page'] = page
    out = DOCS / sub / f'{page}.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(str(soup))
    print('wrote', out.relative_to(ROOT))


def build_chat(variant):
    """The chat frame: Wix's chat widget markup/CSS as captured, driven by chat.js instead of Wix."""
    soup = BeautifulSoup((STATES / f'chat-{variant}-open.html').read_text(), 'html.parser')
    for el in soup.find_all('iframe'):
        el.decompose()
    widget = soup.find(attrs={'data-hook': 'chat-widget'})
    if variant == 'desktop':
        closed = BeautifulSoup((STATES / 'chat-desktop-closed.html').read_text(), 'html.parser')
        widget.append(closed.find(attrs={'data-hook': 'minimized-chat-wrapper'}))
        for c in closed.find_all('style'):  # closed-state styles not present in the open state
            if c.get_text() not in {s.get_text() for s in soup.find_all('style')}:
                soup.head.append(c)
    clean(soup, '../assets/')
    soup.head.append(soup.new_tag('script', src='../chat.js', defer=True))
    soup.html['data-variant'] = variant
    out = DOCS / 'chat' / f'{variant}.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(str(soup))
    print('wrote', out.relative_to(ROOT))


CACHE.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
for variant in VARIANTS:
    for page in PAGES:
        build_page(variant, page)
for variant in ('desktop', 'mobile'):
    build_chat(variant)
for f in (ROOT / 'src').iterdir():  # hand-written behaviour (site.js, chat.js) and hosting files
    shutil.copy(f, DOCS / f.name)
print(len(local_names), 'assets')
