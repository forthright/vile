"use strict";
var _ = require("lodash");
var plugin_map = require("./init/map");
var pre = require("./init/pre");
var language = require("./init/language");
var framework = require("./init/framework");
var ignore = require("./init/ignore");
var coverage = require("./init/coverage");
var post = require("./init/post");
var vile_config_base = function () {
    return {
        vile: {
            allow: [],
            ignore: [],
            plugins: _.get(plugin_map.frameworks, "core")
        }
    };
};
var initialize_vile_project = function (cli) {
    return pre.init(vile_config_base())
        .then(ignore.init)
        .then(language.init)
        .then(framework.init)
        .then(coverage.init)
        .then(post.init);
};
var create = function (cli) {
    return cli
        .command("init")
        .alias("i")
        .action(initialize_vile_project);
};
module.exports = { create: create };
