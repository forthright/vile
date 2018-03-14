"use strict";
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var logger = require("./../logger");
var PluginNotFoundError = require("./plugin_not_found_error");
var readdirAsync = Promise.promisify(fs.readdir);
var log = logger.create("plugin");
var BUNDLED_PLUGINS = [];
var NODE_MODULES = "node_modules";
var OFFICIAL_SCOPE = "@forthright";
var is_plugin = function (name) {
    return !!/^ferret-/.test(name);
};
var cannot_find_module = function (err) {
    return /cannot find module/i.test(_.get(err, "stack", err));
};
var _locate = function (base_path, module_name, org_name) {
    if (org_name === void 0) { org_name = ""; }
    var modules_path = path.join(base_path, NODE_MODULES, org_name);
    var plugin;
    log.debug("looking in:", modules_path);
    try {
        var module_loc = path.join(modules_path, module_name);
        log.debug("require(", module_loc, ")");
        plugin = require(module_loc);
        log.debug("found", module_loc);
    }
    catch (e) {
        if (cannot_find_module(e)) {
            throw new PluginNotFoundError(e);
        }
        else {
            throw e;
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
                if (!_.has(process, "pkg")) {
                    throw e2;
                }
                else {
                    var bundled_modules = path.dirname(process.execPath);
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
    var cwd = process.cwd();
    var potential_locations = [
        node_modules_list(cwd),
        node_modules_list(cwd, "@forthright")
    ];
    if (_.has(process, "pkg")) {
        var pkg_entry_base = path.join(path.dirname(process.execPath));
        log.debug("searching:", pkg_entry_base);
        potential_locations.push(node_modules_list(pkg_entry_base), node_modules_list(pkg_entry_base, "@forthright"));
    }
    else {
        var pkg_entry_base = path.resolve(path.join(__dirname, "..", ".."));
        log.debug("searching:", pkg_entry_base);
        if (pkg_entry_base != cwd) {
            potential_locations.push(node_modules_list(pkg_entry_base), node_modules_list(pkg_entry_base, "@forthright"));
        }
    }
    return Promise
        .all(potential_locations)
        .then(_.flatten)
        .then(function (list) {
        log.debug("found:", "\n" + list.join("\n"));
        return _.map(_.uniq(list), function (mod_path) {
            var version = require(path.join(mod_path, "package")).version;
            return [mod_path, version];
        });
    });
};
module.exports = {
    available_modules: available_plugins,
    bundled: BUNDLED_PLUGINS,
    filter: filter_plugins_to_run,
    locate: locate
};
