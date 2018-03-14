"use strict";
var plugin_require = require("./../plugin/require");
var _ = require("lodash");
var os_name = require("os-name");
var pkg = require("./../../package");
var log_node_versions = function () {
    console.log(os_name());
    _.each(process.versions, function (v, k) {
        console.log(k, v);
    });
};
var create = function (cli) {
    return cli
        .command("versions")
        .alias("version")
        .action(function () {
        console.log("ferret", pkg.version);
        plugin_require.available_modules().then(function (mods) {
            _.each(mods, function (mod) {
                console.log(_.last(_.split(mod[0], "/")), _.last(mod));
            });
            log_node_versions();
        });
    });
};
module.exports = { create: create };
