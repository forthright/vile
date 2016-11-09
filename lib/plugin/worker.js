/// <reference path="../@types/index.d.ts" />
"use strict";
// TODO: make a bin/ shim to make this a pure module?

var Bluebird = require("bluebird");
var _ = require("lodash");
var plugin = require("./../plugin");
var ping_parent = function ping_parent(process) {
    return process.send("");
};
var set_ignore_list = function set_ignore_list(plugin_config, base) {
    var list = _.compact(_.concat([], _.get(plugin_config, "ignore", [])));
    _.set(plugin_config, "ignore", _.uniq(list.concat(base)));
};
var set_allow_list = function set_allow_list(plugin_config, base) {
    if (!_.isEmpty(base)) {
        _.set(plugin_config, "allow", _.compact(_.concat([], base)));
    } else {
        var list = _.get(plugin_config, "allow", []);
        _.set(plugin_config, "allow", _.compact(_.concat([], list)));
    }
};
var get_plugin_config = function get_plugin_config(name, config) {
    var plugin_config = _.get(config, name, {});
    var vile_ignore = _.get(config, "vile.ignore", []);
    var vile_allow = _.get(config, "vile.allow", []);
    set_ignore_list(plugin_config, vile_ignore);
    set_allow_list(plugin_config, vile_allow);
    return plugin_config;
};
var log_and_exit = function log_and_exit(error) {
    console.log(); // next line if spinner
    console.error(_.get(error, "stack", error));
    process.exit(1);
};
var handle_worker_request = function handle_worker_request(data) {
    var plugins = data.plugins;
    var config = data.config;
    Bluebird.map(plugins, function (plugin_name) {
        var name = plugin_name.replace("vile-", "");
        var plugin_config = get_plugin_config(name, config);
        return plugin.exec_plugin(name, plugin_config);
    }).then(_.flatten).then(function (issues) {
        return process.send(issues);
    }).catch(log_and_exit); // since we could be in a forked proc
};
process.on("message", handle_worker_request);
ping_parent(process);