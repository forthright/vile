"use strict";
var _ = require("lodash");
var minilog = require("minilog");
var filter = new minilog.Filter();
var default_filter = function () {
    filter.allow(/.*/, "error");
    filter.allow(/.*/, "info");
    filter.defaultResult = false;
};
var quiet = function () { return filter.clear(); };
var log_level = function (level) {
    return filter.allow(/.*/, level);
};
var init = function () {
    var nocolor = _.includes(process.argv, "--nodecorations") ||
        _.includes(process.argv, "-n");
    if (nocolor) {
        minilog
            .pipe(filter)
            .pipe(minilog.backends.console.formatClean)
            .pipe(minilog.backends.console);
    }
    else {
        minilog
            .pipe(filter)
            .pipe(minilog.backends.console.formatMinilog)
            .pipe(minilog.backends.console);
    }
    default_filter();
};
init();
module.exports = {
    create: minilog,
    default: default_filter,
    level: log_level,
    quiet: quiet
};
