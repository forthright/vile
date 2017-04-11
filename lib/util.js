"use strict";

var unixify = require("unixify");
var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var npm_run_path = require("npm-run-path");
var extend = require("extend");
var _ = require("lodash");
var Bluebird = require("bluebird");
var ignore = require("ignore-file");
var config = require("./config");
var DEFAULT_VILE_YML = ".vile.yml";
Bluebird.promisifyAll(fs);
var matches = function matches(filepath, key, list_or_string) {
    var matched = void 0;
    if (!list_or_string) {
        var conf = config.get();
        list_or_string = _.isEmpty(conf) ? _.get(config.load(DEFAULT_VILE_YML), key) : conf;
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
var is_ignored = function is_ignored(filepath) {
    var ignore_list = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return matches(unixify(filepath), "vile.ignore", ignore_list);
};
var is_allowed = function is_allowed(filepath) {
    var allow_list = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    filepath = unixify(filepath);
    if (_.isEmpty(allow_list)) {
        return true;
    } else {
        if (typeof allow_list == "string") allow_list = [allow_list];
        return _.some(allow_list, function (pattern) {
            return pattern.indexOf(filepath) == 0 || filepath.indexOf(pattern) == 0;
        }) || matches(filepath, "vile.allow", allow_list);
    }
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
            stdio: opts.stdio || [process.stdin, "pipe", "pipe"],
            env: env
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
            resolve({
                code: code,
                stdout: stdout,
                stderr: stderr
            });
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
    OK: "ok",
    WARN: "warning",
    STYL: "style",
    MAIN: "maintainability",
    COMP: "complexity",
    CHURN: "churn",
    DUPE: "duplicate",
    DEP: "dependency",
    ERR: "error",
    SEC: "security",
    STAT: "stat",
    SCM: "scm",
    LANG: "lang",
    COV: "cov"
};
var api = extend({}, types, {
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
    displayable_issues: ["warning", "style", "maintainability", "duplicate", "error", "security", "dependency"],
    warnings: ["warning", "style", "maintainability", "complexity", "churn", "duplicate", "dependency"],
    errors: ["error", "security"],
    infos: ["stat", "scm", "lang", "cov"]
});
module.exports = api;