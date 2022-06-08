## 6.0.0 (2022-06-08)

### Breaking changes

Update dependencies to 6.0.0

## 0.20.4 (2022-05-30)

### New features

Schema completion descriptions may now include dots in table names to indicate nested schemas.

## 0.20.3 (2022-05-27)

### Bug fixes

Fix a bug where the slash at the end of block comments wasn't considered part of the comment token.

## 0.20.2 (2022-05-24)

### Bug fixes

Fix an infinite recursion bug in `schemaCompletionSource`.

## 0.20.1 (2022-05-24)

### Breaking changes

The `schemaCompletion` and `keywordCompletion` exports, which returned extensions, have been replaced with `schemaCompletionSource` and `keywordCompletionSource`, which return completion sources. The old exports will remain available until the next major version.

## 0.20.0 (2022-04-20)

### Bug fixes

Fix autocompletion on columns when the table name is written with upper-case letters. Move to @lezer/highlight

## 0.19.4 (2021-10-28)

### Bug fixes

Remove duplicate keywords/types in dialect configurations.

Fix a bug that caused characters directly before a space to be tokenized incorrectly.

## 0.19.3 (2021-08-21)

### Bug fixes

Fix a bug that broke tokenization of keywords.

## 0.19.2 (2021-08-11)

## 0.19.1 (2021-08-11)

### Bug fixes

Fix incorrect versions for @lezer dependencies.

## 0.19.0 (2021-08-11)

### Breaking changes

Update dependencies to 0.19.0

## 0.18.0 (2021-03-03)

### Breaking changes

Update dependencies to 0.18.

## 0.17.2 (2021-02-01)

### Bug fixes

Fix bad syntax tree creation when the input ends with an unfinished quoted identifier.

## 0.17.1 (2021-01-06)

### New features

The package now also exports a CommonJS module.

## 0.17.0 (2020-12-29)

### Breaking changes

First numbered release.

