import click
from pathlib import Path

# Define the default style path relative to this script
# This ensures the default works no matter where the command is run
DEFAULT_STYLE_PATH = str(Path(__file__).parent.parent / 'academic.css')

@click.command()
@click.argument('input_file', type=click.Path(exists=True, dir_okay=False, readable=True))
@click.argument('output_file', type=click.Path())
@click.option('--watch', '-w', is_flag=True, help='Watch for changes and recompile automatically.')
@click.option(
    '--style',
    type=click.Path(exists=True, dir_okay=False, readable=True),
    default=DEFAULT_STYLE_PATH,
    help='Path to the CSS stylesheet to use. Defaults to the academic style.'
)
def main(input_file, output_file, watch, style):
    """Compile markdown file to HTML with a custom stylesheet."""