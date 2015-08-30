/// <reference path="lib/typings/index.d.ts" />

module vile {

let extend = require("extend")
let plugins = require("./plugins")
let util = require("./util")
let logger = require("./logger")

// TODO: flush out
// TODO: require in config now?!
const library = extend(
  {},
  plugins,
  util,
  { logger: logger }
)

module.exports = library

}
