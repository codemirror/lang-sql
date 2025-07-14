import {continuedIndent, indentNodeProp, foldNodeProp, LRLanguage, LanguageSupport} from "@codemirror/language"
import {Extension} from "@codemirror/state"
import {Completion, CompletionSource} from "@codemirror/autocomplete"
import {styleTags, tags as t} from "@lezer/highlight"
import {ParserConfig} from "@lezer/lr"
import {parser as baseParser} from "./sql.grammar"
import {tokens, Dialect, tokensFor, SQLKeywords, SQLTypes, dialect} from "./tokens"
import {completeFromSchema, completeKeywords} from "./complete"

let parser = baseParser.configure({
  props: [
    indentNodeProp.add({
      Statement: continuedIndent()
    }),
    foldNodeProp.add({
      Statement(tree, state) { return {from: Math.min(tree.from + 100, state.doc.lineAt(tree.from).to), to: tree.to} },
      BlockComment(tree) { return {from: tree.from + 2, to: tree.to - 2} }
    }),
    styleTags({
      Keyword: t.keyword,
      Type: t.typeName,
      Builtin: t.standard(t.name),
      Bits: t.number,
      Bytes: t.string,
      Bool: t.bool,
      Null: t.null,
      Number: t.number,
      String: t.string,
      Identifier: t.name,
      QuotedIdentifier: t.special(t.string),
      SpecialVar: t.special(t.name),
      LineComment: t.lineComment,
      BlockComment: t.blockComment,
      Operator: t.operator,
      "Semi Punctuation": t.punctuation,
      "( )": t.paren,
      "{ }": t.brace,
      "[ ]": t.squareBracket
    })
  ]
})

/// Configuration for an [SQL Dialect](#lang-sql.SQLDialect).
export type SQLDialectSpec = {
  /// A space-separated list of keywords for the dialect.
  keywords?: string,
  /// A space-separated string of built-in identifiers for the dialect.
  builtin?: string,
  /// A space-separated string of type names for the dialect.
  types?: string,
  /// Controls whether regular strings allow backslash escapes.
  backslashEscapes?: boolean,
  /// Controls whether # creates a line comment.
  hashComments?: boolean,
  /// Controls whether `//` creates a line comment.
  slashComments?: boolean,
  /// When enabled `--` comments are only recognized when there's a
  /// space after the dashes.
  spaceAfterDashes?: boolean,
  /// When enabled, things quoted with "$$" are treated as
  /// strings, rather than identifiers.
  doubleDollarQuotedStrings?: boolean,
  /// When enabled, things quoted with double quotes are treated as
  /// strings, rather than identifiers.
  doubleQuotedStrings?: boolean,
  /// Enables strings like `_utf8'str'` or `N'str'`.
  charSetCasts?: boolean,
  /// Enables string quoting syntax like `q'[str]'`, as used in
  /// PL/SQL.
  plsqlQuotingMechanism?: boolean,
  /// The set of characters that make up operators. Defaults to
  /// `"*+\-%<>!=&|~^/"`.
  operatorChars?: string,
  /// The set of characters that start a special variable name.
  /// Defaults to `"?"`.
  specialVar?: string,
  /// The characters that can be used to quote identifiers. Defaults
  /// to `"\""`.
  identifierQuotes?: string
  /// Controls whether identifiers are case-insensitive. Identifiers
  /// with upper-case letters are quoted when set to false (which is
  /// the default).
  caseInsensitiveIdentifiers?: boolean,
  /// Controls whether bit values can be defined as 0b1010. Defaults
  /// to false.
  unquotedBitLiterals?: boolean,
  /// Controls whether bit values can contain other characters than 0 and 1.
  /// Defaults to false.
  treatBitsAsBytes?: boolean,
}

/// Represents an SQL dialect.
export class SQLDialect {
  private constructor(
    /// @internal
    readonly dialect: Dialect,
    /// The language for this dialect.
    readonly language: LRLanguage,
    /// The spec used to define this dialect.
    readonly spec: SQLDialectSpec
  ) {}

  /// Returns the language for this dialect as an extension.
  get extension() { return this.language.extension }

