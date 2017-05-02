"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var fs = require("fs");
var child_process = require("child_process");
var yaml = require("js-yaml");
var inquirer = require("inquirer");
var _ = require("lodash");
var Bluebird = require("bluebird");
var logger = require("./../../logger");
var plugin_map = require("./map");
var log = logger.create("cli");
var confirm_vile_config_is_ok = function confirm_vile_config_is_ok(config) {
    console.log();
    console.log(config);
    console.log();
    return inquirer.prompt([{
        type: "confirm",
        name: "ok_to_continue",
        message: "Look good?",
        default: true
    }]).then(function (answers) {
        if (answers.ok_to_continue) {
            return Bluebird.resolve(config);
        } else {
            return Bluebird.resolve(process.exit(0));
        }
    });
};
var create_config = function create_config(config) {
    var config_without_plugins = _.cloneDeep(config);
    delete config_without_plugins.vile.plugins;
    return fs.writeFileAsync(".vile.yml", new Buffer(yaml.safeDump(config_without_plugins))).then(function (err) {
        if (err) {
            return Bluebird.reject(err);
        } else {
            log.info("Created: .vile.yml");
            return Bluebird.resolve(config);
        }
    });
};
var install_plugin_args = function install_plugin_args(plugins) {
    return _.concat("install", "--save-dev", "vile", _.reduce(plugins, function (cmd, plugin) {
        cmd.push("vile-" + plugin);
        return cmd;
    }, []));
};
var install_plugins = function install_plugins(config) {
    var by_bin = _.reduce(plugin_map.peer, function (bins, deps_def, plugin) {
        _.each(deps_def, function (deps, bin) {
            if (!_.some(config.vile.plugins, function (p) {
                return p == plugin;
            })) {
                return bins;
            }
            if (typeof deps == "string") deps = [deps];
            if (!bins[bin]) bins[bin] = [];
            bins[bin] = _.uniq(_.concat(bins[bin], deps));
        }, {});
        return bins;
    }, {});
    if (_.isEmpty(by_bin)) return Bluebird.resolve(config);
    return inquirer.prompt([{
        type: "confirm",
        name: "ok_to_continue",
        message: "Install required plugins and their peer dependencies? " + ("(requires " + Object.keys(by_bin).join(",") + ")"),
        default: false
    }]).then(function (answers) {
        var install = answers.ok_to_continue;
        var deps = _.map(by_bin, function (deps, bin) {
            return [bin, deps];
        });
        if (install) {
            log.info("Installing peer dependencies... this could take a while.");
        }
        return Bluebird.each(deps, function (info) {
            var _info = _slicedToArray(info, 2),
                bin = _info[0],
                deps = _info[1];

            var args = bin == "npm" ? _.concat("install", "--save-dev", deps) : _.concat("install", deps);
            if (!install) {
                log.warn("skipping:", bin, args.join(" "));
                return Bluebird.resolve(config);
            } else {
                log.info(bin, args.join(" "));
                return new Bluebird(function (resolve, reject) {
                    child_process.spawn(bin, args, { stdio: [0, 1, 2] }).on("close", function (code) {
                        if (code != 0) {
                            var msg = bin + " died with code: " + code;
                            reject(msg);
                        } else {
                            log.info(bin, "finished installing dependencies");
                            resolve();
                        }
                    });
                });
            }
        }).then(function () {
            return new Bluebird(function (resolve, reject) {
                var args = install_plugin_args(config.vile.plugins);
                if (install) {
                    log.info("Installing plugins... this could take a while.");
                    log.info("npm", args.join(" "));
                    child_process.spawn("npm", args, { stdio: [0, 1, 2] }).on("close", function (code) {
                        if (code != 0) {
                            reject("Exit code was " + code);
                        } else {
                            log.info("Updated: package.json");
                            resolve(config);
                        }
                    });
                } else {
                    log.warn("skipping:", "npm", args.join(" "));
                    resolve(config);
                }
            });
        });
    });
};
var ready_to_punish = function ready_to_punish(config) {
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
    log.info("    ~$ VILE_TOKEN=XXXXXXX vile p " + "-u project_name");
    log.info();
    log.info("  4. Routinely punish your code by " + "integrating vile into your CI/CD build process.");
    log.info();
    log.info("Also, be sure to read up on your installed " + "plugins, and any extra requirements they might have:");
    log.info("  https://vile.io/plugins");
    log.info();
    log.info("Happy punishing!");
};
module.exports = {
    init: function init(config) {
        return confirm_vile_config_is_ok(config).then(create_config).then(install_plugins).then(ready_to_punish);
    }
};