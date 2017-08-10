"use strict";
var _ = require("lodash");
var chalk = require("chalk");
var log = require("loglevel");
var ora = require("ora");
var enable_colors = false;
var allow_issue_types = [];
var spin = ora({ color: "green" });
var stop_spinner = function () {
    spin.stop();
};
var start_spinner = function () {
    spin.start();
};
var update_spinner = function (text) {
    spin.text = text;
    start_spinner();
};
var level = function (name) {
    process.env.VILE_LOG_LEVEL = name;
    log.setLevel(name);
};
var enable = function (colors, issue_types) {
    if (colors === void 0) { colors = true; }
    if (issue_types === void 0) { issue_types = []; }
    allow_issue_types = issue_types;
    enable_colors = colors;
    if (process.env.VILE_NO_COLOR == "1")
        enable_colors = false;
    if (!enable_colors)
        process.env.VILE_NO_COLOR = "1";
    level(process.env.VILE_LOG_LEVEL || "info");
};
var disable = function () {
    level("silent");
};
var colorize = function (name, source, logs) {
    if (enable_colors) {
        source = chalk.gray(source);
        switch (name) {
            case "error":
                name = chalk.red(name);
                break;
            case "warn":
                name = chalk.yellow(name);
                break;
            default:
                name = chalk.cyan(name);
                break;
        }
    }
    return _.concat([], name, source, logs);
};
var apply = function (name, source) { return function () {
    var logs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        logs[_i] = arguments[_i];
    }
    stop_spinner();
    switch (name) {
        case "warn":
            log.warn.apply(log, colorize(name, source, logs));
            break;
        case "error":
            log.error.apply(log, colorize(name, source, logs));
            break;
        default:
            log.info.apply(log, colorize(name, source, logs));
            break;
    }
}; };
var apply_issue = function (name, source) { return function () {
    var logs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        logs[_i] = arguments[_i];
    }
    if ((_.isEmpty(allow_issue_types) ||
        _.some(allow_issue_types, function (t) { return t == source; }))) {
        log.info.apply(log, colorize(name, source, logs));
    }
}; };
var create = function (source) {
    return {
        error: apply("error", source),
        error_issue: apply_issue("error", source),
        info: apply("info", source),
        info_issue: apply_issue("info", source),
        warn: apply("warn", source),
        warn_issue: apply_issue("warn", source)
    };
};
var api = {
    create: create,
    disable: disable,
    enable: enable,
    level: level,
    start_spinner: start_spinner,
    stop_spinner: stop_spinner,
    update_spinner: update_spinner
};
enable();
module.exports = api;