  /// Reconfigure the parser used by this dialect. Returns a new
  /// dialect object.
  configureLanguage(options: ParserConfig, name?: string) {
    return new SQLDialect(this.dialect, this.language.configure(options, name), this.spec)
  }

  /// Define a new dialect.
  static define(spec: SQLDialectSpec) {
    let d = dialect(spec, spec.keywords, spec.types, spec.builtin)
    let language = LRLanguage.define({
      name: "sql",
      parser: parser.configure({
        tokenizers: [{from: tokens, to: tokensFor(d)}]
      }),
      languageData: {
        commentTokens: {line: "--", block: {open: "/*", close: "*/"}},
        closeBrackets: {brackets: ["(", "[", "{", "'", '"', "`"]}
      }
    })
    return new SQLDialect(d, language, spec)
  }
}

/// The type used to describe a level of the schema for
/// [completion](#lang-sql.SQLConfig.schema). Can be an array of
/// options (columns), an object mapping table or schema names to
/// deeper levels, or a `{self, children}` object that assigns a
/// completion option to use for its parent property, when the default option
/// (its name as label and type `"type"`) isn't suitable.
export type SQLNamespace = {[name: string]: SQLNamespace}
  | {self: Completion, children: SQLNamespace}
  | readonly (Completion | string)[]

/// Options used to configure an SQL extension.
export interface SQLConfig {
  /// The [dialect](#lang-sql.SQLDialect) to use. Defaults to
  /// [`StandardSQL`](#lang-sql.StandardSQL).
  dialect?: SQLDialect,
  /// You can use this to define the schemas, tables, and their fields
  /// for autocompletion.
  schema?: SQLNamespace,
  /// @hide
  tables?: readonly Completion[],
  /// @hide
  schemas?: readonly Completion[],
  /// When given, columns from the named table can be completed
  /// directly at the top level.
  defaultTable?: string,
  /// When given, tables prefixed with this schema name can be
  /// completed directly at the top level.
  defaultSchema?: string,
  /// When set to true, keyword completions will be upper-case.
  upperCaseKeywords?: boolean
  /// Can be used to customize the completions generated for keywords.
  keywordCompletion?: (label: string, type: string) => Completion
}

function defaultKeyword(label: string, type: string) { return {label, type, boost: -1} }

/// Returns a completion source that provides keyword completion for
/// the given SQL dialect.
export function keywordCompletionSource(dialect: SQLDialect, upperCase = false,
                                        build?: (label: string, type: string) => Completion): CompletionSource {
  return completeKeywords(dialect.dialect.words, upperCase, build || defaultKeyword)
}

/// Returns a completion sources that provides schema-based completion
/// for the given configuration.
export function schemaCompletionSource(config: SQLConfig): CompletionSource {
  return config.schema ? completeFromSchema(config.schema, config.tables, config.schemas,
                                            config.defaultTable, config.defaultSchema,
                                            config.dialect || StandardSQL)
    : () => null
}

function schemaCompletion(config: SQLConfig): Extension {
  return config.schema ? (config.dialect || StandardSQL).language.data.of({
    autocomplete: schemaCompletionSource(config)
  }) : []
}

/// SQL language support for the given SQL dialect, with keyword
/// completion, and, if provided, schema-based completion as extra
/// extensions.
export function sql(config: SQLConfig = {}) {
  let lang = config.dialect || StandardSQL
  return new LanguageSupport(lang.language, [
    schemaCompletion(config),
    lang.language.data.of({
      autocomplete: keywordCompletionSource(lang, config.upperCaseKeywords, config.keywordCompletion)
    })
  ])
}

/// The standard SQL dialect.
export const StandardSQL = SQLDialect.define({})

