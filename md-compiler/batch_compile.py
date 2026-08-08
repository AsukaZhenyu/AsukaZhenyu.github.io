#!/usr/bin/env python3
"""Batch compile md_source/ to html_source/ with unified site shell.

Usage:
    python md-compiler/batch_compile.py
"""

import re
import os
import uuid
import markdown
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_SOURCE = ROOT / 'md_source'
HTML_SOURCE = ROOT / 'html_source'
DEFAULT_CSS = 'css_source/main_style.css'


# ---------------------------------------------------------------------------
# markdown -> HTML body (reuses logic from md_compiler/cli.py)
# ---------------------------------------------------------------------------

def compile_markdown_body(md_text: str) -> str:
    math_placeholders = {}

    def protect_math(match):
        placeholder = f'MATH_{uuid.uuid4().hex}'
        math_placeholders[placeholder] = match.group(0)
        return placeholder

    content = md_text
    content = re.sub(r'\\\[(.*?)\\\]', protect_math, content, flags=re.DOTALL)
    content = re.sub(r'\$\$(.*?)\$\$', protect_math, content, flags=re.DOTALL)
    content = re.sub(r'\\\((.*?)\\\)', protect_math, content)
    content = re.sub(r'(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)', protect_math, content)

    md = markdown.Markdown(extensions=[
        'extra', 'codehilite', 'toc', 'meta', 'nl2br',
        'sane_lists', 'smarty'
    ])
    html = md.convert(content)

    for placeholder, original in math_placeholders.items():
        if placeholder in html:
            html = html.replace(placeholder, original)

    html = re.sub(r'<p>\s*<div class="math-display">', '<div class="math-display">', html)
    html = re.sub(r'</div>\s*</p>', '</div>', html)
    return html


# ---------------------------------------------------------------------------
# <posts-list> / <title-link> parser
# ---------------------------------------------------------------------------

TITLE_LINK_RE = re.compile(r'<title-link>\s*(.*?)</title-link>', re.DOTALL)
POSTS_LIST_RE = re.compile(r'<posts-list>\s*(.*?)</posts-list>', re.DOTALL)


def parse_title_link(content: str, source_dir: Path) -> dict | None:
    """Parse a single <title-link> block.

    Format:
        css_path            (optional - first non-empty line if contains .css)
        en-title, zh-title
        [date](./path.md)
    """
    lines = [l.strip() for l in content.strip().split('\n') if l.strip()]
    if len(lines) < 2:
        return None

    css = None
    idx = 0
    if '.css' in lines[0]:
        css = lines[0]
        idx = 1

    if idx >= len(lines):
        return None

    # Title: "en, zh"
    title_parts = lines[idx].split(',', 1)
    en_title = title_parts[0].strip()
    zh_title = title_parts[1].strip() if len(title_parts) > 1 else ''

    idx += 1
    if idx >= len(lines):
        return None

    # Link: [date](./path.md)
    link_m = re.match(r'\[(.*?)\]\((.*?)\)', lines[idx])
    if not link_m:
        return None

    date = link_m.group(1).strip()
    href = link_m.group(2).strip()

    target_md = (source_dir / href).resolve()

    # Determine output path
    try:
        rel = target_md.relative_to(MD_SOURCE)
    except ValueError:
        print(f"  Warning: {target_md} is outside md_source/, skipping")
        return None

    if str(rel) == 'index.md':
        output_path = ROOT / 'index.html'
    elif str(rel) == 'musings.md':
        output_path = ROOT / 'musings.html'
    elif str(rel) == 'math.md':
        output_path = ROOT / 'math.html'
    elif str(rel) == 'music.md':
        output_path = ROOT / 'music.html'
    elif str(rel) == 'storytelling.md':
        output_path = ROOT / 'storytelling.html'
    elif str(rel) == 'PE.md':
        output_path = ROOT / 'PE.html'
    else:
        out_rel = rel.parent / (rel.stem + '.html')
        output_path = HTML_SOURCE / out_rel

    return {
        'css': css,
        'en_title': en_title,
        'zh_title': zh_title,
        'date': date,
        'target_md': target_md,
        'target_html': output_path.resolve(),
    }


def parse_posts_lists(md_text: str, source_dir: Path) -> tuple[str, list[list[dict]]]:
    """Extract all <posts-list> blocks, return (patched_text, entries_groups)."""
    all_entries: list[list[dict]] = []

    def replace(match):
        entries = []
        for tl in TITLE_LINK_RE.finditer(match.group(1)):
            entry = parse_title_link(tl.group(1), source_dir)
            if entry:
                entries.append(entry)
        idx = len(all_entries)
        all_entries.append(entries)
        return f'<!--POSTS_LIST_{idx}-->'

    modified = POSTS_LIST_RE.sub(replace, md_text)
    return modified, all_entries


