# Gherkin syntax guide (Cucumber)

This reference summarizes Gherkin syntax for `.feature` files and Markdown code fences labeled `gherkin` or `cucumber`. Markdown Plus uses Shiki's Gherkin grammar to highlight these fences; the extension does not parse or execute Cucumber scenarios. The standard reference is [Cucumber — Gherkin Reference](https://cucumber.io/docs/gherkin/reference/).

---

## 1. Purpose and lifecycle

- **Gherkin** describes behavior using **BDD** (Behavior-Driven Development).
- Each line starts with a **keyword** (or `*`), or contains a **table**, **multiline string**, or **comment**.
- A parser such as `@cucumber/gherkin` produces a **syntax tree**; the Cucumber runner generates **pickles** (executable test cases) from valid scenarios.

---

## 2. Feature files (`.feature`) — structure

A typical top-to-bottom structure is:

1. Optional **comments**: `# ...`
2. Optional **`# language: <language_code>`** declaration selecting the keyword dialect
3. Optional **tags** before `Feature:`
4. A **`Feature:`** line, required at the standard file level
5. An optional multiline **free-form description** below `Feature:`
6. An optional feature-level **`Background:`** containing shared steps for scenarios below it
7. One or more **`Rule:`**, **`Scenario:`**, or **`Scenario Outline:`** blocks; each `Rule` may have its own `Background`
8. **Steps** within each scenario; outlines also have an **`Examples:`** block with a table

---

## 3. Main keywords (default English dialect)

| Keyword | Purpose |
|--------|-----------|
| `Feature` | Names the high-level feature and groups the file's contents. |
| `Rule` (Gherkin 6+) | Groups scenarios by a business rule. |
| `Background` | Repeats steps before each `Scenario` within its feature or rule scope. |
| `Scenario` | Describes one concrete example. |
| `Scenario Outline` | Defines a template run with each data set from `Examples`. |
| `Examples` | Supplies a parameter table for a `Scenario Outline`. |
| `Given` | Describes the **context** or initial state. |
| `When` | Describes an **action** or event. |
| `Then` | Describes the **result** or expectation. |
| `And`, `But` | Continue the preceding step type (Given/When/Then). |
| `*` | Introduces a neutral step, handled according to the step definitions. |

**Indentation:** Gherkin grammar does not require leading whitespace, but the convention is to indent child content such as scenarios and steps by two spaces for readability.

---

## 4. Title lines (`Feature:`, `Scenario:`, etc.)

- A colon is usually followed by a **space** and a short name or title.
- A free-form multiline description can follow the title immediately, without a keyword, until the parser encounters another structural keyword, table, or special string block.

Minimal valid example:

```gherkin
Feature: Login
  A free-form description
  can span multiple lines here

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I see the home page
```

---

## 5. Tags

- Use `@name` on a separate line, usually directly above `Feature`, `Rule`, `Scenario`, `Scenario Outline`, or `Examples`.
- A block can have multiple tags.

```gherkin
@smoke @auth
Feature: Auth

@wip
Scenario: Unfinished scenario
  Given …
```

---

## 6. `Background`

- Contains steps run **before each** `Scenario` in its scope, after any `Before` hooks.
- One `Background` can appear at feature level, and one inside each `Rule`; it must precede the first `Scenario` / `Example` at that level.

```gherkin
Feature: Shopping cart

  Background:
    Given the user is logged in
    And the cart is empty

  Scenario: Add a product
    When …
    Then …
```

Rule-level example:

```gherkin
Feature: Overdue tasks

  Rule: Remind users on the first launch of the day
    Background:
      Given I have overdue tasks

    Scenario: First launch today
      Given the previous launch was yesterday
      When I open the application
      Then I see an overdue-task notification
```

---

## 7. `Rule` (Gherkin 6+)

- Groups scenarios by a rule, with a name and optional description like `Feature` or `Scenario`.

```gherkin
Feature: Payments

  Rule: Do not exceed the limit
    Scenario: Reject a payment over the limit
      Given the remaining limit is 100
      When I pay 200
      Then the system rejects the payment
```

---

## 8. `Scenario` and `Scenario Outline`

### Regular scenario

```gherkin
Scenario: Short title
  Given …
  When …
  Then …
```

### Scenario Outline + Examples

- Use **placeholders** in steps: `<ColumnName>`.
- An `Examples:` block contains a **table**: the first row names the columns, and subsequent rows supply values.

```gherkin
Scenario Outline: Login with different credentials
  Given the account <username> exists
  When I log in with <username> and <password>
  Then I see the message <message>

  Examples:
    | username | password | message        |
    | u1       | p1       | Success        |
    | u2       | bad      | Wrong password |
```

A single `Scenario Outline` can have **multiple** `Examples` blocks.

---

## 9. Steps

- Syntax: **keyword** + **space** + the remaining natural-language description.
- `And` / `But` continue the most recent step type in the same semantic group.
- Tools may support equivalent keywords in other dialects; see section 13.

```gherkin
Given I have 3 products in the cart
When I apply the discount code "SALE10"
Then the total is reduced by 10%
And the discounted total is 90
But the discount does not apply to type A products
* a custom step if the framework allows it
```

---

## 10. Data tables

- Attach a table to a step using lines beginning with `|`, indented relative to the step.
- Tables supply structured arguments; `|` separates cells.

```gherkin
Given the following products:
  | name | price |
  | A    | 1000  |
  | B    | 2000  |
```

An **Examples** table requires a header row to map placeholders.

---

## 11. Doc Strings (multiline strings)

- Use these for longer text: JSON, XML, payloads, or multiline descriptions.
- Open and close them with `"""` or three backticks; indentation beyond the delimiter column is preserved after the parser dedents the content.

```gherkin
Given the JSON payload:
  """
  { "a": 1, "b": 2 }
  """
```

A content-type annotation can also be supplied in supported versions; consult the corresponding Cucumber documentation.

---

## 12. Comments

- Comments are valid only at the start of a new line: optional whitespace, then `#` and the comment text.
- Gherkin does not support block comments or inline comments at the end of a syntax line.

```gherkin
# Test this feature before release
Feature: Reports
```

---

## 13. Keyword dialect header

- The first line, optionally after a BOM, takes this form:

```gherkin
# language: vi
```

- This selects Vietnamese keywords, where defined in `gherkin-languages` or its associated data file, instead of `Feature`, `Given`, and other English keywords.
- Use the exact dialect code supported by your tool, such as `en` or `vi`, depending on the installed version.

---

## 14. Markdown Plus compatibility

- Place content in a `gherkin`, `cucumber`, or `feature` fence for Shiki syntax highlighting:

  ````markdown
  ```gherkin
  Feature: …
    Scenario: …
      Given …
  ```
  ````

- Markdown Plus performs syntax highlighting only. It does not validate scenarios, build a Gherkin AST, or execute step definitions.
- Code-fence content is displayed as source code, preserving indentation and whitespace.
- `.feature` is not in the current document registry, so it neither activates the extension nor appears as an openable file in the Files explorer. To read it with Markdown Plus, place the content in a code fence inside a supported Markdown document.

---

## 15. Further references

- [Gherkin — Cucumber](https://cucumber.io/docs/gherkin/)
- [Step definitions & Cucumber expressions](https://cucumber.io/docs/cucumber/api/)
- [Messages / pickle schema](https://github.com/cucumber/messages) for test-runner integration

For bilingual keyword tables for a specific `language:` code, use your installed `@cucumber/gherkin` package's `gherkin-languages.json` or the documentation for your Cucumber version.