/// Dialect for [PostgreSQL](https://www.postgresql.org).
export const PostgreSQL = SQLDialect.define({
  charSetCasts: true,
  doubleDollarQuotedStrings: true,
  operatorChars: "+-*/<>=~!@#%^&|`?",
  specialVar: "",
  keywords: SQLKeywords + "abort abs absent access according ada admin aggregate alias also always analyse analyze array_agg array_max_cardinality asensitive assert assignment asymmetric atomic attach attribute attributes avg backward base64 begin_frame begin_partition bernoulli bit_length blocked bom cache called cardinality catalog_name ceil ceiling chain char_length character_length character_set_catalog character_set_name character_set_schema characteristics characters checkpoint class class_origin cluster coalesce cobol collation_catalog collation_name collation_schema collect column_name columns command_function command_function_code comment comments committed concurrently condition_number configuration conflict connection_name constant constraint_catalog constraint_name constraint_schema contains content control conversion convert copy corr cost covar_pop covar_samp csv cume_dist current_catalog current_row current_schema cursor_name database datalink datatype datetime_interval_code datetime_interval_precision db debug defaults defined definer degree delimiter delimiters dense_rank depends derived detach detail dictionary disable discard dispatch dlnewcopy dlpreviouscopy dlurlcomplete dlurlcompleteonly dlurlcompletewrite dlurlpath dlurlpathonly dlurlpathwrite dlurlscheme dlurlserver dlvalue document dump dynamic_function dynamic_function_code element elsif empty enable encoding encrypted end_frame end_partition endexec enforced enum errcode error event every exclude excluding exclusive exp explain expression extension extract family file filter final first_value flag floor following force foreach fortran forward frame_row freeze fs functions fusion generated granted greatest groups handler header hex hierarchy hint id ignore ilike immediately immutable implementation implicit import include including increment indent index indexes info inherit inherits inline insensitive instance instantiable instead integrity intersection invoker isnull key_member key_type label lag last_value lead leakproof least length library like_regex link listen ln load location lock locked log logged lower mapping matched materialized max max_cardinality maxvalue member merge message message_length message_octet_length message_text min minvalue mod mode more move multiset mumps name namespace nfc nfd nfkc nfkd nil normalize normalized nothing notice notify notnull nowait nth_value ntile nullable nullif nulls number occurrences_regex octet_length octets off offset oids operator options ordering others over overlay overriding owned owner parallel parameter_mode parameter_name parameter_ordinal_position parameter_specific_catalog parameter_specific_name parameter_specific_schema parser partition pascal passing passthrough password percent percent_rank percentile_cont percentile_disc perform period permission pg_context pg_datatype_name pg_exception_context pg_exception_detail pg_exception_hint placing plans pli policy portion position position_regex power precedes preceding prepared print_strict_params procedural procedures program publication query quote raise range rank reassign recheck recovery refresh regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy regr_syy reindex rename repeatable replace replica requiring reset respect restart restore result_oid returned_cardinality returned_length returned_octet_length returned_sqlstate returning reverse routine_catalog routine_name routine_schema routines row_count row_number rowtype rule scale schema_name schemas scope scope_catalog scope_name scope_schema security selective self sensitive sequence sequences serializable server server_name setof share show simple skip slice snapshot source specific_name sqlcode sqlerror sqrt stable stacked standalone statement statistics stddev_pop stddev_samp stdin stdout storage strict strip structure style subclass_origin submultiset subscription substring substring_regex succeeds sum symmetric sysid system system_time table_name tables tablesample tablespace temp template ties token top_level_count transaction_active transactions_committed transactions_rolled_back transform transforms translate translate_regex trigger_catalog trigger_name trigger_schema trim trim_array truncate trusted type types uescape unbounded uncommitted unencrypted unlink unlisten unlogged unnamed untyped upper uri use_column use_variable user_defined_type_catalog user_defined_type_code user_defined_type_name user_defined_type_schema vacuum valid validate validator value_of var_pop var_samp varbinary variable_conflict variadic verbose version versioning views volatile warning whitespace width_bucket window within wrapper xmlagg xmlattributes xmlbinary xmlcast xmlcomment xmlconcat xmldeclaration xmldocument xmlelement xmlexists xmlforest xmliterate xmlnamespaces xmlparse xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltext xmlvalidate yes",
  types: SQLTypes + "bigint int8 bigserial serial8 varbit bool box bytea cidr circle precision float8 inet int4 json jsonb line lseg macaddr macaddr8 money numeric pg_lsn point polygon float4 int2 smallserial serial2 serial serial4 text timetz timestamptz tsquery tsvector txid_snapshot uuid xml"
})

