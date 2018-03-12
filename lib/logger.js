"use strict";
var _ = require("lodash");
var log = require("loglevel");
var ora = require("ora");
var chalk = require("chalk");
var enable_colors = false;
var allow_data_types = [];
var spin = ora({ color: "green" });
var stop_spinner = function () {
    spin.stop();
};
var start_spinner = function () {
    if (enable_colors)
        spin.start();
};
var update_spinner = function (text) {
    spin.text = text;
    start_spinner();
};
var level = function (name) {
    process.env.FERRET_LOG_LEVEL = name;
    log.setLevel(name);
};
var enable = function (colors, data_types) {
    if (colors === void 0) { colors = true; }
    if (data_types === void 0) { data_types = []; }
    allow_data_types = data_types;
    enable_colors = colors;
    if (process.env.FERRET_NO_COLOR == "1")
        enable_colors = false;
    if (!enable_colors)
        process.env.FERRET_NO_COLOR = "1";
    level(process.env.FERRET_LOG_LEVEL || "info");
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
var apply_data = function (name, source) { return function () {
    var logs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        logs[_i] = arguments[_i];
    }
    if ((_.isEmpty(allow_data_types) ||
        _.some(allow_data_types, function (t) { return t == source; }))) {
        log.info.apply(log, colorize(name, source, logs));
    }
}; };
var create = function (source) {
    return {
        error: apply("error", source),
        error_data: apply_data("error", source),
        info: apply("info", source),
        info_data: apply_data("info", source),
        warn: apply("warn", source),
        warn_data: apply_data("warn", source)
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
