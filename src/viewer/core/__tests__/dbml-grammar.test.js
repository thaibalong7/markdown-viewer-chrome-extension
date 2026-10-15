import { describe, expect, it } from 'vitest'
import { getShikiHighlighter, highlightCode, applyShikiToFencedCode } from '../shiki-highlighter.js'
import { resolveShikiLangId, loadShikiLanguageModule } from '../shiki-config.js'

describe('DBML grammar', () => {
  async function tokens(source) {
    const highlighter = await getShikiHighlighter()
    await highlighter.loadLanguage((await loadShikiLanguageModule('dbml')).default)
    return highlighter.codeToTokensBase(source, { lang: 'dbml', theme: 'github-light', includeExplanation: true }).flat()
  }

  function scopesFor(tokens, text) {
    const token = tokens.find(token => token.content === text)
    expect(token, `Missing token: ${text}`).toBeDefined()
    return token.explanation.flatMap(part => part.scopes.map(scope => scope.scopeName))
  }

  it('uses its own lazy language id and highlights declarations, fields, types, settings and colors', async () => {
    expect(resolveShikiLangId('DBML')).toBe('dbml')
    const result = await tokens('Table core.users [headercolor: #3498DB] {\n  id bigint [pk]\n  enabled bool [default: true]\n}\nRef: users.id < posts.user_id')
    expect(scopesFor(result, 'Table')).toContain('keyword.declaration.dbml')
    expect(scopesFor(result, 'users')).toContain('entity.name.type.dbml')
    expect(scopesFor(result, 'bigint')).toContain('storage.type.dbml')
    expect(scopesFor(result, 'pk')).toContain('support.type.property-name.dbml')
    expect(scopesFor(result, '#3498DB')).toContain('constant.other.color.rgb-value.dbml')
    expect(scopesFor(result, 'true')).toContain('constant.language.dbml')
    expect(scopesFor(result, '<')).toContain('keyword.operator.dbml')
  })

  it('keeps multiline comments/notes, escaped strings and expression defaults in their own scopes', async () => {
    const result = await tokens("/* comment\nTable not_a_table\n*/\nNote: '''\nTable note_text\n'''\n  title varchar [default: 'it\\'s okay']\n  created_at timestamp [default: `now()`]")
    expect(scopesFor(result, 'Table not_a_table')).toContain('comment.block.dbml')
    expect(scopesFor(result, 'Table note_text')).toContain('string.quoted.multi.dbml')
    expect(scopesFor(result, "\\'")).toContain('constant.character.escape.dbml')
    expect(scopesFor(result, '`now()`')).toContain('string.interpolated.dbml')
  })

  it('supports quoted identifiers, custom types, enums, groups, partials and relationship operators', async () => {
    const result = await tokens('Table "order items" as O {\n  "order id" custom_type\n}\nEnum status {\n  pending\n}\nTableGroup sales {}\nTablePartial shared {}\nRef: users.id <> O.id')
    expect(scopesFor(result, 'custom_type')).toContain('storage.type.dbml')
    expect(scopesFor(result, 'Enum')).toContain('keyword.declaration.dbml')
    expect(scopesFor(result, 'TableGroup')).toContain('keyword.declaration.dbml')
    expect(scopesFor(result, 'TablePartial')).toContain('keyword.declaration.dbml')
    expect(scopesFor(result, '<>')).toContain('keyword.operator.dbml')
  })

  it('also highlights dbml fences and follows the active syntax theme', async () => {
    const source = 'Table users {\n  id integer [pk]\n}'
    const light = await highlightCode(source, 'dbml')
    const dark = await highlightCode(source, 'dbml', { theme: { activeId: 'dark' } })
    expect(light).toContain('shiki github-light')
    expect(dark).toContain('shiki github-dark')
    expect(light).not.toBe(dark)
    const fence = await applyShikiToFencedCode(`<pre><code class="language-dbml">${source}</code></pre>`)
    expect(fence).toContain('data-mdp-lang="dbml"')
    expect(fence).toContain('class="line"')
  })
})
