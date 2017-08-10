"use strict";
var _ = require("lodash");
var util = require("./util");
var config = require("./config");
var plugin = require("./plugin");
var logger = require("./logger");
var types = {
    CHURN: util.CHURN,
    COMP: util.COMP,
    COV: util.COV,
    DEP: util.DEP,
    DUPE: util.DUPE,
    ERR: util.ERR,
    MAIN: util.MAIN,
    OK: util.OK,
    SCM: util.SCM,
    SEC: util.SEC,
    STAT: util.STAT,
    STYL: util.STYL,
    WARN: util.WARN
};
var library = _.assign(types, {
    allowed: util.allowed,
    config: config,
    exec: plugin.exec,
    exec_plugin: plugin.exec_plugin,
    filter: util.filter,
    ignored: util.ignored,
    issue: util.issue,
    logger: logger,
    promise_each: util.promise_each,
    spawn: util.spawn
});
module.exports = library;
