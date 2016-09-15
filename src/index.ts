/// <reference path="lib/typings/index.d.ts" />

var extend = require("extend")
var plugin = require("./plugin")
var util = require("./util")
var logger : Vile.Lib.Logger  = require("./logger")

const library = extend(
  {},
  plugin,
  util,
  { logger: logger }
)

module.exports = library
