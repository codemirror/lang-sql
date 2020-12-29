import dts from "rollup-plugin-dts"
import {lezer} from "lezer-generator/rollup"

export default [{
  input: "./src/sql.js",
  external: id => id != "tslib" && !/^(\.?\/|\w:)/.test(id),
  output: {
    format: "esm",
    file: "./dist/index.js",
    externalLiveBindings: false
  },
  plugins: [lezer()]
}, {
  input: "./src/sql.d.ts",
  output: {
    format: "esm",
    file: "./dist/index.d.ts",
  },
  plugins: [dts()],
  onwarn(warning, warn) { if (warning.code != "CIRCULAR_DEPENDENCY") warn(warning) }
}]
