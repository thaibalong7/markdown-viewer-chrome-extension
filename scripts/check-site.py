#!/usr/bin/env python3
"""Check the buildless site's local links before publishing to GitHub Pages."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.errors = []
        self.feed(path.read_text(encoding="utf-8"))
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        identifier = attrs.get("id")
        if identifier:
            if identifier in self.ids:
                self.errors.append(f"line {self.getpos()[0]}: duplicate id {identifier!r}")
            self.ids.add(identifier)
        for attribute in ("href", "src", "poster"):
            value = attrs.get(attribute)
            if value:
                self.links.append((self.getpos()[0], value))


def check_site(directory):
    root = Path(directory).resolve()
    errors = []
    pages = {path.resolve(): Page(path) for path in root.rglob("*.html")}
    for required in ("index.html", "privacy/index.html"):
        if root / required not in pages:
            errors.append(f"Missing required page: {required}")

    for path, page in pages.items():
        label = str(path.relative_to(root))
        errors.extend(f"{label}: {error}" for error in page.errors)
        for line, value in page.links:
            prefix = f"{label}:{line}: {value!r}"
            try:
                url = urlsplit(value.strip())
            except ValueError as error:
                errors.append(f"{prefix}: invalid URL ({error})")
                continue
            if url.scheme or url.netloc:
                continue  # Remote destinations are not fetched by this local check.
            url_path = unquote(url.path)
            if url_path.startswith("/"):
                errors.append(f"{prefix}: use a relative URL to preserve the GitHub Pages project prefix")
                continue
            target = (path.parent / url_path).resolve() if url_path else path
            if not target.is_relative_to(root):
                errors.append(f"{prefix}: target is outside site/")
                continue
            if target.is_dir() or url_path.endswith("/"):
                target /= "index.html"
            if not target.is_file():
                errors.append(f"{prefix}: target does not exist")
                continue
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f"{prefix}: fragment does not exist in {target.relative_to(root)}")
    return errors, len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path(__file__).resolve().parent.parent / "site")
    args = parser.parse_args()
    errors, count = check_site(args.directory)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"OK: {count} HTML pages; local links, assets, anchors, and GitHub Pages paths are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
