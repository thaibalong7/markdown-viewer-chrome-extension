# From Folder to Focus

## Product flow

```mermaid
flowchart TB
  Folder[Choose a local folder] --> Scan[Discover supported files]
  Scan --> Tree[Build a navigable workspace]
  Tree --> Read[Read Markdown]
  Tree --> Diagram[Preview Mermaid]
  Tree --> Image[Inspect images]
  Read --> Edit[Edit with live preview]
  Read --> Export[Export HTML or Word]
  Diagram --> Download[Download SVG or PNG]
```

## Why it works

The current document remains the stable entry point while the Files panel provides quick access to related resources. Browser Back and Forward continue to behave naturally.

## Document capabilities

| Format | Read | Outline | Edit | Preview |
| --- | :---: | :---: | :---: | :---: |
| Markdown | ✓ | ✓ | ✓ | ✓ |
| Mermaid | ✓ | — | — | ✓ |
| SQL and text | ✓ | — | — | — |
| Images | ✓ | — | — | ✓ |

