import util   = require("./util")
import config = require("./config")
import plugin = require("./plugin")
import logger = require("./logger")

const library : vile.Module.Index = {
  CHURN: util.CHURN,
  COMP:  util.COMP,
  COV:   util.COV,
  DEP:   util.DEP,
  DUPE:  util.DUPE,
  ERR:   util.ERR,
  LANG:  util.LANG,
  MAIN:  util.MAIN,
  OK:    util.OK,
  SCM:   util.SCM,
  SEC:   util.SEC,
  STAT:  util.STAT,
  STYL:  util.STYL,
  WARN:  util.WARN,

  allowed:      util.allowed,
  config,
  exec:         plugin.exec,
  exec_plugin:  plugin.exec_plugin,
  filter:       util.filter,
  ignored:      util.ignored,
  issue:        util.issue,
  logger,
  promise_each: util.promise_each,
  spawn:        util.spawn
}

export = library
