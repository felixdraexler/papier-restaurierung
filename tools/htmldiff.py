"""Shows the element-level differences between two saved DOM states: htmldiff.py a.html b.html"""
import difflib, sys
from bs4 import BeautifulSoup
def lines(f):
    soup = BeautifulSoup(open(f).read(), 'html.parser')
    for s in soup.find_all(['style', 'script', 'iframe']): s.decompose()
    return [l.strip() for l in soup.prettify().splitlines()]
a, b = lines(sys.argv[1]), lines(sys.argv[2])
for l in difflib.unified_diff(a, b, n=1, lineterm=''):
    print(l[:400])
