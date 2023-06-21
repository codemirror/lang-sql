import {Completion, CompletionContext, CompletionSource, completeFromList, ifNotIn} from "@codemirror/autocomplete"
import {EditorState, Text} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {Type, Keyword} from "./sql.grammar.terms"
import {type SQLDialect} from "./sql"

function tokenBefore(tree: SyntaxNode) {
  let cursor = tree.cursor().moveTo(tree.from, -1)
  while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1)
  return cursor.node
}

function idName(doc: Text, node: SyntaxNode): string {
  let text = doc.sliceString(node.from, node.to)
  let quoted = /^([`'"])(.*)\1$/.exec(text)
  return quoted ? quoted[2] : text
}

function plainID(node: SyntaxNode | null) {
  return node && (node.name == "Identifier" || node.name == "QuotedIdentifier")
}

function pathFor(doc: Text, id: SyntaxNode) {
  if (id.name == "CompositeIdentifier") {
    let path = []
    for (let ch = id.firstChild; ch; ch = ch.nextSibling)
      if (plainID(ch)) path.push(idName(doc, ch))
    return path
  }
  return [idName(doc, id)]
}

function parentsFor(doc: Text, node: SyntaxNode | null) {
  for (let path = [];;) {
    if (!node || node.name != ".") return path
    let name = tokenBefore(node)
    if (!plainID(name)) return path
    path.unshift(idName(doc, name))
    node = tokenBefore(name)
  }
}

function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  let aliases = getAliases(state.doc, pos)
  if (pos.name == "Identifier" || pos.name == "QuotedIdentifier" || pos.name == "Keyword") {
    return {from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.doc.sliceString(pos.from, pos.from + 1) : null,
            parents: parentsFor(state.doc, tokenBefore(pos)),
            aliases}
  } if (pos.name == ".") {
    return {from: startPos, quoted: null, parents: parentsFor(state.doc, pos), aliases}
  } else {
    return {from: startPos, quoted: null, parents: [], empty: true, aliases}
  }
}

const EndFrom = new Set("where group having order union intersect except all distinct limit offset fetch for".split(" "))

function getAliases(doc: Text, at: SyntaxNode) {
  let statement
  for (let parent: SyntaxNode | null = at; !statement; parent = parent.parent) {
    if (!parent) return null
    if (parent.name == "Statement") statement = parent
  }
  let aliases = null
  for (let scan = statement.firstChild, sawFrom = false, prevID: SyntaxNode | null = null; scan; scan = scan.nextSibling) {
    let kw = scan.name == "Keyword" ? doc.sliceString(scan.from, scan.to).toLowerCase() : null
    let alias = null
    if (!sawFrom) {
      sawFrom = kw == "from"
    } else if (kw == "as" && prevID && plainID(scan.nextSibling)) {
      alias = idName(doc, scan.nextSibling!)
    } else if (kw && EndFrom.has(kw)) {
      break
    } else if (prevID && plainID(scan)) {
      alias = idName(doc, scan)
    }
    if (alias) {
      if (!aliases) aliases = Object.create(null)
      aliases[alias] = pathFor(doc, prevID!)
    }
    prevID = /Identifier$/.test(scan.name) ? scan : null
  }
  return aliases
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

  childCompletions(type: string, idQuote: string) {
    return this.children ? Object.keys(this.children).filter(x => x).map(name => nameCompletion(name, type, idQuote)) : []
  }
}

function nameCompletion(label: string, type: string, idQuote: string): Completion {
  if (!/[^\w\xb5-\uffff]/.test(label)) return {label, type}
  return {label, type, apply: idQuote + label + idQuote}
}

export function completeFromSchema(schema: {[table: string]: readonly (string | Completion)[]},
                                   tables?: readonly Completion[], schemas?: readonly Completion[],
                                   defaultTableName?: string, defaultSchemaName?: string,
                                   dialect?: SQLDialect): CompletionSource {
  let top = new CompletionLevel
  let defaultSchema = top.child(defaultSchemaName || "")
  let idQuote = dialect?.spec.identifierQuotes?.[0] || '"'
  for (let table in schema) {
    let dot = table.indexOf(".")
    let schemaCompletions = dot > -1 ? top.child(table.slice(0, dot)) : defaultSchema
    let tableCompletions = schemaCompletions.child(dot > -1 ? table.slice(dot + 1) : table)
    tableCompletions.list = schema[table].map(val => typeof val == "string" ? nameCompletion(val, "property", idQuote) : val)
  }
  defaultSchema.list = (tables || defaultSchema.childCompletions("type", idQuote))
                         .concat(defaultTableName ? defaultSchema.child(defaultTableName).list : [])
  for (let sName in top.children) {
    let schema = top.child(sName)
    if (!schema.list.length) schema.list = schema.childCompletions("type", idQuote)
  }
  top.list = defaultSchema.list.concat(schemas || top.childCompletions("type", idQuote))

  return (context: CompletionContext) => {
    let {parents, from, quoted, empty, aliases} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null
    if (aliases && parents.length == 1) parents = aliases[parents[0]] || parents
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
    let options = level.list
    if (level == top && aliases)
      options = options.concat(Object.keys(aliases).map(name => ({label: name, type: "constant"})))
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