const MySQLKeywords = "accessible algorithm analyze asensitive authors auto_increment autocommit avg avg_row_length binlog btree cache catalog_name chain change changed checkpoint checksum class_origin client_statistics coalesce code collations columns comment committed completion concurrent consistent contains contributors convert database databases day_hour day_microsecond day_minute day_second delay_key_write delayed delimiter des_key_file dev_pop dev_samp deviance directory disable discard distinctrow div dual dumpfile enable enclosed ends engine engines enum errors escaped even event events every explain extended fast field fields flush force found_rows fulltext grants handler hash high_priority hosts hour_microsecond hour_minute hour_second ignore ignore_server_ids import index index_statistics infile innodb insensitive insert_method install invoker iterate keys kill linear lines list load lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modify mutex mysql_errno no_write_to_binlog offline offset one online optimize optionally outfile pack_keys parser partition partitions password phase plugin plugins prev processlist profile profiles purge query quick range read_write rebuild recover regexp relaylog remove rename reorganize repair repeatable replace require resume rlike row_format rtree schedule schema_name schemas second_microsecond security sensitive separator serializable server share show slave slow snapshot soname spatial sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result ssl starting starts std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace terminated triggers truncate uncommitted uninstall unlock upgrade use use_frm user_resources user_statistics utc_date utc_time utc_timestamp variables views warnings xa xor year_month zerofill"

const MySQLTypes = SQLTypes + "bool blob long longblob longtext medium mediumblob mediumint mediumtext tinyblob tinyint tinytext text bigint int1 int2 int3 int4 int8 float4 float8 varbinary varcharacter precision datetime unsigned signed"

const MySQLBuiltin = "charset clear edit ego help nopager notee nowarning pager print prompt quit rehash source status system tee"

/// [MySQL](https://dev.mysql.com/) dialect.
export const MySQL = SQLDialect.define({
  operatorChars: "*+-%<>!=&|^",
  charSetCasts: true,
  doubleQuotedStrings: true,
  unquotedBitLiterals: true,
  hashComments: true,
  spaceAfterDashes: true,
  specialVar: "@?",
  identifierQuotes: "`",
  keywords: SQLKeywords + "group_concat " + MySQLKeywords,
  types: MySQLTypes,
  builtin: MySQLBuiltin
})

/// Variant of [`MySQL`](#lang-sql.MySQL) for
/// [MariaDB](https://mariadb.org/).
export const MariaSQL = SQLDialect.define({
  operatorChars: "*+-%<>!=&|^",
  charSetCasts: true,
  doubleQuotedStrings: true,
  unquotedBitLiterals: true,
  hashComments: true,
  spaceAfterDashes: true,
  specialVar: "@?",
  identifierQuotes: "`",
  keywords: SQLKeywords + "always generated groupby_concat hard persistent shutdown soft virtual " + MySQLKeywords,
  types: MySQLTypes,
  builtin: MySQLBuiltin
})

