"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var _ = require("lodash");
var PluginNotFoundError = require("./plugin_not_found_error");
var FORTHRIGHT_NPM = "@forthright";
var cannot_find_module = function (err) {
    return /cannot find module/i.test(_.get(err, "stack", err));
};
var _locate = function (name, orgname) {
    if (orgname === void 0) { orgname = ""; }
    var cwd_node_modules = path.join(process.cwd(), "node_modules");
    var module_name = orgname + "ferret-" + name;
    var module_name_cwd_node_modules = cwd_node_modules + "/" + module_name;
    var plugin;
    try {
        plugin = require(module_name_cwd_node_modules);
    }
    catch (e) {
        if (cannot_find_module(e)) {
            try {
                plugin = require(module_name);
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
        plugin = _locate(name, FORTHRIGHT_NPM);
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
exports.locate = locate;
