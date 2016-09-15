"use strict";

/// <reference path="lib/typings/index.d.ts" />
var _ = require("lodash");
var minilog = require("minilog");
var filter = new minilog.Filter();
var default_filter = function default_filter() {
    filter.allow(/.*/, "error");
    filter.allow(/.*/, "info");
    filter.defaultResult = false;
};
var quiet = function quiet() {
    return filter.clear();
};
var log_level = function log_level(level) {
    return filter.allow(/.*/, level);
};
var init = function init() {
    // HACK!
    var nocolor = _.includes(process.argv, "--nodecorations") || _.includes(process.argv, "-n");
    if (nocolor) {
        minilog.pipe(filter).pipe(minilog.backends.console.formatClean).pipe(minilog.backends.console);
    } else {
        minilog.pipe(filter).pipe(minilog.backends.console.formatMinilog).pipe(minilog.backends.console);
    }
    default_filter();
};
module.exports = {
    create: minilog,
    default: default_filter,
    quiet: quiet,
    level: log_level
};
init();