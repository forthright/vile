"use strict";
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var logger = require("./../logger");
var PluginNotFoundError = require("./plugin_not_found_error");
var readdirAsync = Promise.promisify(fs.readdir);
var log = logger.create("plugin");
var BUNDLED_PLUGINS = [
    "ferret-comment",
    "ferret-coverage",
    "ferret-stat"
];
var NODE_MODULES = "node_modules";
var FORTHRIGHT_NPM_PATH = "@forthright";
var is_plugin = function (name) {
    return !!/^ferret-/.test(name);
};
var cannot_find_module = function (err) {
    return /cannot find module/i.test(_.get(err, "stack", err));
};
var _locate = function (module_name, orgname) {
    if (orgname === void 0) { orgname = ""; }
    var cwd_node_modules = path.join(process.cwd(), NODE_MODULES, orgname);
    var module_name_cwd_node_modules = cwd_node_modules + "/" + module_name;
    var plugin;
    try {
        log.debug("require(", module_name_cwd_node_modules, ")");
        plugin = require(module_name_cwd_node_modules);
        log.debug("found", module_name_cwd_node_modules);
    }
    catch (e) {
        if (cannot_find_module(e)) {
            try {
                var module_loc = path.join(orgname, module_name);
                log.debug("require(", module_loc, ")");
                plugin = require(module_loc);
                log.debug("found", module_loc);
            }
            catch (e2) {
                if (cannot_find_module(e2)) {
                    throw new PluginNotFoundError(e2);
                }
                else {
                    throw e2;
                }
            }
        }
        else {
            throw e;
        }
    }
    return plugin;
};
var locate = function (name) {
    var plugin;
    try {
        plugin = _locate(name, FORTHRIGHT_NPM_PATH);
    }
    catch (e) {
        if (e.name == "PluginNotFoundError") {
            plugin = _locate(name);
        }
        else {
            throw e;
        }
    }
    return plugin;
};
var node_modules_list = function (org) {
    if (org === void 0) { org = ""; }
    var m_path = path.join(process.cwd(), NODE_MODULES, org);
    if (fs.existsSync(m_path)) {
        return readdirAsync(m_path)
            .then(function (list) {
            return _.map(_.filter(list, function (item) {
                return is_plugin(item);
            }), function (item) { return path.join(org, item); });
        });
    }
    else {
        return Promise.resolve([]);
    }
};
var filter_plugins_to_run = function (installed, via_config, via_opts, via_additional_opts, skip_core_plugins) {
    var allowed_plugins = _
        .isEmpty(via_opts) ? via_config : _.concat([], via_opts);
    var to_run = skip_core_plugins ?
        installed :
        _.concat(installed, BUNDLED_PLUGINS);
    to_run = _.uniq(to_run.concat(via_additional_opts));
    return _.isEmpty(allowed_plugins) ?
        to_run :
        _.filter(to_run, function (p) {
            return _.some(allowed_plugins, function (a) {
                return p.replace(/ferret\-/, "") == a;
            });
        });
};
var available_plugins = function () {
    var bundled = _.map(BUNDLED_PLUGINS, function (p_name) {
        return "@forthright/" + p_name;
    });
    return Promise.all([
        node_modules_list(),
        node_modules_list("@forthright")
    ])
        .then(_.flatten)
        .then(function (list) {
        return _.map(_.uniq(_.concat([], bundled, list)), function (mod) {
            var version = require(mod + "/package").version;
            return [mod, version];
        });
    });
};
module.exports = {
    available_modules: available_plugins,
    bundled: BUNDLED_PLUGINS,
    filter: filter_plugins_to_run,
    locate: locate
};
