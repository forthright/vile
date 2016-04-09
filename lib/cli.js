"use strict";

/// <reference path="lib/typings/index.d.ts" />
var cli = require("commander");
var _ = require("lodash");
var path = require("path");
var vile = require("./index");
var git = require("./git");
var service = require("./service");
var logger = require("./logger");
var config = require("./config");
var pkg = require("./../package");
var DEFAULT_VILE_YML = ".vile.yml";
// TODO: plugin interface
var parse_plugins = function parse_plugins(plugins) {
    return plugins && plugins.split ? plugins.split(",") : undefined;
};
var set_log_levels = function set_log_levels(logs) {
    logger.quiet();
    if (logs.split) logs.split(",").forEach(logger.level);
};
var publish = function publish(issues, opts) {
    var log = logger.create("vile.io");
    config.load_auth();
    return service.commit(issues, config.get_auth()).then(function (http) {
        if (_.get(http, "response.statusCode") == 200) {
            service.log(_.attempt(JSON.parse.bind(null, http.body)), opts.scores);
        } else {
            log.error(http.body);
        }
    }).catch(function (err) {
        console.log(); // newline because spinner is running
        // HACK: not the best logging of errors here
        log.error(_.get(err, "stack") || _.get(err, "message") || JSON.stringify(err));
    });
};
var punish = function punish(app) {
    var plugins = app.punish;
    // TODO: not ideal to mutate the app
    _.merge(app, {
        spinner: !(app.quiet || app.nodecorations),
        config: config.get()
    });
    if (!_.isEmpty(app.args)) {
        var vile_allow = _.get(app, "config.vile.allow");
        var allow = _.isEmpty(app.args) ? [] : app.args;
        if (!_.isEmpty(vile_allow)) allow = allow.concat(vile_allow);
        _.set(app, "config.vile.allow", allow);
    }
    var exec = function exec() {
        return vile.exec(parse_plugins(plugins), app.config, app).then(function (issues) {
            if (app.deploy) return publish(issues, app);
            if (app.format == "json") process.stdout.write(JSON.stringify(issues));
        });
    };
    if (app.gitdiff) {
        var rev = typeof app.gitdiff == "string" ? app.gitdiff : undefined;
        git.changed_files(rev).then(function (paths) {
            _.set(app, "config.vile.allow", paths);
            exec();
        });
    } else {
        exec();
    }
};
var load_config = function load_config(app) {
    var app_config = void 0;
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
    console.log("    ~$ export VILE_EMAIL=login_email");
    console.log("    ~$ export VILE_PROJECT=project_name");
    console.log("    ~$ export VILE_API_TOKEN=project_auth_token");
};
var run = function run(app) {
    if (app.authenticate) return authenticate();
    if (app.verbose) logger.verbose(true);
    if (app.quiet || app.format == "json") logger.quiet();
    if (app.log) set_log_levels(app.log);
    load_config(app);
    if (!_.isEmpty(app.args) || app.punish) punish(app);
};
var no_args = function no_args() {
    return !process.argv.slice(2).length;
};
var configure = function configure() {
    cli.version(pkg.version).usage("[options] <file|dir ...>").option("-p, --punish [plugin_list]", "unless specified in config, this can be a comma delimited\n                            string, else run all installed plugins").option("-c, --config [path]", "specify a config file, else look for one in the cwd").option("-f, --format [type]", "specify output format (color=default,json)").option("-l, --log [level]", "specify the log level (info|warn|error|debug)").option("-q, --quiet", "log nothing").option("-v, --verbose", "log all the things").option("-a, --authenticate", "authenticate with vile.io").option("-d, --deploy", "publish to vile.io (disables --gitdiff)").option("-s, --scores", "show file scores and detailed stats").option("-i, --snippets", "add code snippets to issues").option("-g, --gitdiff [rev]", "only check files patched in latest HEAD commit, or rev").option("--nodecorations", "disable color and progress bar");
    if (no_args()) cli.outputHelp();
};
var interpret = function interpret(argv) {
    return configure(), cli.parse(argv), run(cli);
};
module.exports = {
    interpret: interpret
};