# ---------------------------------------------------------------------------
# TOC (Table of Contents) extraction
# ---------------------------------------------------------------------------

HEADING_RE = re.compile(r'<h([123])\s+id="([^"]*)"[^>]*>(.*?)</h[123]>')


def extract_toc(body_html: str) -> str:
    """Extract h1-h3 headings from compiled HTML, build nested TOC tree.

    Skips the first h1 (page title). Returns empty string if not enough headings.
    """
    headings = HEADING_RE.findall(body_html)
    if len(headings) <= 1:
        return ''

    items = []
    min_level = 4
    for i, (level_str, id_, text) in enumerate(headings):
        level = int(level_str)
        if i == 0 and level == 1:
            continue
        if level < min_level:
            min_level = level
        items.append({'level': level, 'id': id_, 'text': text, 'children': []})

    if not items:
        return ''

    # Build tree: attach each heading as child of nearest preceding shallower heading
    root = {'level': min_level - 1, 'children': []}
    stack = [root]
    for item in items:
        while stack[-1]['level'] >= item['level']:
            stack.pop()
        stack[-1]['children'].append(item)
        stack.append(item)

    # Render tree → nested <ul>/<li>
    def render_node(node):
        html = f'<li><a href="#{node["id"]}">{node["text"]}</a>'
        if node['children']:
            html += '\n<ul>\n'
            for child in node['children']:
                html += render_node(child) + '\n'
            html += '</ul>'
        html += '</li>'
        return html

    parts = ['<ul>']
    for child in root['children']:
        parts.append(render_node(child))
    parts.append('</ul>')

    return '<nav class="toc">\n' + '\n'.join(parts) + '\n</nav>'


# ---------------------------------------------------------------------------
# HTML rendering
# ---------------------------------------------------------------------------

def render_posts_table(entries: list[dict], output_dir: Path) -> str:
    rows = []
    for e in entries:
        try:
            href = os.path.relpath(e['target_html'], output_dir).replace('\\', '/')
        except ValueError:
            href = str(e['target_html']).replace('\\', '/')

        rows.append(
            f'    <tr>\n'
            f'      <td>\n'
            f'        <a href="{href}" class="title-link">\n'
            f'          <div class="en-title">{e["en_title"]}</div>\n'
            f'          <div class="zh-title">{e["zh_title"]}</div>\n'
            f'        </a>\n'
            f'      </td>\n'
            f'      <td class="date">{e["date"]}</td>\n'
            f'    </tr>'
        )

    if not rows:
        return ''

    return (
        '  <table class="posts-list">\n\n'
        + '\n\n'.join(rows)
        + '\n\n  </table>'
    )


def depth_prefix(output_path: Path) -> str:
    """Relative path from output file's directory to project root."""
    try:
        rel = os.path.relpath(ROOT, output_path.parent).replace('\\', '/')
    except ValueError:
        return './'
    if rel == '.':
        return './'
    return rel + '/'


