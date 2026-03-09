"""Command-line interface for MD Compiler."""

import click
import markdown
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time
import sys
import re
import uuid
import os

# Define the default style path relative to this script
DEFAULT_STYLE_PATH = str(Path(__file__).resolve().parent.parent / 'academic.css')

class MarkdownHandler(FileSystemEventHandler):
    """Handler for file system events."""

    def __init__(self, input_path, output_path, callback, style):
        self.input_path = input_path
        self.output_path = output_path
        self.callback = callback
        self.style = style

    def on_modified(self, event):
        if event.src_path == str(self.input_path):
            click.echo(f"File changed: {self.input_path}")
            self.callback(self.input_path, self.output_path, self.style)


def compile_markdown(input_path, output_path, style):
    """Compile markdown file to HTML."""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()

        math_placeholders = {}
        def protect_math(match):
            placeholder = f'MATH_{uuid.uuid4().hex}'
            math_placeholders[placeholder] = match.group(0)
            return placeholder

        protected_content = markdown_content
        protected_content = re.sub(r'\\\[(.*?)\\\]', protect_math, protected_content, flags=re.DOTALL)
        protected_content = re.sub(r'\$\$(.*?)\$\$', protect_math, protected_content, flags=re.DOTALL)
        protected_content = re.sub(r'\\\((.*?)\\\)', protect_math, protected_content)
        protected_content = re.sub(r'(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)', protect_math, protected_content)

        md = markdown.Markdown(extensions=['extra', 'codehilite', 'toc', 'meta', 'nl2br', 'sane_lists', 'smarty', 'wikilinks'])
        html_content = md.convert(protected_content)

        for placeholder, original_math in math_placeholders.items():
            if placeholder in html_content:
                html_content = html_content.replace(placeholder, original_math)

        html_content = re.sub(r'<p>\s*<div class="math-display">', '<div class="math-display">', html_content)
        html_content = re.sub(r'</div>\s*</p>', '</div>', html_content)

        # Step 5: Build final HTML using a relative path for the stylesheet
        output_abs_path = Path(output_path).resolve()
        style_abs_path = Path(style).resolve()
        output_dir = output_abs_path.parent
        relative_css_path = os.path.relpath(style_abs_path, start=output_dir)
        relative_css_path = relative_css_path.replace('\\', '/')
        style_link = f'<link rel="stylesheet" href="{relative_css_path}">'

        base_head_content = f'''
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{input_path.name}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {{
            renderMathInElement(document.body, {{
                delimiters: [
                    {{left: '$$', right: '$$', display: true}},
                    {{left: '$', right: '$', display: false}},
                    {{left: '\\\\(', right: '\\\\)', display: false}},
                    {{left: '\\\\[', right: '\\\\]', display: true}}
                ],
                throwOnError: false,
                strict: false
            }});
        }});
    </script>
    {style_link}
        '''

        full_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
{base_head_content}
</head>
<body>
<div class="main-container">
{html_content}
</div>
</body>
</html>'''

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

        click.echo(f"Compiled {input_path} to {output_path} using stylesheet at '{style}'.")
        return True

    except Exception as e:
        click.echo(f"Error compiling {input_path}: {e}", err=True)
        return False


@click.command()
@click.argument('input_file', type=click.Path(exists=True, dir_okay=False, readable=True))
@click.argument('output_file', type=click.Path())
@click.option('--watch', '-w', is_flag=True, help='Watch for changes and recompile automatically.')
@click.option(
    '--style',
    type=click.Path(exists=True, dir_okay=False, readable=True),
    default=DEFAULT_STYLE_PATH,
    help=f'Path to the CSS stylesheet. Defaults to: {DEFAULT_STYLE_PATH}'
)
def main(input_file, output_file, watch, style):
    """Compile markdown file to HTML with a custom stylesheet."""
    input_path = Path(input_file)
    output_path = Path(output_file)

    if not compile_markdown(input_path, output_path, style):
        sys.exit(1)

    if watch:
        click.echo(f"Watching {input_path} for changes... (Press Ctrl+C to stop)")
        event_handler = MarkdownHandler(input_path, output_path, compile_markdown, style)
        observer = Observer()
        observer.schedule(event_handler, path=input_path.parent, recursive=False)
        observer.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            click.echo("\nStopped watching.")
        observer.join()


if __name__ == '__main__':
    main()
