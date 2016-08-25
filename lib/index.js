"use strict";

/// <reference path="lib/typings/index.d.ts" />
var extend = require("extend");
var plugins = require("./plugin");
var util = require("./util");
var logger = require("./logger");
var library = extend({}, plugins, util, { logger: logger });
module.exports = library;