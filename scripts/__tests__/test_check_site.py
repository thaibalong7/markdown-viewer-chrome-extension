"""Regression checks for errors that would break the published website."""

import importlib.util
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location("check_site", Path(__file__).resolve().parents[1] / "check-site.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class CheckSiteTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.write("index.html", '<h1 id="features">Home</h1><a href="./privacy/">Privacy</a>')
        self.write("privacy/index.html", '<a href="../#features">Home features</a>')

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def check_error(self, expected):
        errors, _ = checker.check_site(self.root)
        self.assertTrue(any(expected in error for error in errors), errors)

    def test_cross_page_links_and_encoded_paths(self):
        self.write("assets/my icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>')
        self.write("privacy/index.html", '<a href="../?theme=dark#features">Home</a><img src="../assets/my%20icon.svg">')
        self.assertEqual(checker.check_site(self.root), ([], 2))

    def test_missing_asset_fails(self):
        self.write("privacy/index.html", '<img src="../assets/missing.svg">')
        self.check_error("target does not exist")

    def test_missing_cross_page_anchor_fails(self):
        self.write("privacy/index.html", '<a href="../#missing">Home</a>')
        self.check_error("fragment does not exist")

    def test_root_relative_path_fails_under_project_hosting(self):
        self.write("index.html", '<a href="/privacy/">Privacy</a>')
        self.check_error("GitHub Pages project prefix")

    def test_path_outside_uploaded_directory_fails(self):
        self.write("index.html", '<a href="../README.md">Read more</a>')
        self.check_error("outside site/")

    def test_duplicate_ids_fail(self):
        self.write("index.html", '<h1 id="features">Home</h1><div id="features"></div>')
        self.check_error("duplicate id")

    def test_missing_required_privacy_page_fails(self):
        (self.root / "privacy/index.html").unlink()
        self.check_error("Missing required page: privacy/index.html")

    def test_external_links_are_not_mistaken_for_local_files(self):
        self.write("privacy/index.html", '<a href="https://example.com/policy">Policy</a><a href="mailto:hello@example.com">Email</a>')
        self.assertEqual(checker.check_site(self.root), ([], 2))


if __name__ == "__main__":
    unittest.main()