let MSSQLBuiltin =
  // Aggregate https://msdn.microsoft.com/en-us/library/ms173454.aspx
  "approx_count_distinct approx_percentile_cont approx_percentile_disc avg checksum_agg count count_big grouping grouping_id max min product stdev stdevp sum var varp " +
  // AI https://learn.microsoft.com/en-us/sql/t-sql/functions/ai-functions-transact-sql?view=sql-server-ver17
  "ai_generate_embeddings ai_generate_chunks " +
  // Analytic https://learn.microsoft.com/en-us/sql/t-sql/functions/analytic-functions-transact-sql?view=sql-server-ver17
  "cume_dist first_value lag last_value lead percentile_cont percentile_disc percent_rank " +
  // Bit Manipulation https://learn.microsoft.com/en-us/sql/t-sql/functions/bit-manipulation-functions-overview?view=sql-server-ver17
  "left_shift right_shift bit_count get_bit set_bit " +
  // Collation Functions https://learn.microsoft.com/en-us/sql/t-sql/functions/collation-functions-collationproperty-transact-sql?view=sql-server-ver17
  "collationproperty tertiary_weights " +
  // Configuration https://learn.microsoft.com/en-us/sql/t-sql/functions/configuration-functions-transact-sql?view=sql-server-ver17
  "@@datefirst @@dbts @@langid @@language @@lock_timeout @@max_connections @@max_precision @@nestlevel @@options @@remserver @@servername @@servicename @@spid @@textsize @@version " +
  // Conversion https://learn.microsoft.com/en-us/sql/t-sql/functions/conversion-functions-transact-sql?view=sql-server-ver17
  "cast convert parse try_cast try_convert try_parse " +
  // Cryptographic https://learn.microsoft.com/en-us/sql/t-sql/functions/cryptographic-functions-transact-sql?view=sql-server-ver17
  "asymkey_id asymkeyproperty certproperty cert_id crypt_gen_random decryptbyasymkey decryptbycert decryptbykey decryptbykeyautoasymkey decryptbykeyautocert decryptbypassphrase encryptbyasymkey encryptbycert encryptbykey encryptbypassphrase hashbytes is_objectsigned key_guid key_id key_name signbyasymkey signbycert symkeyproperty verifysignedbycert verifysignedbyasymkey " +
  // Cursor https://learn.microsoft.com/en-us/sql/t-sql/functions/cursor-functions-transact-sql?view=sql-server-ver17
  "@@cursor_rows @@fetch_status cursor_status " +
  // Data type https://learn.microsoft.com/en-us/sql/t-sql/functions/data-type-functions-transact-sql?view=sql-server-ver17
  "datalength ident_current ident_incr ident_seed identity sql_variant_property " +
  // Date & time https://learn.microsoft.com/en-us/sql/t-sql/functions/date-and-time-data-types-and-functions-transact-sql?view=sql-server-ver17
  "@@datefirst current_timestamp current_timezone current_timezone_id date_bucket dateadd datediff datediff_big datefromparts datename datepart datetime2fromparts datetimefromparts datetimeoffsetfromparts datetrunc day eomonth getdate getutcdate isdate month smalldatetimefromparts switchoffset sysdatetime sysdatetimeoffset sysutcdatetime timefromparts todatetimeoffset year " +
  // Fuzzy string match https://learn.microsoft.com/en-us/sql/t-sql/functions/edit-distance-transact-sql?view=sql-server-ver17
  "edit_distance edit_distance_similarity jaro_winkler_distance jaro_winkler_similarity " +
  // Graph https://learn.microsoft.com/en-us/sql/t-sql/functions/graph-functions-transact-sql?view=sql-server-ver17
  "edge_id_from_parts graph_id_from_edge_id graph_id_from_node_id node_id_from_parts object_id_from_edge_id object_id_from_node_id " +
  // JSON https://learn.microsoft.com/en-us/sql/t-sql/functions/json-functions-transact-sql?view=sql-server-ver17
  "json isjson json_array json_contains json_modify json_object json_path_exists json_query json_value " +
  // Regular Expressions https://learn.microsoft.com/en-us/sql/t-sql/functions/regular-expressions-functions-transact-sql?view=sql-server-ver17
  "regexp_like regexp_replace regexp_substr regexp_instr regexp_count regexp_matches regexp_split_to_table " +
  // Mathematical https://learn.microsoft.com/en-us/sql/t-sql/functions/mathematical-functions-transact-sql?view=sql-server-ver17
  "abs acos asin atan atn2 ceiling cos cot degrees exp floor log log10 pi power radians rand round sign sin sqrt square tan " +
  // Logical https://learn.microsoft.com/en-us/sql/t-sql/functions/logical-functions-choose-transact-sql?view=sql-server-ver17
  "choose greatest iif least " +
  // Metadata https://learn.microsoft.com/en-us/sql/t-sql/functions/metadata-functions-transact-sql?view=sql-server-ver17
  "@@procid app_name applock_mode applock_test assemblyproperty col_length col_name columnproperty databasepropertyex db_id db_name file_id file_idex file_name filegroup_id filegroup_name filegroupproperty fileproperty filepropertyex fulltextcatalogproperty fulltextserviceproperty index_col indexkey_property indexproperty next value for object_definition object_id object_name object_schema_name objectproperty objectpropertyex original_db_name parsename schema_id schema_name scope_identity serverproperty stats_date type_id type_name typeproperty " +
  // Ranking https://learn.microsoft.com/en-us/sql/t-sql/functions/ranking-functions-transact-sql?view=sql-server-ver17
  "dense_rank ntile rank row_number " +
  // Replication https://learn.microsoft.com/en-us/sql/t-sql/functions/replication-functions-publishingservername?view=sql-server-ver17
  "publishingservername " +
  // Security https://learn.microsoft.com/en-us/sql/t-sql/functions/security-functions-transact-sql?view=sql-server-ver17
  "certenclosed certprivatekey current_user database_principal_id has_dbaccess has_perms_by_name is_member is_rolemember is_srvrolemember loginproperty original_login permissions pwdencrypt pwdcompare session_user sessionproperty suser_id suser_name suser_sid suser_sname system_user user user_id user_name " +
  // String https://learn.microsoft.com/en-us/sql/t-sql/functions/string-functions-transact-sql?view=sql-server-ver17
  "ascii char charindex concat concat_ws difference format left len lower ltrim nchar patindex quotename replace replicate reverse right rtrim soundex space str string_agg string_escape stuff substring translate trim unicode upper " +
  // System https://learn.microsoft.com/en-us/sql/t-sql/functions/system-functions-transact-sql?view=sql-server-ver17
  "$partition @@error @@identity @@pack_received @@rowcount @@trancount binary_checksum checksum compress connectionproperty context_info current_request_id current_transaction_id decompress error_line error_message error_number error_procedure error_severity error_state formatmessage get_filestream_transaction_context getansinull host_id host_name isnull isnumeric min_active_rowversion newid newsequentialid rowcount_big session_context xact_state " +
  // System Statistical https://learn.microsoft.com/en-us/sql/t-sql/functions/system-statistical-functions-transact-sql?view=sql-server-ver17
  "@@connections @@cpu_busy @@idle @@io_busy @@pack_sent @@packet_errors @@timeticks @@total_errors @@total_read @@total_write " +
  // Text & Image https://learn.microsoft.com/en-us/sql/t-sql/functions/text-and-image-functions-textptr-transact-sql?view=sql-server-ver17
  "textptr textvalid " +
  // Trigger https://learn.microsoft.com/en-us/sql/t-sql/functions/trigger-functions-transact-sql?view=sql-server-ver17
  "columns_updated eventdata trigger_nestlevel " +
  // Vectors https://learn.microsoft.com/en-us/sql/t-sql/functions/vector-functions-transact-sql?view=sql-server-ver17
  "vector_distance vectorproperty vector_search " +
  // Relational operators https://msdn.microsoft.com/en-us/library/ms187957.aspx
  "generate_series opendatasource openjson openquery openrowset openxml predict string_split " +
  // Other
  "coalesce nullif apply catch filter force include keep keepfixed modify optimize parameterization parameters partition recompile sequence set"

