"use strict";
var extend = require("extend");
var plugin = require("./plugin");
var util = require("./util");
var logger = require("./logger");
var library = extend({}, plugin, util, { logger: logger });
module.exports = library;
