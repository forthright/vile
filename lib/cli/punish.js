"use strict";

var _ = require("lodash");
var fs = require("fs");
var Bluebird = require("bluebird");
var service = require("./../service");
var path = require("path");
var config = require("./../config");
var git = require("./../git");
var util = require("./../util");
var logger = require("./../logger");
var lib = require("./../index");
var log = logger.create("cli");
var service_log = logger.create("vile.io");
var COMMIT_STATUS_INTERVAL_TIME = 2000;
var DEFAULT_VILE_YML = ".vile.yml";
var log_and_exit = function log_and_exit(error) {
    console.log();
    log.error("executing plugins");
    console.error(_.get(error, "stack", error));
    process.exit(1);
};
var wait_for = function wait_for(ms, cb) {
    var timer = setInterval(function () {
        cb(timer);
    }, ms);
};
var wait_for_done_status_and_log = function wait_for_done_status_and_log(commit_id, auth, verbose) {
    wait_for(COMMIT_STATUS_INTERVAL_TIME, function (timer) {
        service.commit_status(commit_id, auth).then(function (http) {
            var api_body = _.get(http, "body");
            var response = _.get(http, "response", { message: null });
            var status_code = _.get(response, "statusCode");
            var body_json = _.attempt(JSON.parse.bind(null, api_body));
            var message = _.get(body_json, "message");
            var data = _.get(body_json, "data");
            if (status_code != 200) {
                clearInterval(timer);
                console.error("http status:", status_code);
                log_and_exit(api_body);
            } else {
                service_log.info("Commit " + commit_id + " " + message);
                if (message == util.API.COMMIT.FINISHED) {
                    clearInterval(timer);
                    service.log(data, verbose);
                } else if (message == util.API.COMMIT.FAILED) {
                    clearInterval(timer);
                    log_and_exit(data);
                }
            }
        });
    });
};
var publish = function publish(issues, cli_time, opts) {
    var auth = config.get_auth();
    if (_.isEmpty(auth.project)) auth.project = opts.upload;
    return service.commit(issues, cli_time, auth).then(function (http) {
        if (_.get(http, "response.statusCode") != 200) {
            log_and_exit(_.get(http, "body"));
            return;
        }
        var body_json = _.attempt(JSON.parse.bind(null, _.get(http, "body", "{}")));
        var commit_state = _.get(body_json, "message");
        var commit_id = _.get(body_json, "data.commit_id", null);
        service_log.info("Commit " + commit_id + " " + commit_state);
        if (!commit_id) {
            log_and_exit("No commit uid was provided on commit. " + "Can't check status.");
        } else if (!commit_state) {
            log_and_exit("No commit state was provided upon creation. " + "Can't check status.");
        } else if (commit_state == util.API.COMMIT.FAILED) {
            log_and_exit("Creating commit state is failed.");
        } else {
            wait_for_done_status_and_log(commit_id, auth, opts.scores);
        }
    });
};
var parse_plugins = function parse_plugins(plugins) {
    return plugins && plugins.split ? plugins.split(",") : undefined;
};
var set_log_levels = function set_log_levels(logs) {
    logger.quiet();
    if (logs.split) logs.split(",").forEach(logger.level);
};
var punish = function punish(app, paths) {
    var plugins = app.plugins;
    _.merge(app, {
        spinner: !(app.quiet || app.nodecorations),
        config: config.get()
    });
    if (!_.isEmpty(paths)) {
        _.set(app, "config.vile.allow", paths);
    }
    var cli_start_time = new Date().getTime();
    var exec = function exec() {
        return lib.exec(parse_plugins(plugins), app.config, app).then(function (issues) {
            var cli_end_time = new Date().getTime();
            var cli_time = cli_end_time - cli_start_time;
            if (app.upload) return publish(issues, cli_time, app);
            if (app.format == "json") process.stdout.write(JSON.stringify(issues));
            return Bluebird.resolve();
        }).catch(log_and_exit);
    };
    if (app.gitdiff) {
        var rev = typeof app.gitdiff == "string" ? app.gitdiff : undefined;
        git.changed_files(rev).then(function (changed_paths) {
            _.set(app, "config.vile.allow", changed_paths);
            exec();
        });
    } else {
        exec();
    }
};
var load_config = function load_config(app) {
    var app_config = void 0;
    if (typeof app.config == "string") {
        app_config = app.config;
    } else {
        app_config = DEFAULT_VILE_YML;
    }
    if (fs.existsSync(app_config) || app_config != DEFAULT_VILE_YML) {
        config.load(path.join(process.cwd(), app_config));
    }
};
var create = function create(cli) {
    return cli.command("punish [paths...]").alias("p").option("-p, --plugins [plugin_list]", "unless specified in config, this can be a comma delimited " + "string, else run all installed plugins").option("-c, --config [path]", "specify a custom config file").option("-f, --format [type]", "specify output format (console,json,syntastic)").option("-u, --upload [project_name]", "publish to vile.io (disables --gitdiff)- " + "alternatively, you can set a VILE_PROJECT env var").option("-s, --scores", "show file scores and detailed stats").option("-x, --combine [combine_def]", "combine file data from two directories into one path- " + "example: [src:lib,...] or [src.ts:lib.js,...]").option("-i, --snippets", "add code snippets to issues").option("-d, --dontpostprocess", "don't post process data in any way (ex: adding ok issues)- " + "useful for per file checking- don't use with --upload").option("-g, --gitdiff [rev]", "only check files patched in latest HEAD commit, or rev").option("-l, --log [level]", "specify the log level (info|warn|error|debug)").option("-q, --quiet", "log nothing").option("-n, --nodecorations", "disable color and progress bar").action(function (paths, app) {
        load_config(app);
        if (app.quiet || app.format == "json" || app.format == "syntastic") logger.quiet();
        if (app.log) set_log_levels(app.log);
        punish(app, paths);
    });
};
module.exports = {
    create: create
};