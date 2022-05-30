import {EditorState} from "@codemirror/state"
import {CompletionContext, CompletionResult, CompletionSource} from "@codemirror/autocomplete"
import {schemaCompletionSource, PostgreSQL, MySQL, SQLConfig} from "@codemirror/lang-sql"
import ist from "ist"

function get(doc: string, conf: SQLConfig & {explicit?: boolean} = {}) {
  let cur = doc.indexOf("|"), dialect = conf.dialect || PostgreSQL
  doc = doc.slice(0, cur) + doc.slice(cur + 1)
  let state = EditorState.create({
    doc,
    selection: {anchor: cur},
    extensions: [dialect, dialect.language.data.of({
      autocomplete: schemaCompletionSource(Object.assign({dialect}, conf))
    })]
  })
  let result = state.languageDataAt<CompletionSource>("autocomplete", cur)[0](new CompletionContext(state, cur, !!conf.explicit))
  return result as CompletionResult | null
}

function str(result: CompletionResult | null) {
  return !result ? "" : result.options.slice()
    .sort((a, b) => (b.boost || 0) - (a.boost || 0) || (a.label < b.label ? -1 : 1))
    .map(o => o.label)
    .join(", ")
}

let schema1 = {
  users: ["name", "id", "address"],
  products: ["name", "cost", "description"]
}

let schema2 = {
  "public.users": ["email", "id"],
  "other.users": ["name", "id"]
}

describe("SQL completion", () => {
  it("completes table names", () => {
    ist(str(get("select u|", {schema: schema1})), "products, users")
  })

  it("completes quoted table names", () => {
    ist(str(get('select "u|', {schema: schema1})), '"products", "users"')
  })

  it("completes table names under schema", () => {
    ist(str(get("select public.u|", {schema: schema2})), "users")
  })

  it("completes quoted table names under schema", () => {
    ist(str(get('select public."u|', {schema: schema2})), '"users"')
  })

  it("completes quoted table names under quoted schema", () => {
    ist(str(get('select "public"."u|', {schema: schema2})), '"users"')
  })

  it("completes column names", () => {
    ist(str(get("select users.|", {schema: schema1})), "address, id, name")
  })

  it("completes quoted column names", () => {
    ist(str(get('select users."|', {schema: schema1})), '"address", "id", "name"')
  })

  it("completes column names in quoted tables", () => {
    ist(str(get('select "users".|', {schema: schema1})), "address, id, name")
  })

  it("completes column names in tables for a specific schema", () => {
    ist(str(get("select public.users.|", {schema: schema2})), "email, id")
    ist(str(get("select other.users.|", {schema: schema2})), "id, name")
  })

  it("completes quoted column names in tables for a specific schema", () => {
    ist(str(get('select public.users."|', {schema: schema2})), '"email", "id"')
    ist(str(get('select other.users."|', {schema: schema2})), '"id", "name"')
  })

  it("completes column names in quoted tables for a specific schema", () => {
    ist(str(get('select public."users".|', {schema: schema2})), "email, id")
    ist(str(get('select other."users".|', {schema: schema2})), "id, name")
  })

  it("completes column names in quoted tables for a specific quoted schema", () => {
    ist(str(get('select "public"."users".|', {schema: schema2})), "email, id")
    ist(str(get('select "other"."users".|', {schema: schema2})), "id, name")
  })

  it("completes quoted column names in quoted tables for a specific quoted schema", () => {
    ist(str(get('select "public"."users"."|', {schema: schema2})), '"email", "id"')
    ist(str(get('select "other"."users"."|', {schema: schema2})), '"id", "name"')
  })

  it("includes closing quote in completion", () => {
    let r = get('select "u|"', {schema: schema1})
    ist(r!.to, 10)
  })

  it("keeps extra table completion properties", () => {
    let r = get("select u|", {schema: {users: ["id"]}, tables: [{label: "users", type: "keyword"}]})
    ist(r!.options[0].type, "keyword")
  })

  it("keeps extra column completion properties", () => {
    let r = get("select users.|", {schema: {users: [{label: "id", type: "keyword"}]}})
    ist(r!.options[0].type, "keyword")
  })

  it("supports a default table", () => {
    ist(str(get("select i|", {schema: schema1, defaultTable: "users"})), "address, id, name, products, users")
  })

  it("supports alternate quoting styles", () => {
    ist(str(get("select `u|", {dialect: MySQL, schema: schema1})), "`products`, `users`")
  })

  it("doesn't complete without identifier", () => {
    ist(str(get("select |", {schema: schema1})), "")
  })

  it("does complete explicitly without identifier", () => {
    ist(str(get("select |", {schema: schema1, explicit: true})), "products, users")
  })
})
