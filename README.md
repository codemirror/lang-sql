<!-- NOTE: README.md is generated from src/README.md -->

# @codemirror/lang-sql [![NPM version](https://img.shields.io/npm/v/@codemirror/lang-sql.svg)](https://www.npmjs.org/package/@codemirror/lang-sql)

[ [**WEBSITE**](https://codemirror.net/6/) | [**ISSUES**](https://github.com/codemirror/codemirror.next/issues) | [**FORUM**](https://discuss.codemirror.net/c/next/) | [**CHANGELOG**](https://github.com/codemirror/lang-sql/blob/main/CHANGELOG.md) ]

This package implements SQL language support for the
[CodeMirror](https://codemirror.net/6/) code editor.

The [project page](https://codemirror.net/6/) has more information, a
number of [examples](https://codemirror.net/6/examples/) and the
[documentation](https://codemirror.net/6/docs/).

This code is released under an
[MIT license](https://github.com/codemirror/lang-sql/tree/main/LICENSE).

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## API Reference
<dl>
<dt id="user-content-sql">
  <code><strong><a href="#user-content-sql">sql</a></strong>(<a id="user-content-sql^config" href="#user-content-sql^config">config</a>&#8288;?: <a href="#user-content-sqlconfig">SQLConfig</a> = {}) → <a href="https://codemirror.net/6/docs/ref#language.LanguageSupport">LanguageSupport</a></code></dt>

<dd><p>SQL language support for the given SQL dialect, with keyword
completion, and, if provided, schema-based completion as extra
extensions.</p>
</dd>
<dt id="user-content-sqlconfig">
  <h4>
    interface
    <a href="#user-content-sqlconfig">SQLConfig</a></h4>
</dt>

<dd><p>Options used to configure an SQL extension.</p>
<dl><dt id="user-content-sqlconfig.dialect">
  <code><strong><a href="#user-content-sqlconfig.dialect">dialect</a></strong>&#8288;?: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>The <a href="#user-content-sqldialect">dialect</a> to use. Defaults to
<a href="#user-content-standardsql"><code>StandardSQL</code></a>.</p>
</dd><dt id="user-content-sqlconfig.schema">
  <code><strong><a href="#user-content-sqlconfig.schema">schema</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object">Object</a>&lt;readonly (<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a> | <a href="https://codemirror.net/6/docs/ref#autocomplete.Completion">Completion</a>)[]&gt;</code></dt>

<dd><p>An object that maps table names to options (columns) that can
be completed for that table. Use lower-case names here.</p>
</dd><dt id="user-content-sqlconfig.tables">
  <code><strong><a href="#user-content-sqlconfig.tables">tables</a></strong>&#8288;?: readonly <a href="https://codemirror.net/6/docs/ref#autocomplete.Completion">Completion</a>[]</code></dt>

<dd><p>By default, the completions for the table names will be
generated from the <code>schema</code> object. But if you want to
customize them, you can pass an array of completions through
this option.</p>
</dd><dt id="user-content-sqlconfig.defaulttable">
  <code><strong><a href="#user-content-sqlconfig.defaulttable">defaultTable</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>When given, columns from the named table can be completed
directly at the top level.</p>
</dd><dt id="user-content-sqlconfig.uppercasekeywords">
  <code><strong><a href="#user-content-sqlconfig.uppercasekeywords">upperCaseKeywords</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>When set to true, keyword completions will be upper-case.</p>
</dd></dl>

</dd>
<dt id="user-content-sqldialect">
  <h4>
    class
    <a href="#user-content-sqldialect">SQLDialect</a></h4>
</dt>

<dd><p>Represents an SQL dialect.</p>
<dl><dt id="user-content-sqldialect.language">
  <code><strong><a href="#user-content-sqldialect.language">language</a></strong>: <a href="https://codemirror.net/6/docs/ref#language.LezerLanguage">LezerLanguage</a></code></dt>

<dd><p>The language for this dialect.</p>
</dd><dt id="user-content-sqldialect.extension">
  <code><strong><a href="#user-content-sqldialect.extension">extension</a></strong>: <a href="https://codemirror.net/6/docs/ref#state.Extension">Extension</a></code></dt>

<dd><p>Returns the language for this dialect as an extension.</p>
</dd><dt id="user-content-sqldialect^define">
  <code>static <strong><a href="#user-content-sqldialect^define">define</a></strong>(<a id="user-content-sqldialect^define^spec" href="#user-content-sqldialect^define^spec">spec</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object">Object</a>) → <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>Define a new dialect.</p>
<dl><dt id="user-content-sqldialect^define^spec">
  <code><strong><a href="#user-content-sqldialect^define^spec">spec</a></strong></code></dt>

<dd><dl><dt id="user-content-sqldialect^define^spec.keywords">
  <code><strong><a href="#user-content-sqldialect^define^spec.keywords">keywords</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>A space-separated list of keywords for the dialect.</p>
</dd><dt id="user-content-sqldialect^define^spec.builtin">
  <code><strong><a href="#user-content-sqldialect^define^spec.builtin">builtin</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>A space-separated string of built-in identifiers for the dialect.</p>
</dd><dt id="user-content-sqldialect^define^spec.types">
  <code><strong><a href="#user-content-sqldialect^define^spec.types">types</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>A space-separated string of type names for the dialect.</p>
</dd><dt id="user-content-sqldialect^define^spec.backslashescapes">
  <code><strong><a href="#user-content-sqldialect^define^spec.backslashescapes">backslashEscapes</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether regular strings allow backslash escapes.</p>
</dd><dt id="user-content-sqldialect^define^spec.hashcomments">
  <code><strong><a href="#user-content-sqldialect^define^spec.hashcomments">hashComments</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether # creates a line comment.</p>
</dd><dt id="user-content-sqldialect^define^spec.slashcomments">
  <code><strong><a href="#user-content-sqldialect^define^spec.slashcomments">slashComments</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether <code>//</code> creates a line comment.</p>
</dd><dt id="user-content-sqldialect^define^spec.spaceafterdashes">
  <code><strong><a href="#user-content-sqldialect^define^spec.spaceafterdashes">spaceAfterDashes</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>When enabled <code>--</code> comments are only recognized when there's a
space after the dashes.</p>
</dd><dt id="user-content-sqldialect^define^spec.doublequotedstrings">
  <code><strong><a href="#user-content-sqldialect^define^spec.doublequotedstrings">doubleQuotedStrings</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>When enabled, things quoted with double quotes are treated as
strings, rather than identifiers.</p>
</dd><dt id="user-content-sqldialect^define^spec.charsetcasts">
  <code><strong><a href="#user-content-sqldialect^define^spec.charsetcasts">charSetCasts</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Enables strings like <code>_utf8'str'</code> or <code>N'str'</code>.</p>
</dd><dt id="user-content-sqldialect^define^spec.operatorchars">
  <code><strong><a href="#user-content-sqldialect^define^spec.operatorchars">operatorChars</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>The set of characters that make up operators. Defaults to
<code>&quot;*+\-%&lt;&gt;!=&amp;|~^/&quot;</code>.</p>
</dd><dt id="user-content-sqldialect^define^spec.specialvar">
  <code><strong><a href="#user-content-sqldialect^define^spec.specialvar">specialVar</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>The set of characters that start a special variable name.
Defaults to <code>&quot;?&quot;</code>.</p>
</dd><dt id="user-content-sqldialect^define^spec.identifierquotes">
  <code><strong><a href="#user-content-sqldialect^define^spec.identifierquotes">identifierQuotes</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>The characters that can be used to quote identifiers. Defaults
to <code>&quot;\&quot;&quot;</code>.</p>
</dd></dl></dd></dl></dd></dl>

</dd>
<dt id="user-content-standardsql">
  <code><strong><a href="#user-content-standardsql">StandardSQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>The standard SQL dialect.</p>
</dd>
<dt id="user-content-postgresql">
  <code><strong><a href="#user-content-postgresql">PostgreSQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>Dialect for <a href="https://www.postgresql.org">PostgreSQL</a>.</p>
</dd>
<dt id="user-content-mysql">
  <code><strong><a href="#user-content-mysql">MySQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p><a href="https://dev.mysql.com/">MySQL</a> dialect.</p>
</dd>
<dt id="user-content-mariasql">
  <code><strong><a href="#user-content-mariasql">MariaSQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>Variant of <a href="#user-content-mysql"><code>MySQL</code></a> for
<a href="https://mariadb.org/">MariaDB</a>.</p>
</dd>
<dt id="user-content-mssql">
  <code><strong><a href="#user-content-mssql">MSSQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>SQL dialect for Microsoft <a href="https://www.microsoft.com/en-us/sql-server">SQL
Server</a>.</p>
</dd>
<dt id="user-content-sqlite">
  <code><strong><a href="#user-content-sqlite">SQLite</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p><a href="https://sqlite.org/">SQLite</a> dialect.</p>
</dd>
<dt id="user-content-cassandra">
  <code><strong><a href="#user-content-cassandra">Cassandra</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p>Dialect for <a href="https://cassandra.apache.org/">Cassandra</a>'s SQL-ish query language.</p>
</dd>
<dt id="user-content-plsql">
  <code><strong><a href="#user-content-plsql">PLSQL</a></strong>: <a href="#user-content-sqldialect">SQLDialect</a></code></dt>

<dd><p><a href="https://en.wikipedia.org/wiki/PL/SQL">PL/SQL</a> dialect.</p>
</dd>
<dt id="user-content-keywordcompletion">
  <code><strong><a href="#user-content-keywordcompletion">keywordCompletion</a></strong>(<a id="user-content-keywordcompletion^dialect" href="#user-content-keywordcompletion^dialect">dialect</a>: <a href="#user-content-sqldialect">SQLDialect</a>, <a id="user-content-keywordcompletion^uppercase" href="#user-content-keywordcompletion^uppercase">upperCase</a>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a> = false) → <a href="https://codemirror.net/6/docs/ref#state.Extension">Extension</a></code></dt>

<dd><p>Returns an extension that enables keyword completion for the given
SQL dialect.</p>
</dd>
<dt id="user-content-schemacompletion">
  <code><strong><a href="#user-content-schemacompletion">schemaCompletion</a></strong>(<a id="user-content-schemacompletion^config" href="#user-content-schemacompletion^config">config</a>: <a href="#user-content-sqlconfig">SQLConfig</a>) → <a href="https://codemirror.net/6/docs/ref#state.Extension">Extension</a></code></dt>

<dd><p>Returns an extension that enables schema-based completion for the
given configuration.</p>
</dd>
</dl>
