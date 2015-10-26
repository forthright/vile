/// <reference path="lib/typings/index.d.ts" />
"use strict";

var vile;
(function (vile) {
    var extend = require("extend");
    var plugins = require("./plugins");
    var util = require("./util");
    var logger = require("./logger");
    // TODO: flush out
    // TODO: require in config now?!
    var library = extend({}, plugins, util, { logger: logger });
    module.exports = library;
})(vile || (vile = {}));