/// SQL dialect for Microsoft [SQL
/// Server](https://www.microsoft.com/en-us/sql-server).
export const MSSQL = SQLDialect.define({
  keywords: SQLKeywords + 
    // Reserved Keywords https://learn.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-ver17
    "add external procedure all fetch public alter file raiserror and fillfactor read any for readtext as foreign reconfigure asc freetext references authorization freetexttable replication backup from restore begin full restrict between function return break goto revert browse grant revoke bulk group right by having rollback cascade holdlock rowcount case identity rowguidcol check identity_insert rule checkpoint identitycol save close if schema clustered in securityaudit coalesce index select collate inner semantickeyphrasetable column insert semanticsimilaritydetailstable commit intersect semanticsimilaritytable compute into session_user constraint is set contains join setuser containstable key shutdown continue kill some convert left statistics create like system_user cross lineno table current load tablesample current_date merge textsize current_time national then current_timestamp nocheck to current_user nonclustered top cursor not tran database null transaction dbcc nullif trigger deallocate of truncate declare off try_convert default offsets tsequal delete on union deny open unique desc opendatasource unpivot disk openquery update distinct openrowset updatetext distributed openxml use double option user drop or values dump order varying else outer view end over waitfor errlvl percent when escape pivot where except plan while exec precision with execute primary within group exists print writetext exit proc " +
    // table hints https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table?view=sql-server-ver17
    "noexpand index forceseek forcescan holdlock nolock nowait paglock readcommitted readcommittedlock readpast readuncommitted repeatableread rowlock serializable snapshot spatial_window_max_cells tablock tablockx updlock xlock keepidentity keepdefaults ignore_constraints ignore_triggers",
  types: SQLTypes + "smalldatetime datetimeoffset datetime2 datetime bigint smallint smallmoney tinyint money real text nvarchar ntext varbinary image hierarchyid uniqueidentifier sql_variant xml",
  builtin: MSSQLBuiltin,
  operatorChars: "*+-%<>!=^&|/",
  specialVar: "@"
})

