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

function isIdentifierOrSchema(state: EditorState, node: SyntaxNode) {
  // Handle a case when a "public" schema is specified, which also counts as a SQL keyword
  return node.name == "Identifier" || node.name == "QuotedIdentifier" ||
    (node.name == "Keyword" && /^public$/i.test(state.sliceDoc(node.from, node.to)))
}

function parentsFor(state: EditorState, node: SyntaxNode | null) {
  for (let path = [];;) {
    if (!node || node.name != ".") return path
    let name = tokenBefore(node)
    if (!name || !isIdentifierOrSchema(state, name)) return path
    path.unshift(stripQuotes(state.sliceDoc(name.from, name.to)))
    node = tokenBefore(name)
  }
}

function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  if (pos.name == "Identifier" || pos.name == "QuotedIdentifier") {
    return {from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.sliceDoc(pos.from, pos.from + 1) : null,
            parents: parentsFor(state, tokenBefore(pos))}
  } if (pos.name == ".") {
    return {from: startPos,
            quoted: null,
            parents: parentsFor(state, pos)}
  } else {
    return {from: startPos, quoted: null, parents: [], empty: true}
  }
}

function maybeQuoteCompletions(quote: string | null, completions: readonly Completion[]) {
  if (!quote) return completions
  return completions.map(c => ({...c, label: quote + c.label + quote, apply: undefined}))
}

const Span = /^\w*$/, QuotedSpan = /^[`'"]?\w*[`'"]?$/

class CompletionLevel {
  list: readonly Completion[] = []
  children: {[name: string]: CompletionLevel} | undefined = undefined

  child(name: string) {
    let children = this.children || (this.children = Object.create(null))
    return children[name] || (children[name] = new CompletionLevel)
  }

  childCompletions(type: string) {
    return this.children ? Object.keys(this.children).filter(x => x).map(name => ({label: name, type} as Completion)) : []
  }
}

export function completeFromSchema(schema: {[table: string]: readonly (string | Completion)[]},
                                   tables?: readonly Completion[],
                                   defaultTableName?: string, defaultSchemaName?: string): CompletionSource {
  let top = new CompletionLevel
  let defaultSchema = top.child(defaultSchemaName || "")
  for (let table in schema) {
    let dot = table.indexOf(".")
    let schemaCompletions = dot > -1 ? top.child(table.slice(0, dot)) : defaultSchema
    let tableCompletions = schemaCompletions.child(dot > -1 ? table.slice(dot + 1) : table)
    tableCompletions.list = schema[table].map(val => typeof val == "string" ? {label: val, type: "property"} : val)
  }
  defaultSchema.list = (tables || defaultSchema.childCompletions("type"))
                         .concat(defaultTableName ? defaultSchema.child(defaultTableName).list : [])
  for (let sName in top.children) {
    let schema = top.child(sName)
    if (!schema.list.length) schema.list = schema.childCompletions("type")
  }
  top.list = defaultSchema.list.concat(top.childCompletions("type"))

  return (context: CompletionContext) => {
    let {parents, from, quoted, empty} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null
    let level = top
    for (let name of parents) {
      while (!level.children || !level.children[name]) {
        if (level == top) level = defaultSchema
        else if (level == defaultSchema && defaultTableName) level = level.child(defaultTableName)
        else return null
      }
      level = level.child(name)
    }
    let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
    return {
      from,
      to: quoteAfter ? context.pos + 1 : undefined,
      options: maybeQuoteCompletions(quoted, level.list),
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
