"use strict";

/// <reference path="lib/typings/index.d.ts" />
var vile;
(function (vile) {
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
    var verbose = function verbose(is_verbose) {
        if (is_verbose) {
            quiet();
            filter.allow(/.*/, "debug");
        }
        default_filter();
    };
    var init = function init() {
        // HACK!
        var nocolor = _.includes(process.argv, "--nodecorations");
        if (nocolor) {
            minilog.pipe(filter).pipe(minilog.backends.console.formatClean).pipe(minilog.backends.console);
        } else {
            minilog.pipe(filter).pipe(minilog.backends.console.formatMinilog).pipe(minilog.backends.console);
        }
        default_filter();
    };
    module.exports = {
        create: minilog,
        verbose: verbose,
        default: default_filter,
        quiet: quiet,
        level: log_level
    };
    init();
})(vile || (vile = {}));