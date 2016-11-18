/// <reference path="@types/index" />

import extend = require("extend")
import plugin = require("./plugin")
import util = require("./util")
import logger = require("./logger")

const library : vile.Lib.Index = extend(
  {},
  plugin,
  util,
  { logger: logger }
)

export = library
