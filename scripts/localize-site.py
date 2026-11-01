#!/usr/bin/env python3
"""Render checked-in, JavaScript-independent website editions from shared templates."""

import argparse
from collections import Counter
from html import escape
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts' / 'site'
LANGUAGES = {'en': ('English', 'EN'), 'vi': ('Tiếng Việt', 'VI'), 'zh-CN': ('简体中文（中国）', '简中')}
PAGES = {'home': 'index.html', 'guide': 'guide/index.html', 'privacy': 'privacy/index.html'}
MESSAGE = re.compile(r'\{\{([\w.-]+)\}\}')
SLOT = re.compile(r'\{([A-Za-z][A-Za-z0-9]*)\}')


def load_catalogs(source=SOURCE):
    catalogs = {locale: json.loads((source / 'locales' / f'{locale}.json').read_text(encoding='utf-8')) for locale in LANGUAGES}
    english = catalogs['en']
    slots = json.loads((source / 'slots.json').read_text(encoding='utf-8'))
    for locale, catalog in catalogs.items():
        if catalog.keys() != english.keys():
            raise ValueError(f'{locale}: catalog keys differ from English')
        for key, value in catalog.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f'{locale}: empty message {key}')
            if Counter(SLOT.findall(value)) != Counter(SLOT.findall(english[key])):
                raise ValueError(f'{locale}: placeholders differ for {key}')
            # Rich-text slots are fixed markup owned by the template, never by translations.
            if set(SLOT.findall(value)) != set(slots.get(key, {})):
                raise ValueError(f'{locale}: unknown markup slots for {key}')
            stack = []
            for token in SLOT.findall(value):
                if token.endswith('Open'):
                    stack.append(token[:-4])
                elif token.endswith('Close') and (not stack or stack.pop() != token[:-5]):
                    raise ValueError(f'{locale}: unbalanced markup for {key}')
            if stack:
                raise ValueError(f'{locale}: unclosed markup for {key}')
    return catalogs, slots


def page_path(locale, page):
    prefix = '' if locale == 'en' else f'{locale}/'
    return Path(prefix + PAGES[page])


def relative_url(current, target):
    relative = os.path.relpath(target, current.parent).replace(os.sep, '/')
    if target.name == 'index.html':
        return relative[:-10] or './'
    return relative


def render_pages(source=SOURCE):
    catalogs, slots = load_catalogs(source)
    image_sizes = json.loads((source / 'guide-images.json').read_text(encoding='utf-8'))
    outputs = {}
    for locale, (name, short) in LANGUAGES.items():
        for page in PAGES:
            current = page_path(locale, page)
            links, alternates = [], []
            for other, (label, _) in LANGUAGES.items():
                url = relative_url(current, page_path(other, page))
                active = ' aria-current="true"' if other == locale else ''
                links.append(f'<a href="{url}" lang="{other}" hreflang="{other}" data-language-link{active}>{label}</a>')
                alternates.append(f'<link rel="alternate" hreflang="{other}" href="{url}">')
            alternates.append(f'<link rel="alternate" hreflang="x-default" href="{relative_url(current, page_path("en", page))}">')
            values = {
                'locale': locale,
                'language.short': short,
                'language.links': ''.join(links),
                'language.alternates': '\n  '.join(alternates),
                'paths.assets': relative_url(current, Path('assets/placeholder')).removesuffix('placeholder'),
                'paths.home': relative_url(current, page_path(locale, 'home')),
                'paths.guide': relative_url(current, page_path(locale, 'guide')),
                'paths.privacy': relative_url(current, page_path(locale, 'privacy')),
            }
            for scene, (width, height) in image_sizes[locale].items():
                if any(type(size) is not int or not 0 < size <= 5000 for size in (width, height)):
                    raise ValueError(f'Invalid guide image dimensions: {locale}/{scene}')
                values[f'images.{scene}.width'] = str(width)
                values[f'images.{scene}.height'] = str(height)

            def replace(match):
                key = match[1]
                if key in values:
                    return values[key]
                if key not in catalogs[locale]:
                    raise ValueError(f'{locale}: unknown template message {key}')
                # Escape every translation before substituting explicitly registered markup.
                return SLOT.sub(lambda slot: slots[key][slot[1]], escape(catalogs[locale][key], quote=True))

            template = (source / 'templates' / f'{page}.html').read_text(encoding='utf-8')
            rendered = MESSAGE.sub(replace, template)
            if MESSAGE.search(rendered):
                raise ValueError(f'{locale}/{page}: unresolved template marker')
            outputs[current] = rendered
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if committed HTML is missing or stale')
    args = parser.parse_args()
    stale = []
    for relative, content in render_pages().items():
        path = ROOT / 'site' / relative
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8') != content:
                stale.append(str(relative))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding='utf-8')
    if stale:
        parser.exit(1, 'Stale website pages: ' + ', '.join(stale) + '\nRun python3 -B scripts/localize-site.py\n')
    print(f'OK: all {len(LANGUAGES) * len(PAGES)} localized website pages ' + ('are current.' if args.check else 'generated.'))


if __name__ == '__main__':
    main()
