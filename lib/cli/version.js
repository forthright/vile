"use strict";
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var os_name = require("os-name");
var pkg = require("./../../package");
var NODE_MODULES = "node_modules";
var module_package_json = function (name) {
    return path.join(__dirname, "..", "..", NODE_MODULES, name, "package.json");
};
var log_node_versions = function () {
    console.log(os_name());
    _.each(process.versions, function (v, k) {
        console.log(k, v);
    });
};
var log_sub_packages = function (cb) {
    fs.readdir(NODE_MODULES, function (err, list) {
        _.each(list, function (mod) {
            if (/^vile-/.test(mod)) {
                var mod_loc = module_package_json(mod);
                var version = require(mod_loc).version;
                console.log(mod, version);
            }
        });
        cb();
    });
};
var create = function (cli) {
    return cli
        .command("version")
        .action(function () {
        console.log("ferret", pkg.version);
        if (fs.existsSync(NODE_MODULES)) {
            log_sub_packages(function () { return log_node_versions(); });
        }
        else {
            log_node_versions();
        }
    });
};
module.exports = { create: create };
