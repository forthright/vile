/// <reference path="lib/typings/index.d.ts" />
"use strict";

var vile;
(function (vile_1) {
    var cli = require("commander");
    var _ = require("lodash");
    var fs = require("fs");
    var path = require("path");
    var vile = require("./index");
    var util = require("./util");
    var service = require("./service");
    var logger = require("./logger");
    var config = require("./config");
    var pkg = require("./../package");
    var DEFAULT_VILE_YML = ".vile.yml";
    var DEFAULT_VILE_AUTH_YML = ".vilerc";
    // TODO: plugin interface
    var parse_plugins = function parse_plugins(plugins) {
        return plugins.split ? plugins.split(",") : undefined;
    };
    var set_log_levels = function set_log_levels(logs) {
        logger.quiet();
        if (logs.split) logs.split(",").forEach(logger.level);
    };
    var punish = function punish(plugins) {
        var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        vile.exec(parse_plugins(plugins), opts.config, opts).then(function (issues) {
            if (opts.deploy) {
                var _ret = (function () {
                    config.load_auth(path.join(process.cwd(), DEFAULT_VILE_AUTH_YML));
                    var log = logger.create("vile.io");
                    return {
                        v: service.commit(issues, config.get_auth()).then(function (http) {
                            if (_.get(http, "response.statusCode") == 200) {
                                log.info(http.body);
                            } else {
                                log.error(http.body);
                            }
                        })["catch"](function (err) {
                            console.log(); // newline because spinner is running
                            log.error(err.stack || err);
                        })
                    };
                })();

                if (typeof _ret === "object") return _ret.v;
            }
            if (opts.format == "json") {
                process.stdout.write(JSON.stringify(issues));
            }
        });
    };
    var load_config = function load_config(app) {
        var app_config = undefined;
        if (app.config) {
            if (typeof app.config == "string") {
                app_config = app.config;
            } else {
                app_config = DEFAULT_VILE_YML;
            }
            config.load(path.join(process.cwd(), app_config));
        }
    };
    // TODO
    var authenticate = function authenticate() {
        console.log("  To authenticate, first go to " + "https://vile.io and create a project AuthToken.");
        console.log();
        console.log("  Then:");
        console.log();
        console.log("    echo \"email: user_email\"     >> .vilerc");
        console.log("    echo \"project: project_name\" >> .vilerc");
        console.log("    echo \"token: auth_token\"     >> .vilerc");
        console.log("    echo \".vilerc\"               >> .gitignore");
    };
    var run = function run(app) {
        if (app.authenticate) return authenticate();
        if (app.verbose) logger.verbose(true);
        if (app.quiet) logger.quiet();
        load_config(app);
        if (app.log) set_log_levels(app.log);
        if (app.punish) {
            // HACK! TODO
            if (app.format == "json") logger.quiet();
            punish(app.punish, {
                format: app.format,
                spinner: !(app.quiet || app["nodecorations"]),
                deploy: app.deploy,
                config: config.get()
            });
        }
    };
    var no_args = function no_args() {
        return !process.argv.slice(2).length;
    };
    var configure = function configure() {
        cli.version(pkg.version).usage("[options]").option("-p, --punish [plugin_list]", "unless specified in config, this can be a comma delimited\n                            string, else run all installed plugins").option("-c, --config [path]", "specify a config file, else look for one in the cwd").option("-f, --format [type]", "specify output format (color=default,json)").option("-l, --log [level]", "specify the log level (info|warn|error|debug)").option("-q, --quiet", "log nothing").option("-v, --verbose", "log all the things").option("-a, --authenticate", "authenticate with vile.io").option("-d, --deploy", "publish to vile.io").option("--nodecorations", "disable color and progress bar");
        if (no_args()) cli.outputHelp();
    };
    var interpret = function interpret(argv) {
        configure();
        cli.parse(argv);
        run(cli);
    };
    module.exports = {
        interpret: interpret
    };
})(vile || (vile = {}));