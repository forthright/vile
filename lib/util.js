"use strict";

/// <reference path="lib/typings/index.d.ts" />
var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var npm_run_path = require("npm-run-path");
var extend = require("extend");
var _ = require("lodash");
var Bluebird = require("bluebird");
var ignore = require("ignore-file");
var logger = require("./logger");
var config = require("./config");
// TODO: make a constants file or something
var DEFAULT_VILE_YML = ".vile.yml";
Bluebird.promisifyAll(fs);
var log_error = function log_error(e) {
    console.log(e);
};
var matches = function matches(filepath, key, list_or_string) {
    var matched = void 0;
    if (!list_or_string) {
        var conf = config.get();
        // HACK: this is fragile, perhaps config should be in this module
        config = conf == {} ? _.get(config.load(DEFAULT_VILE_YML), key) : conf;
    }
    if (list_or_string) {
        matched = typeof list_or_string == "string" ? ignore.sync(list_or_string) : ignore.compile(list_or_string);
    } else {
        matched = function matched() {
            return false;
        };
    }
    return matched(filepath);
};
// TODO: what to do about dirs (expecting called to know that)
var is_ignored = function is_ignored(filepath) {
    var ignore_config = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
    return matches(filepath, "vile.ignore", ignore_config);
};
var is_allowed = function is_allowed(filepath) {
    var allow_config = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    if (_.isEmpty(allow_config)) {
        return true;
    } else {
        if (typeof allow_config == "string") allow_config = [allow_config];
        // HACK: not totally correct (ex: /fo is not within /foo)
        return _.some(allow_config, function (pattern) {
            return pattern.indexOf(filepath) == 0 || filepath.indexOf(pattern) == 0;
        }) || matches(filepath, "vile.allow", allow_config);
    }
};
var filter_promise_each = function filter_promise_each(ignore_config, allow_config) {
    return function (file_or_dir) {
        return is_allowed(file_or_dir, allow_config) && !is_ignored(file_or_dir, ignore_config);
    };
};
// TODO: make io async
var collect_files = function collect_files(target, allowed) {
    var at_root = !path.relative(process.cwd(), target);
    var rel_path = at_root ? target : path.relative(process.cwd(), target);
    var is_dir = fs.lstatSync(rel_path).isDirectory();
    if (!at_root && !allowed(rel_path, is_dir)) return;
    if (is_dir) {
        return _.flatten(fs.readdirSync(target).map(function (subpath) {
            return collect_files(path.join(target, subpath), allowed);
        }));
    } else {
        return [rel_path];
    }
};
// TODO: better typing
// TODO: add mem limit to child process
var spawn = function spawn(bin) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    return new Bluebird(function (resolve, reject) {
        var log = logger.create(bin);
        var chunks = [];
        var errors = [];
        var env = extend({}, process.env);
        env.PATH = npm_run_path({
            cwd: process.cwd(),
            path: env.PATH
        });
        log.debug(bin + " " + opts.args.join(" "));
        var proc = child_process.spawn(bin, opts.args, {
            stdio: opts.stdio || [process.stdin, "pipe", "pipe"],
            env: env
        });
        proc.stdout.on("data", function (chunk) {
            chunks.push(chunk);
        });
        proc.stderr.on("data", function (data) {
            var error = data.toString("utf-8");
            errors.push(error);
            log.warn(error);
        });
        proc.on("close", function (code) {
            var content = chunks.map(function (chunk) {
                return chunk.toString("utf-8");
            }).join("");
            if (!content) log.warn("no data was returned from " + bin);
            resolve(content);
            // TODO: be able to send along with content
            //       for now.. hack log after spinner stops
        });
    });
};
// TODO: uber complex
// TODO: check for app specific ignore (to ignore files plugin ignores)
var promise_each_file = function promise_each_file(dirpath, allow, parse_file) {
    var opts = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    if (!opts.hasOwnProperty("read_data")) opts.read_data = true;
    var readdir = new Bluebird(function (resolve, reject) {
        var files = collect_files(dirpath, allow);
        var checkable = _.chain(_.flatten(files)).filter(function (f) {
            return fs.existsSync(f) && fs.lstatSync(f).isFile();
        }).value();
        resolve(checkable);
    });
    return readdir.then(function (files) {
        return Bluebird.all(files.map(function (target) {
            if (fs.lstatSync(target).isFile()) {
                if (opts.read_data) {
                    return fs.readFileAsync(target, { encoding: "utf-8" }).then(function (data) {
                        return parse_file(target, data);
                    });
                } else {
                    return parse_file(target);
                }
            } else {
                return Bluebird.resolve([]);
            }
        })).then(function (errors) {
            return _.flatten(errors);
        }).catch(log_error);
    });
};
// TODO: validate issue objects as it comes in
var into_issue = function into_issue(data) {
    return data;
};
module.exports = {
    promise_each: promise_each_file,
    filter: filter_promise_each,
    issue: into_issue,
    ignored: is_ignored,
    allowed: is_allowed,
    spawn: spawn,
    API: {
        COMMIT: {
            FINISHED: "finished",
            PROCESSING: "processing",
            FAILED: "failed"
        }
    },
    OK: "ok",
    displayable_issues: ["warning", "style", "maintainability", "duplicate", "error", "security", "dependency"],
    WARN: "warning",
    STYL: "style",
    MAIN: "maintainability",
    COMP: "complexity",
    CHURN: "churn",
    DUPE: "duplicate",
    DEP: "dependency",
    // TODO: map dynamically
    warnings: ["warning", "style", "maintainability", "complexity", "churn", "duplicate", "dependency"],
    ERR: "error",
    SEC: "security",
    errors: ["error", "security"],
    STAT: "stat",
    GIT: "git",
    LANG: "lang",
    COV: "cov",
    infos: ["stat", "git", "lang", "cov"]
};