def render_shell(body_html: str, output_path: Path, page_css: str,
                 toc_html: str = '') -> str:
    prefix = depth_prefix(output_path)

    # Resolve CSS path relative to output
    if page_css.startswith(('css_source/', 'md-compiler/')):
        css_href = prefix + page_css
    else:
        css_href = prefix + page_css

    title_m = re.search(r'<h[12][^>]*>(.*?)</h[12]>', body_html)
    page_title = title_m.group(1) if title_m else "Zhenyu's Blog"

    has_sidebar = bool(toc_html)

    # Common <head> section
    head = (
        '<!DOCTYPE html>\n'
        '<html lang="zh-CN">\n'
        '<head>\n'
        '  <meta charset="UTF-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f'  <title>{page_title} - Zhenyu\'s Blog</title>\n'
        f'  <link rel="stylesheet" href="{css_href}">\n'
        '  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">\n'
        '  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>\n'
        '  <script>hljs.highlightAll();</script>\n'
        '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">\n'
        '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js"></script>\n'
        '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js"></script>\n'
        '  <script>\n'
        '      document.addEventListener("DOMContentLoaded", function() {\n'
        '          renderMathInElement(document.body, {\n'
        '              delimiters: [\n'
        '                  {left: "$$", right: "$$", display: true},\n'
        '                  {left: "$", right: "$", display: false},\n'
        '                  {left: "\\\\(", right: "\\\\)", display: false},\n'
        '                  {left: "\\\\[", right: "\\\\]", display: true}\n'
        '              ],\n'
        '              throwOnError: false,\n'
        '              strict: false\n'
        '          });\n'
        '      });\n'
        '  </script>\n'
    )

    # Common header
    header = (
        '  <header>\n'
        '    <h1>Zhenyu\'s Blog</h1>\n'
        '    <nav>\n'
        f'      <a href="{prefix}index.html">CS</a>\n'
        f'      <a href="{prefix}about.html">About</a>\n'
        f'      <a href="{prefix}musings.html">Musings</a>\n'
        f'      <a href="{prefix}math.html">Math</a>\n'
        f'      <a href="{prefix}music.html">Music</a>\n'
        f'      <a href="{prefix}storytelling.html">Storytelling</a>\n'
        f'      <a href="{prefix}PE.html">PE</a>\n'
        '    </nav>\n'
        '  </header>'
    )

    if has_sidebar:
        # Scroll-spy JavaScript
        scroll_spy_js = (
            '  <script>\n'
            '    (function() {\n'
            '      var headings = document.querySelectorAll('
            '".content h1[id], .content h2[id], .content h3[id]");\n'
            '      var links = document.querySelectorAll(".toc a");\n'
            '      if (headings.length === 0 || links.length === 0) return;\n'
            '      var observer = new IntersectionObserver(function(entries) {\n'
            '        entries.forEach(function(e) {\n'
            '          if (e.isIntersecting) {\n'
            '            var id = e.target.getAttribute("id");\n'
            '            links.forEach(function(a) {\n'
            '              a.classList.toggle('
            '"active", a.getAttribute("href") === "#" + id);\n'
            '            });\n'
            '          }\n'
            '        });\n'
            '      }, { rootMargin: "-20% 0px -60% 0px" });\n'
            '      headings.forEach(function(h) { observer.observe(h); });\n'
            '    })();\n'
            '  </script>\n'
        )

        return (
            head
            + '</head>\n'
            '<body class="has-sidebar">\n'
            + header
            + '\n'
            '<div class="page-wrapper">\n'
            '  <aside class="sidebar">\n'
            f'{toc_html}\n'
            '  </aside>\n'
            '  <main class="content">\n'
            f'{body_html}\n'
            '  </main>\n'
            '</div>\n'
            + scroll_spy_js
            + '</body>\n'
            '</html>'
        )
    else:
        return (
            head
            + '</head>\n'
            '<body>\n'
            + header
            + '\n'
            '<main class="content">\n'
            f'{body_html}\n'
            '</main>\n'
            '</body>\n'
            '</html>'
        )


# ---------------------------------------------------------------------------
# compilation driver
# ---------------------------------------------------------------------------

def compile_one(md_path: Path, html_path: Path, page_css: str) -> list[list[dict]]:
    """Compile one .md file, return its posts-list entries for recursive follow."""
    print(f'  {md_path}  ->  {html_path}  [{page_css}]')

    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Detect and remove [toc] marker (case-insensitive)
    has_toc = bool(re.search(r'\[toc\]', md_text, re.IGNORECASE))
    if has_toc:
        md_text = re.sub(r'\[toc\]\s*', '', md_text, flags=re.IGNORECASE)

    modified, entries_groups = parse_posts_lists(md_text, md_path.parent)
    body_html = compile_markdown_body(modified)

    # Extract TOC from compiled HTML (before posts-list replacement)
    toc_html = extract_toc(body_html) if has_toc else ''

    for i, entries in enumerate(entries_groups):
        table = render_posts_table(entries, html_path.parent)
        body_html = body_html.replace(f'<!--POSTS_LIST_{i}-->', table)

    full_html = render_shell(body_html, html_path, page_css, toc_html)

    html_path.parent.mkdir(parents=True, exist_ok=True)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    return entries_groups


def compile_all():
    compiled: set[str] = set()
    queue: list[tuple[Path, Path, str]] = [
        (MD_SOURCE / 'index.md', ROOT / 'index.html', DEFAULT_CSS),
        (MD_SOURCE / 'musings.md', ROOT / 'musings.html', DEFAULT_CSS),
        (MD_SOURCE / 'math.md', ROOT / 'math.html', DEFAULT_CSS),
        (MD_SOURCE / 'music.md', ROOT / 'music.html', DEFAULT_CSS),
        (MD_SOURCE / 'storytelling.md', ROOT / 'storytelling.html', DEFAULT_CSS),
        (MD_SOURCE / 'PE.md', ROOT / 'PE.html', DEFAULT_CSS),
    ]

    while queue:
        md_path, html_path, css = queue.pop(0)
        key = str(md_path.resolve())
        if key in compiled:
            continue
        compiled.add(key)

        if not md_path.exists():
            print(f'Warning: {md_path} not found, skipping.')
            continue

        entries_groups = compile_one(md_path, html_path, css)

        for entries in entries_groups:
            for e in entries:
                tk = str(e['target_md'])
                if tk not in compiled:
                    queue.append((e['target_md'], e['target_html'], e['css'] or DEFAULT_CSS))


if __name__ == '__main__':
    os.chdir(ROOT)
    print('Batch compiling md_source/ -> html_source/\n')
    compile_all()
    print('\nDone.')
