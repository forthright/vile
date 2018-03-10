"use strict";
var fs = require("fs");
var yaml = require("js-yaml");
var _ = require("lodash");
var Bluebird = require("bluebird");
var chalk = require("chalk");
var fs_writeFile = Bluebird.promisify(fs.writeFile);
var plugin_map = require("./map");
var create_config = function (config) {
    var config_without_plugins = _.cloneDeep(config);
    delete config_without_plugins.ferret.plugins;
    config_without_plugins.ferret.ignore = _.sortBy(config_without_plugins.ferret.ignore);
    return fs_writeFile(".ferret.yml", new Buffer(yaml.safeDump(config_without_plugins))).then(function (err) {
        if (err) {
            return Bluebird.reject(err);
        }
        else {
            return Bluebird.resolve(config);
        }
    });
};
var install_plugin_args = function (plugins) {
    return _.concat("install", "--save-dev", "ferret", _.reduce(plugins, function (cmd, plugin) {
        cmd.push("ferret-" + plugin);
        return cmd;
    }, []));
};
var install_plugins_instructions = function (config) {
    var by_bin = _.reduce(plugin_map.peer, function (bins, peer_deps, plugin) {
        _.each(peer_deps, function (peer_dep, bin) {
            if (!_.some(config.ferret.plugins, function (p) { return p == plugin; })) {
                return bins;
            }
            peer_dep = _.concat([], peer_dep);
            if (!bins[bin])
                bins[bin] = [];
            bins[bin] = _.uniq(_.concat(bins[bin], peer_dep));
        });
        return bins;
    }, {});
    var args = install_plugin_args(config.ferret.plugins);
    console.log();
    console.log(chalk.green("created:"), chalk.gray("package.json"));
    console.log(chalk.green("created:"), chalk.gray(".ferret.yml"));
    console.log();
    console.log(chalk.bold("Final Steps:"));
    console.log();
    console.log(chalk.green("#1"), chalk.gray("Install required packages:"));
    console.log();
    console.log("  ", "npm", args.join(" "));
    var deps = _.map(by_bin, function (dep_list, bin) { return [bin, dep_list]; });
    return Bluebird.each(deps, function (info) {
        var bin = info[0], dep_list = info[1];
        var install_args = bin == "npm" ?
            _.concat("install", "--save-dev", dep_list) :
            _.concat("install", dep_list);
        console.log("  ", bin, install_args.join(" "));
    })
        .then(function () { return config; });
};
var ready_to_analyze = function (config) {
    console.log();
    console.log(chalk.green("#2"), chalk.gray("Commit ferret's config and package defs to source:"));
    console.log();
    console.log("  ~$ git add .ferret.yml package.json");
    console.log("  ~$ git commit -m 'Added ferret to my project.'");
    console.log();
    console.log(chalk.green("#3"), chalk.gray("Analyze some code:"));
    console.log();
    console.log("  * Run ferret locally:");
    console.log("    ~$ ferret analyze");
    console.log();
    console.log("  * Learn how to upload data to ferret.io:");
    console.log("    https://docs.ferret.io/#analyzing-your-project");
    console.log();
    console.log("  * Choose and configure more advanced plugins:");
    console.log("    https://ferret.io/plugins");
    console.log();
    console.log(chalk.green("Happy Punishing!"));
};
module.exports = {
    init: function (config) {
        return create_config(config)
            .then(install_plugins_instructions)
            .then(ready_to_analyze);
    }
};
