"use strict";

/// <reference path="lib/typings/index.d.ts" />
var Bluebird = require("bluebird");
var cli = require("commander");
var _ = require("lodash");
var path = require("path");
var vile = require("./index");
var git = require("./git");
var service = require("./service");
var logger = require("./logger");
var config = require("./config");
var util = require("./util");
var pkg = require("./../package");
var log = logger.create("cli");
var service_log = logger.create("vile.io");
var DEFAULT_VILE_YML = ".vile.yml";
var COMMIT_STATUS_INTERVAL_TIME = 2000; // 2s
// TODO: plugin interface
var parse_plugins = function parse_plugins(plugins) {
    return plugins && plugins.split ? plugins.split(",") : undefined;
};
var set_log_levels = function set_log_levels(logs) {
    logger.quiet();
    if (logs.split) logs.split(",").forEach(logger.level);
};
var wait_for_done_status = function wait_for_done_status(commit_id, auth) {
    return new Bluebird(function (resolve, reject) {
        // HACK: this is not consistent, and network latency will mess this
        var id = setInterval(function () {
            service.commit_status(commit_id, auth).then(function (http) {
                var status_code = _.get(http, "response.statusCode");
                var body_json = _.attempt(JSON.parse.bind(null, _.get(http, "body", "{}")));
                var message = _.get(body_json, "message");
                var data = _.get(body_json, "data");
                if (status_code != 200) {
                    if (message) {
                        service_log.info("Commit: " + commit_id + " " + message);
                    } else {
                        service_log.error("http status:", status_code);
                        service_log.error(http.body);
                    }
                    clearInterval(id);
                    reject(data);
                } else {
                    service_log.info("Commit " + commit_id + " " + message);
                    if (message == util.API.COMMIT.FINISHED) {
                        clearInterval(id);
                        resolve(data);
                    } else if (message == util.API.COMMIT.FAILED) {
                        clearInterval(id);
                        reject(data);
                    }
                }
            });
        }, COMMIT_STATUS_INTERVAL_TIME);
    });
};
var publish = function publish(issues, cli_time, opts) {
    var auth = config.get_auth();
    // HACK: can pass in project via cli arg, or via env var
    if (_.isEmpty(auth.project)) auth.project = opts.deploy;
    return service.commit(issues, cli_time, auth).then(function (http) {
        if (_.get(http, "response.statusCode") != 200) {
            // TODO: move log and error handling to inside service module
            service_log.error(_.get(http, "body"));
            return;
        }
        var body_json = _.attempt(JSON.parse.bind(null, _.get(http, "body", "{}")));
        var commit_state = _.get(body_json, "message");
        var commit_id = _.get(body_json, "data.commit_id");
        service_log.info("Commit " + commit_id + " " + commit_state);
        if (!commit_id) {
            throw new Error("No commit uid was provided on commit. " + "Can't check status.");
        } else if (!commit_state) {
            throw new Error("No commit state was provided upon creation. " + "Can't check status.");
        } else if (commit_state == util.API.COMMIT.FAILED) {
            throw new Error("Creating commit state is failed.");
        } else {
            return wait_for_done_status(commit_id, auth).then(function (data) {
                return service.log(data, opts.scores);
            });
        }
    }).catch(function (err) {
        console.log(); // newline because spinner is running
        // HACK: not the best logging of errors here
        service_log.error(_.get(err, "stack") || _.get(err, "message") || JSON.stringify(err));
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
    var cli_start_time = new Date().getTime();
    var exec = function exec() {
        return vile.exec(parse_plugins(plugins), app.config, app).then(function (issues) {
            var cli_end_time = new Date().getTime();
            var cli_time = cli_end_time - cli_start_time;
            if (app.deploy) return publish(issues, cli_time, app);
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
// TODO: move into config.ts
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
    log.info("To authenticate, first go to " + "https://vile.io and create a project AuthToken.");
    log.info();
    log.info("Then:");
    log.info();
    log.info("  ~$ VILE_API_TOKEN=project_auth_token");
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
    cli.version(pkg.version).usage("[options] <file|dir ...>").option("-p, --punish [plugin_list]", "unless specified in config, this can be a comma delimited\n                            string, else run all installed plugins").option("-c, --config [path]", "specify a config file, else look for one in the cwd").option("-f, --format [type]", "specify output format (color=default,json)").option("-l, --log [level]", "specify the log level (info|warn|error|debug)").option("-q, --quiet", "log nothing").option("-v, --verbose", "log all the things").option("-a, --authenticate", "authenticate with vile.io").option("-d, --deploy [project_name]", "publish to vile.io (disables --gitdiff)- " + "alternatively, you can set a VILE_PROJECT env var.").option("-s, --scores", "show file scores and detailed stats").option("-i, --snippets", "add code snippets to issues").option("-g, --gitdiff [rev]", "only check files patched in latest HEAD commit, or rev").option("--nodecorations", "disable color and progress bar");
    if (no_args()) cli.outputHelp();
};
var interpret = function interpret(argv) {
    return configure(), cli.parse(argv), run(cli);
};
module.exports = {
    interpret: interpret
};