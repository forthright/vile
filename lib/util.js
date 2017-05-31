"use strict";

var unixify = require("unixify");
var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var npm_run_path = require("npm-run-path");
var extend = require("extend");
var _ = require("lodash");
var Bluebird = require("bluebird");
var ignore = require("ignore");
var config = require("./config");
var DEFAULT_VILE_YML = ".vile.yml";
Bluebird.promisifyAll(fs);
var get_or_load_config = function get_or_load_config() {
    var conf = config.get();
    if (_.isEmpty(conf)) conf = config.load(DEFAULT_VILE_YML);
    return conf;
};
var matches = function matches(filepath, config_key, to_match) {
    var matcher = ignore();
    if (!to_match) {
        to_match = _.get(get_or_load_config(), config_key, []);
    }
    return matcher.add(_.concat([], to_match)).ignores(filepath);
};
var is_ignored = function is_ignored(filepath) {
    var ignore_list = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return matches(unixify(filepath), "vile.ignore", ignore_list);
};
var is_allowed = function is_allowed(filepath) {
    var allow_list = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    var unixpath = unixify(filepath);
    if (_.isEmpty(allow_list)) return true;
    return _.some(_.concat([], allow_list), function (pattern) {
        return matches(unixpath, "vile.allow", allow_list);
    });
};
var filter_promise_each = function filter_promise_each(ignore_list, allow_list) {
    return function (file_or_dir) {
        return is_allowed(file_or_dir, allow_list) && !is_ignored(file_or_dir, ignore_list);
    };
};
var collect_files = function collect_files(target, allowed) {
    var at_root = !path.relative(process.cwd(), target);
    var rel_path = at_root ? target : path.relative(process.cwd(), target);
    var is_dir = fs.lstatSync(rel_path).isDirectory();
    if (!at_root && !allowed(rel_path, is_dir)) return [];
    if (is_dir) {
        return _.flatten(fs.readdirSync(target).map(function (subpath) {
            return collect_files(path.join(target, subpath), allowed);
        }));
    } else {
        return [rel_path];
    }
};
var spawn = function spawn(bin) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return new Bluebird(function (resolve, reject) {
        var chunks = [];
        var errors = [];
        var env = extend({}, process.env);
        env.PATH = env.PATH + ":" + npm_run_path({ cwd: process.cwd(), path: "" });
        var proc = child_process.spawn(bin, opts.args, {
            env: env,
            stdio: opts.stdio || [process.stdin, "pipe", "pipe"]
        });
        proc.stdout.on("data", function (chunk) {
            chunks.push(chunk);
        });
        proc.stderr.on("data", function (data) {
            var error = data.toString("utf-8");
            errors.push(error);
            console.warn(error);
        });
        proc.on("close", function (code) {
            var stdout = chunks.map(function (chunk) {
                return chunk.toString("utf-8");
            }).join("");
            var stderr = errors.join("");
            var http = { code: code, stderr: stderr, stdout: stdout };
            resolve(http);
        });
    });
};
var promise_each_file = function promise_each_file(dirpath, allow, parse_file) {
    var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

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
        })).then(function (targets) {
            return _.flatten(targets);
        });
    });
};
var into_issue = function into_issue(data) {
    return data;
};
var types = {
    CHURN: "churn",
    COMP: "complexity",
    COV: "cov",
    DEP: "dependency",
    DUPE: "duplicate",
    ERR: "error",
    LANG: "lang",
    MAIN: "maintainability",
    OK: "ok",
    SCM: "scm",
    SEC: "security",
    STAT: "stat",
    STYL: "style",
    WARN: "warning"
};
var displayable_issues = ["warning", "style", "maintainability", "duplicate", "error", "security", "dependency"];
var warnings = ["warning", "style", "maintainability", "complexity", "churn", "duplicate", "dependency"];
var errors = ["error", "security"];
var infos = ["stat", "scm", "lang", "cov"];
var API = {
    COMMIT: {
        FAILED: "failed",
        FINISHED: "finished",
        PROCESSING: "processing"
    }
};
module.exports = extend({}, types, {
    API: API,
    allowed: is_allowed,
    displayable_issues: displayable_issues,
    errors: errors,
    filter: filter_promise_each,
    ignored: is_ignored,
    infos: infos,
    issue: into_issue,
    promise_each: promise_each_file,
    spawn: spawn,
    warnings: warnings
});