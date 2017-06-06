"use strict";
var fs = require("fs");
var child_process = require("child_process");
var yaml = require("js-yaml");
var inquirer = require("inquirer");
var _ = require("lodash");
var Bluebird = require("bluebird");
var logger = require("./../../logger");
var plugin_map = require("./map");
var log = logger.create("cli");
var confirm_vile_config_is_ok = function (config) {
    console.log();
    console.log(config);
    console.log();
    return inquirer.prompt([
        {
            default: true,
            message: "Look good?",
            name: "ok_to_continue",
            type: "confirm"
        }
    ]).then(function (answers) {
        if (answers.ok_to_continue) {
            return Bluebird.resolve(config);
        }
        else {
            return Bluebird.resolve(process.exit(0));
        }
    });
};
var create_config = function (config) {
    var config_without_plugins = _.cloneDeep(config);
    delete config_without_plugins.vile.plugins;
    return fs.writeFileAsync(".vile.yml", new Buffer(yaml.safeDump(config_without_plugins))).then(function (err) {
        if (err) {
            return Bluebird.reject(err);
        }
        else {
            log.info("Created: .vile.yml");
            return Bluebird.resolve(config);
        }
    });
};
var install_plugin_args = function (plugins) {
    return _.concat("install", "--save-dev", "vile", _.reduce(plugins, function (cmd, plugin) {
        cmd.push("vile-" + plugin);
        return cmd;
    }, []));
};
var install_plugins = function (config) {
    var by_bin = _.reduce(plugin_map.peer, function (bins, deps_def, plugin) {
        _.each(deps_def, function (deps, bin) {
            if (!_.some(config.vile.plugins, function (p) { return p == plugin; })) {
                return bins;
            }
            if (typeof deps == "string")
                deps = [deps];
            if (!bins[bin])
                bins[bin] = [];
            bins[bin] = _.uniq(_.concat(bins[bin], deps));
        });
        return bins;
    }, {});
    if (_.isEmpty(by_bin))
        return Bluebird.resolve(config);
    return inquirer.prompt([
        {
            default: false,
            message: "Install required plugins and their peer dependencies? " +
                ("(requires " + Object.keys(by_bin).join(",") + ")"),
            name: "ok_to_continue",
            type: "confirm"
        }
    ]).then(function (answers) {
        var install = answers.ok_to_continue;
        var deps = _.map(by_bin, function (dep_list, bin) { return [bin, dep_list]; });
        if (install) {
            log.info("Installing peer dependencies... this could take a while.");
        }
        return Bluebird.each(deps, function (info) {
            var bin = info[0], dep_list = info[1];
            var args = bin == "npm" ?
                _.concat("install", "--save-dev", dep_list) :
                _.concat("install", dep_list);
            if (!install) {
                log.warn("skipping:", bin, args.join(" "));
                return Bluebird.resolve(config);
            }
            else {
                log.info(bin, args.join(" "));
                return new Bluebird(function (resolve, reject) {
                    child_process
                        .spawn(bin, args, { stdio: [0, 1, 2] })
                        .on("close", function (code) {
                        if (code != 0) {
                            var msg = bin + " died with code: " + code;
                            reject(msg);
                        }
                        else {
                            log.info(bin, "finished installing dependencies");
                            resolve();
                        }
                    });
                });
            }
        })
            .then(function () {
            return new Bluebird(function (resolve, reject) {
                var args = install_plugin_args(config.vile.plugins);
                if (install) {
                    log.info("Installing plugins... this could take a while.");
                    log.info("npm", args.join(" "));
                    child_process
                        .spawn("npm", args, { stdio: [0, 1, 2] })
                        .on("close", function (code) {
                        if (code != 0) {
                            reject("Exit code was " + code);
                        }
                        else {
                            log.info("Updated: package.json");
                            resolve(config);
                        }
                    });
                }
                else {
                    log.warn("skipping:", "npm", args.join(" "));
                    resolve(config);
                }
            });
        });
    });
};
var ready_to_punish = function (config) {
    log.info();
    log.info("Looks like we are good to go!");
    log.info();
    log.info("Tips:");
    log.info("  1. Run all plugins:");
    log.info("    ~$ vile p");
    log.info();
    log.info("  2. Authenticate with vile.io:");
    log.info("    ~$ vile auth");
    log.info();
    log.info("  3. Upload your first commit:");
    log.info("    ~$ VILE_TOKEN=XXXXXXX vile p " +
        "-u project_name");
    log.info();
    log.info("  4. Routinely punish your code by " +
        "integrating vile into your CI/CD build process.");
    log.info();
    log.info("Also, be sure to read up on your installed " +
        "plugins, and any extra requirements they might have:");
    log.info("  https://vile.io/plugins");
    log.info();
    log.info("Happy punishing!");
};
module.exports = {
    init: function (config) {
        return confirm_vile_config_is_ok(config)
            .then(create_config)
            .then(install_plugins)
            .then(ready_to_punish);
    }
};
