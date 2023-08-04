import ist from "ist"
import {PostgreSQL, MySQL, PLSQL, SQLDialect} from "@codemirror/lang-sql"

const mysqlTokens = MySQL.language
const postgresqlTokens = PostgreSQL.language
const bigQueryTokens = SQLDialect.define({
  treatBitsAsBytes: true
}).language
const plsqlTokens = PLSQL.language

describe("Parse MySQL tokens", () => {
  const parser = mysqlTokens.parser

  it("parses quoted bit-value literals", () => {
    ist(parser.parse("SELECT b'0101'"), 'Script(Statement(Keyword,Bits))')
  })

  it("parses unquoted bit-value literals", () => {
    ist(parser.parse("SELECT 0b01"), 'Script(Statement(Keyword,Bits))')
  })
})

describe("Parse PostgreSQL tokens", () => {
  const parser = postgresqlTokens.parser

  it("parses quoted bit-value literals", () => {
    ist(parser.parse("SELECT b'0101'"), 'Script(Statement(Keyword,Bits))')
  })

  it("parses quoted bit-value literals", () => {
    ist(parser.parse("SELECT B'0101'"), 'Script(Statement(Keyword,Bits))')
  })

  it("parses double dollar quoted string literals", () => {
    ist(parser.parse("SELECT $$hello$$"), 'Script(Statement(Keyword,String))')
  })
})

describe("Parse BigQuery tokens", () => {
  const parser = bigQueryTokens.parser

  it("parses quoted bytes literals in single quotes", () => {
    ist(parser.parse("SELECT b'abcd'"), 'Script(Statement(Keyword,Bytes))')
  })

  it("parses quoted bytes literals in double quotes", () => {
    ist(parser.parse('SELECT b"abcd"'), 'Script(Statement(Keyword,Bytes))')
  })

  it("parses bytes literals in single quotes", () => {
    ist(parser.parse("SELECT b'0101'"), 'Script(Statement(Keyword,Bytes))')
  })

  it("parses bytes literals in double quotes", () => {
    ist(parser.parse('SELECT b"0101"'), 'Script(Statement(Keyword,Bytes))')
  })
})

describe("Parse PL/SQL tokens", () => {
  const parser = plsqlTokens.parser

  it("parses alternative quoting mechanism - []", () => {
    ist(parser.parse("SELECT q'[foo'bar]' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - {}", () => {
    ist(parser.parse("SELECT q'{foo'bar}' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - <>", () => {
    ist(parser.parse("SELECT q'<foo'bar>' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - ()", () => {
    ist(parser.parse("SELECT q'(foo'bar)' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - custom", () => {
    ist(parser.parse("SELECT q'~foo'bar~' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - uppercase Q", () => {
    ist(parser.parse("SELECT Q'~foo'bar~' FROM DUAL"), 'Script(Statement(Keyword,String,Keyword,Identifier))')
  })

  it("parses alternative quoting mechanism - unclosed", () => {
    ist(parser.parse("SELECT q'~foo'bar' FROM DUAL"), 'Script(Statement(Keyword,String))')
  })
})