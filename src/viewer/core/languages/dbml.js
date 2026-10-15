// Local TextMate grammar for DBML source viewing, not schema validation.
// Syntax reference: https://dbml.dbdiagram.io/docs/
const identifier = String.raw`(?:"(?:[^"\\]|\\.)*"|[\p{L}_][\p{L}\p{N}_$]*)`
const declarations = 'TablePartial|TableGroup|Table|Enum|Project'

export default {
  name: 'dbml',
  scopeName: 'source.dbml',
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    {
      begin: String.raw`\b((?i:${declarations}))\s+`,
      beginCaptures: { 1: { name: 'keyword.declaration.dbml' } },
      end: '(?=[{\\[]|$)',
      patterns: [
        { match: '\\b(?i:as)\\b', name: 'keyword.control.dbml' },
        { match: identifier, name: 'entity.name.type.dbml' },
        { match: '\\.', name: 'punctuation.accessor.dbml' }
      ]
    },
    {
      match: String.raw`^(\s*)(?!(?i:${declarations}|Ref|Note|indexes|checks|records|TableRecords)\b)(${identifier})(\s+)(${identifier})`,
      captures: {
        2: { name: 'variable.other.property.dbml' },
        4: { name: 'storage.type.dbml' }
      }
    },
    { match: '\\b(?i:Ref|Note|indexes|checks|records|TableRecords|as)\\b', name: 'keyword.control.dbml' },
    {
      match: '\\b(?i:primary\\s+key|not\\s+null|set\\s+null|set\\s+default|no\\s+action|pk|unique|increment|default|ref|note|name|type|delete|update|cascade|restrict|headercolor|color|database_type)\\b',
      name: 'support.type.property-name.dbml'
    },
    { match: '\\b(?i:true|false|null)\\b', name: 'constant.language.dbml' },
    { match: '#[\\da-fA-F]+\\b', name: 'constant.other.color.rgb-value.dbml' },
    { match: '\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b', name: 'constant.numeric.dbml' },
    { match: String.raw`\??(?:<>|[<>-])\??|~`, name: 'keyword.operator.dbml' },
    { match: '[{}\\[\\]()]', name: 'punctuation.bracket.dbml' },
    { match: '[.,:]', name: 'punctuation.separator.dbml' }
  ],
  repository: {
    comments: {
      patterns: [
        { begin: '//', end: '$', name: 'comment.line.double-slash.dbml' },
        { begin: '/\\*', end: '\\*/', name: 'comment.block.dbml' }
      ]
    },
    strings: {
      patterns: [
        { begin: "'''", end: "'''", name: 'string.quoted.multi.dbml', patterns: [{ include: '#escapes' }] },
        { begin: "'", end: "'", name: 'string.quoted.single.dbml', patterns: [{ include: '#escapes' }] },
        { begin: '"', end: '"', name: 'string.quoted.double.dbml', patterns: [{ include: '#escapes' }] },
        { begin: '`', end: '`', name: 'string.interpolated.dbml', patterns: [{ include: '#escapes' }] }
      ]
    },
    escapes: { match: '\\\\.', name: 'constant.character.escape.dbml' }
  }
}
