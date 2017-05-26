import extend = require("extend")
import plugin = require("./plugin")
import util = require("./util")
import logger = require("./logger")

const library : vile.Vile = extend(
  {},
  plugin,
  util,
  { logger }
)

export = library
