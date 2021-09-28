import {Completion, CompletionContext, CompletionSource, completeFromList, ifNotIn} from "@codemirror/autocomplete"
import {EditorState} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {Type, Keyword} from "./sql.grammar.terms"

export function tokenBefore(tree: SyntaxNode) {
  let cursor = tree.cursor.moveTo(tree.from, -1)
  while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1)
  return cursor.node
}

export function stripQuotes(name: string) {
  let quoted = /^[`'"](.*)[`'"]$/.exec(name)
  return quoted ? quoted[1] : name
}

export function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  let empty = false
  if (pos.name == "Identifier" || pos.name == "QuotedIdentifier") {
    empty = false
    let parent = null
    let dot = tokenBefore(pos)
    if (dot && dot.name == ".") {
      let before = tokenBefore(dot)
      if (before && before.name == "Identifier" || before.name == "QuotedIdentifier")
        parent = stripQuotes(state.sliceDoc(before.from, before.to).toLowerCase())
    }
    return {parent,
            from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.sliceDoc(pos.from, pos.from + 1) : null}
  } else if (pos.name == ".") {
    let before = tokenBefore(pos)
    if (before && before.name == "Identifier" || before.name == "QuotedIdentifier")
      return {parent: stripQuotes(state.sliceDoc(before.from, before.to).toLowerCase()),
              from: startPos,
              quoted: null}
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
  let byTable: {[table: string]: readonly Completion[]} = Object.create(null)
  for (let table in schema) byTable[table] = schema[table].map(val => {
    return typeof val == "string" ? {label: val, type: "property"} : val
  })
  let topOptions: readonly Completion[] =
    (tables || Object.keys(byTable).map(name => ({label: name, type: "type"} as Completion)))
    .concat(defaultTable && byTable[defaultTable] || [])

  return (context: CompletionContext) => {
    let {parent, from, quoted, empty} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null
    let options = topOptions
    if (parent) {
      let columns = byTable[parent]
      if (!columns) return null
      options = columns
    }
    let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
    return {
      from,
      to: quoteAfter ? context.pos + 1 : undefined,
      options: maybeQuoteCompletions(quoted, options),
      span: quoted ? QuotedSpan : Span
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
