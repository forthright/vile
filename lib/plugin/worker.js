"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Bluebird = require("bluebird");
var _ = require("lodash");
var plugin = require("./../plugin");
var logger = require("./../logger");
var log = logger.create("worker");
process.on("unhandledRejection", function (error, promise) {
    log_and_exit(error, true);
});
var ping_parent = function (process) { return process.send(""); };
var log_and_exit = function (error, was_promise) {
    var msg = _.get(error, "stack", error);
    if (was_promise) {
        log.error("Unhandled Promise.reject:", msg);
    }
    else {
        log.error("\n", msg);
    }
    process.exit(1);
};
var set_ignore_list = function (plugin_config, base) {
    var list = _.compact(_.concat([], _.get(plugin_config, "ignore", [])));
    _.set(plugin_config, "ignore", _.uniq(list.concat(base)));
};
var set_allow_list = function (plugin_config, base) {
    if (!_.isEmpty(base)) {
        _.set(plugin_config, "allow", _.compact(_.concat([], base)));
    }
    else {
        var list = _.get(plugin_config, "allow", []);
        _.set(plugin_config, "allow", _.compact(_.concat([], list)));
    }
};
var get_plugin_config = function (name, config) {
    var plugin_config = _.get(config, name, {});
    var ferret_ignore = _.get(config, "ferret.ignore", []);
    var ferret_allow = _.get(config, "ferret.allow", []);
    set_ignore_list(plugin_config, ferret_ignore);
    set_allow_list(plugin_config, ferret_allow);
    return plugin_config;
};
var handle_worker_request = function (data) {
    var plugins = data.plugins;
    var config = data.config;
    Bluebird.map(plugins, function (plugin_name) {
        var real_name = plugin_name.replace("ferret-", "");
        var plugin_config = get_plugin_config(real_name, config);
        return plugin.exec_plugin(plugin_name, plugin_config);
    })
        .then(_.flatten)
        .then(function (data) { return process.send(data); })
        .catch(log_and_exit);
};
process.on("message", handle_worker_request);
ping_parent(process);