/// [SQLite](https://sqlite.org/) dialect.
export const SQLite = SQLDialect.define({
  keywords: SQLKeywords + "abort analyze attach autoincrement conflict database detach exclusive fail glob ignore index indexed instead isnull notnull offset plan pragma query raise regexp reindex rename replace temp vacuum virtual",
  types: SQLTypes + "bool blob long longblob longtext medium mediumblob mediumint mediumtext tinyblob tinyint tinytext text bigint int2 int8 unsigned signed real",
  builtin: "auth backup bail changes clone databases dbinfo dump echo eqp explain fullschema headers help import imposter indexes iotrace lint load log mode nullvalue once print prompt quit restore save scanstats separator shell show stats system tables testcase timeout timer trace vfsinfo vfslist vfsname width",
  operatorChars: "*+-%<>!=&|/~",
  identifierQuotes: "`\"",
  specialVar: "@:?$"
})

/// Dialect for [Cassandra](https://cassandra.apache.org/)'s SQL-ish query language.
export const Cassandra = SQLDialect.define({
  keywords: "add all allow alter and any apply as asc authorize batch begin by clustering columnfamily compact consistency count create custom delete desc distinct drop each_quorum exists filtering from grant if in index insert into key keyspace keyspaces level limit local_one local_quorum modify nan norecursive nosuperuser not of on one order password permission permissions primary quorum rename revoke schema select set storage superuser table three to token truncate ttl two type unlogged update use user users using values where with writetime infinity NaN",
  types: SQLTypes + "ascii bigint blob counter frozen inet list map static text timeuuid tuple uuid varint",
  slashComments: true
})

/// [PL/SQL](https://en.wikipedia.org/wiki/PL/SQL) dialect.
export const PLSQL = SQLDialect.define({
  keywords: SQLKeywords + "abort accept access add all alter and any arraylen as asc assert assign at attributes audit authorization avg base_table begin between binary_integer body by case cast char_base check close cluster clusters colauth column comment commit compress connected constant constraint crash create current currval cursor data_base database dba deallocate debugoff debugon declare default definition delay delete desc digits dispose distinct do drop else elseif elsif enable end entry exception exception_init exchange exclusive exists external fast fetch file for force form from function generic goto grant group having identified if immediate in increment index indexes indicator initial initrans insert interface intersect into is key level library like limited local lock log logging loop master maxextents maxtrans member minextents minus mislabel mode modify multiset new next no noaudit nocompress nologging noparallel not nowait number_base of off offline on online only option or order out package parallel partition pctfree pctincrease pctused pls_integer positive positiven pragma primary prior private privileges procedure public raise range raw rebuild record ref references refresh rename replace resource restrict return returning returns reverse revoke rollback row rowid rowlabel rownum rows run savepoint schema segment select separate set share snapshot some space split sql start statement storage subtype successful synonym tabauth table tables tablespace task terminate then to trigger truncate type union unique unlimited unrecoverable unusable update use using validate value values variable view views when whenever where while with work",
  builtin: "appinfo arraysize autocommit autoprint autorecovery autotrace blockterminator break btitle cmdsep colsep compatibility compute concat copycommit copytypecheck define echo editfile embedded feedback flagger flush heading headsep instance linesize lno loboffset logsource longchunksize markup native newpage numformat numwidth pagesize pause pno recsep recsepchar repfooter repheader serveroutput shiftinout show showmode spool sqlblanklines sqlcase sqlcode sqlcontinue sqlnumber sqlpluscompatibility sqlprefix sqlprompt sqlterminator suffix tab term termout timing trimout trimspool ttitle underline verify version wrap",
  types: SQLTypes + "ascii bfile bfilename bigserial bit blob dec long number nvarchar nvarchar2 serial smallint string text uid varchar2 xml",
  operatorChars: "*/+-%<>!=~",
  doubleQuotedStrings: true,
  charSetCasts: true,
  plsqlQuotingMechanism: true
})
