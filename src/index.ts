/// <reference path="lib/typings/index.d.ts" />

var extend = require("extend")
var plugins = require("./plugins")
var util = require("./util")
var logger : Vile.Lib.Logger  = require("./logger")

// TODO: flush out
// TODO: require in config now?!
const library = extend(
  {},
  plugins,
  util,
  { logger: logger }
)

module.exports = library
