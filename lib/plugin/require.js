"use strict";
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var logger = require("./../logger");
var PluginNotFoundError = require("./plugin_not_found_error");
var readdirAsync = Promise.promisify(fs.readdir);
var log = logger.create("plugin");
var NODE_MODULES = "node_modules";
var OFFICIAL_SCOPE = "@forthright";
var is_plugin = function (name) {
    return !!/^ferret-/.test(name);
};
var cannot_find_module = function (err, module_loc) {
    return new RegExp("cannot find module '" + module_loc + "'", "i")
        .test(_.get(err, "stack", err));
};
var _locate = function (base_path, module_name, org_name) {
    if (org_name === void 0) { org_name = ""; }
    var modules_path = path.join(base_path, NODE_MODULES, org_name);
    var plugin;
    log.debug("looking for " + module_name + " in:", modules_path);
    var module_loc = path.join(modules_path, module_name);
    try {
        plugin = require(module_loc);
        log.debug("using", module_loc);
    }
    catch (e) {
        if (cannot_find_module(e, module_loc)) {
            throw new PluginNotFoundError(e);
        }
        else {
            log.error(e);
        }
    }
    return plugin;
};
var locate = function (name) {
    var plugin;
    var local_modules = process.cwd();
    try {
        plugin = _locate(local_modules, name);
    }
    catch (e) {
        if (e.name != "PluginNotFoundError") {
            throw e;
        }
        else {
            try {
                plugin = _locate(local_modules, name, OFFICIAL_SCOPE);
            }
            catch (e2) {
                var bundled_modules = _.get(process, "env.FERRET_PLUGINS_PATH");
                if (!bundled_modules) {
                    throw e2;
                }
                else {
                    try {
                        plugin = _locate(bundled_modules, name);
                    }
                    catch (e3) {
                        if (e.name == "PluginNotFoundError") {
                            plugin = _locate(bundled_modules, name, OFFICIAL_SCOPE);
                        }
                        else {
                            throw e3;
                        }
                    }
                }
            }
        }
    }
    return plugin;
};
var node_modules_list = function (base, org) {
    if (org === void 0) { org = ""; }
    var m_path = path.join(base, NODE_MODULES, org);
    if (fs.existsSync(m_path)) {
        return readdirAsync(m_path)
            .then(function (list) {
            return _.map(_.filter(list, function (item) {
                return is_plugin(item);
            }), function (item) {
                return path.join(m_path, item);
            });
        });
    }
    else {
        log.debug("empty:", m_path);
        return Promise.resolve([]);
    }
};
var filter_plugins_to_run = function (installed, via_config, via_opts, via_additional_opts) {
    var allowed_plugins = _
        .isEmpty(via_opts) ? via_config : _.concat([], via_opts);
    var to_run = _.uniq(_.concat([], installed, via_additional_opts));
    return _.isEmpty(allowed_plugins) ?
        to_run :
        _.filter(to_run, function (p) {
            return _.some(allowed_plugins, function (a) {
                return p.replace(/ferret\-/, "") == a;
            });
        });
};
var available_plugins = function () {
    var cwd = process.cwd();
    var potential_locations = [
        node_modules_list(cwd),
        node_modules_list(cwd, "@forthright")
    ];
    var bundled_modules = _.get(process, "env.FERRET_PLUGINS_PATH");
    if (bundled_modules) {
        var abs_path = path.resolve(bundled_modules);
        potential_locations.push(node_modules_list(abs_path), node_modules_list(abs_path, "@forthright"));
    }
    return Promise
        .all(potential_locations)
        .then(_.flatten)
        .then(function (list) {
        log.debug("known locations...", "\n=> " +
            (list.join("\n=> ") || "none"));
        return _.map(_.uniq(list), function (mod_path) {
            var version = require(path.join(mod_path, "package.json")).version;
            return [mod_path, version];
        });
    });
};
module.exports = {
    available_modules: available_plugins,
    filter: filter_plugins_to_run,
    locate: locate
};
