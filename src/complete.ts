import {Completion, CompletionContext, CompletionSource, completeFromList, ifNotIn} from "@codemirror/autocomplete"
import {EditorState} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {Type, Keyword} from "./sql.grammar.terms"

function tokenBefore(tree: SyntaxNode) {
  let cursor = tree.cursor().moveTo(tree.from, -1)
  while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1)
  return cursor.node
}

function stripQuotes(name: string) {
  let quoted = /^[`'"](.*)[`'"]$/.exec(name)
  return quoted ? quoted[1] : name
}

function isIdentifier(state: EditorState, node: SyntaxNode) {
  let value = stripQuotes(state.sliceDoc(node.from, node.to)).toLowerCase()

  // Handle a case when a "public" schema is specified, which also counts as a SQL keyword
  return node.name == "Identifier" || node.name == "QuotedIdentifier" || (node.name == "Keyword" && value == "public")  
}

function schemaBefore(state: EditorState, tree: SyntaxNode) {
  let dot = tokenBefore(tree)

  if (dot && dot.name == ".") {
    let schema = tokenBefore(dot)

    if (schema && isIdentifier(state, schema)) {
      return schema
    }
  }

  return null
}

function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  let empty = false
  if (isIdentifier(state, pos)) {
    empty = false
    let parent = null
    let dot = tokenBefore(pos)
    if (dot && dot.name == ".") {
      let before = tokenBefore(dot)
      if (before && isIdentifier(state, before)) {
        let table = stripQuotes(state.sliceDoc(before.from, before.to))
        let schema = schemaBefore(state, before)
        let schemaName = schema ? stripQuotes(state.sliceDoc(schema.from, schema.to)) : null
        parent = schemaName ? `${schemaName}.${table}` : table
      }
    }
    return {parent,
            from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.sliceDoc(pos.from, pos.from + 1) : null}
  } else if (pos.name == ".") {
    let before = tokenBefore(pos)
    if (before && isIdentifier(state, before)) {
      let table = stripQuotes(state.sliceDoc(before.from, before.to))
      let schema = schemaBefore(state, before)
      let schemaName = schema ? stripQuotes(state.sliceDoc(schema.from, schema.to)) : null

      return {parent: schemaName ? `${schemaName}.${table}` : table,
              from: startPos,
              quoted: null}
    }
  } else {
    empty = true
  }
  return {parent: null, from: startPos, quoted: null, empty}
}

function maybeQuoteCompletions(quote: string | null, completions: readonly Completion[]) {
  if (!quote) return completions
  return completions.map(c => ({...c, label: quote + c.label + quote, apply: undefined}))
}

const Span = /^\w*$/, QuotedSpan = /^[`'"]?\w*[`'"]?$/

export function completeFromSchema(schema: {[table: string]: readonly (string | Completion)[]},
                                   tables?: readonly Completion[],
                                   defaultTable?: string): CompletionSource {
  let bySchema: {[schema: string]: readonly Completion[]} = Object.create(null)
  let byTable: {[table: string]: readonly Completion[]} = Object.create(null)

  for (let table in schema) {
    if (table.includes(".")) {
      let [schemaName, tableName] = table.split(".")

      if (!Array.isArray(bySchema[schemaName])) {
        bySchema[schemaName] = []
      }

      bySchema[schemaName].push({label: tableName, type: "type"})
    }

    byTable[table] = schema[table].map(val => {
      return typeof val == "string" ? {label: val, type: "property"} : val    
    })
  }

  let topOptions: readonly Completion[] =
    (tables || Object.keys(byTable).map(name => ({label: name, type: "type"} as Completion)))
    .concat(defaultTable && byTable[defaultTable] || [])

  return (context: CompletionContext) => {
    let {parent, from, quoted, empty} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null
    let options = topOptions
    if (parent) {
      let completions = bySchema[parent] || byTable[parent]
      if (!completions) return null
      options = completions
    }
    let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
    return {
      from,
      to: quoteAfter ? context.pos + 1 : undefined,
      options: maybeQuoteCompletions(quoted, options),
      validFor: quoted ? QuotedSpan : Span
    }
  }
}

export function completeKeywords(keywords: {[name: string]: number}, upperCase: boolean) {
  let completions =  Object.keys(keywords).map(keyword => ({
    label: upperCase ? keyword.toUpperCase() : keyword,
    type: keywords[keyword] == Type ? "type" : keywords[keyword] == Keyword ? "keyword" : "variable",
    boost: -1
  }))
  return ifNotIn(["QuotedIdentifier", "SpecialVar", "String", "LineComment", "BlockComment", "."],
                 completeFromList(completions))
}
