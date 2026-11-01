"""Website locale coverage, safe rendering and static navigation contracts."""

import importlib.util
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('localize_site', Path(__file__).resolve().parents[1] / 'localize-site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)

check_spec = importlib.util.spec_from_file_location('check_site', Path(__file__).resolve().parents[1] / 'check-site.py')
checker = importlib.util.module_from_spec(check_spec)
check_spec.loader.exec_module(checker)


class SiteLocalizationTests(unittest.TestCase):
    def test_languages_match_the_extension_registry(self):
        registry = (site.ROOT / 'src/i18n/languages.js').read_text()
        values = set(re.findall(r"value: '([^']+)'", registry)) - {'auto'}
        self.assertEqual(set(site.LANGUAGES), values)

    def test_all_generated_editions_are_current_and_have_valid_project_links(self):
        outputs = site.render_pages()
        self.assertEqual(len(outputs), 12)
        for path, content in outputs.items():
            self.assertEqual((site.ROOT / 'site' / path).read_text(), content, str(path))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path, content in outputs.items():
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content)
            # Only the shared assets are external to the renderer's output.
            (root / 'assets').mkdir()
            for path in (site.ROOT / 'site/assets').iterdir():
                (root / 'assets' / path.name).write_bytes(path.read_bytes())
            self.assertEqual(checker.check_site(root), ([], 12))

    def test_language_links_keep_the_current_page_and_internal_links_keep_the_locale(self):
        outputs = site.render_pages()
        for locale in site.LANGUAGES:
            for page in site.PAGES:
                path = site.page_path(locale, page)
                content = outputs[path]
                self.assertIn(f'<html lang="{locale}">', content)
                for other in site.LANGUAGES:
                    url = site.relative_url(path, site.page_path(other, page))
                    self.assertIn(f'href="{url}" lang="{other}" hreflang="{other}" data-language-link', content)
                    self.assertIn(f'rel="alternate" hreflang="{other}" href="{url}"', content)
                if page == 'home':
                    self.assertIn(f'href="{site.relative_url(path, site.page_path(locale, "privacy"))}"', content)
                else:
                    self.assertIn(f'href="{site.relative_url(path, site.page_path(locale, "home"))}#features"', content)
                self.assertIn(f'href="{site.relative_url(path, site.page_path(locale, "guide"))}"', content)

    def test_guide_chapters_practice_file_and_illustrations_are_available_in_every_locale(self):
        outputs = site.render_pages()
        chapters = None
        for locale in site.LANGUAGES:
            html = outputs[site.page_path(locale, 'guide')]
            current = re.findall(r'class="guide-section" id="([^"]+)"', html)
            self.assertEqual(len(current), 11)
            chapters = current if chapters is None else chapters
            self.assertEqual(current, chapters)
            contents = re.search(r'<aside class="policy-sidebar guide-sidebar">(.*?)</aside>', html, re.S)[1]
            for chapter in current:
                self.assertEqual(contents.count(f'href="#{chapter}"><span>'), 2)
            self.assertIn('download="markdown-plus-tour.md"', html)
            figures = re.findall(r'data-guide-scene="([^"]+)"', html)
            self.assertEqual(len(figures), 18)
            self.assertEqual(len(set(figures)), 18)
            for chapter in current:
                section = re.search(rf'<section class="guide-section" id="{chapter}".*?</section>', html, re.S)[0]
                self.assertIn('data-guide-scene=', section, chapter)
            for scene in figures:
                self.assertIn(f'guide-{locale}-{scene}.jpg', html)
            self.assertIn('<kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd>', html)
        practice = (site.ROOT / 'site/assets/markdown-plus-tour.md').read_text()
        for syntax in ['```mermaid', '```javascript', '> [!TIP]', '$E = mc^2$', '[^local]']:
            self.assertIn(syntax, practice)
        # The downloadable exercise must not initiate remote resource requests.
        self.assertNotIn('https://', practice)

    def test_document_source_filenames_and_policy_technical_values_stay_literal(self):
        outputs = site.render_pages()
        source = None
        for locale in site.LANGUAGES:
            home = outputs[site.page_path(locale, 'home')]
            sample = re.search(r'<pre[^>]*id="sample-source"[^>]*>(.*?)</pre>', home, re.S)[1]
            source = sample if source is None else source
            self.assertEqual(sample, source)
            self.assertIn('file:///Documents/my-workspace/README.md', home)
            policy = outputs[site.page_path(locale, 'privacy')]
            self.assertIn('datetime="2026-10-30"', policy)
            for literal in ['chrome.storage.sync', 'chrome.storage.local', 'cdn.jsdelivr.net', 'file:///*', 'offscreen', 'downloads']:
                self.assertIn(f'<code>{literal}</code>', policy)

    def test_missing_keys_and_changed_placeholders_fail_instead_of_shipping_english_fallback(self):
        catalogs, slots = site.load_catalogs()
        catalogs['vi'].pop('shared.skip')
        with patch.object(site.json, 'loads', side_effect=[*catalogs.values(), slots]):
            with self.assertRaisesRegex(ValueError, 'catalog keys differ'):
                site.load_catalogs()
        catalogs, slots = site.load_catalogs()
        catalogs['zh-CN']['home.start.open.description'] = '打开文件。'
        with patch.object(site.json, 'loads', side_effect=[*catalogs.values(), slots]):
            with self.assertRaisesRegex(ValueError, 'placeholders differ'):
                site.load_catalogs()

    def test_translation_markup_is_escaped(self):
        catalogs, slots = site.load_catalogs()
        catalogs['vi']['shared.skip'] = '<img src=x onerror=alert(1)>'
        with patch.object(site, 'load_catalogs', return_value=(catalogs, slots)):
            html = site.render_pages()[site.page_path('vi', 'home')]
            self.assertIn('&lt;img src=x onerror=alert(1)&gt;', html)
            self.assertNotIn('<img src=x onerror=alert(1)>', html)


if __name__ == '__main__':
    unittest.main()
