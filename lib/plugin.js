"use strict";
var path = require("path");
var os = require("os");
var chalk = require("chalk");
var cluster = require("cluster");
var Bluebird = require("bluebird");
var fs = require("fs");
var unixify = require("unixify");
var _ = require("lodash");
var linez = require("linez");
var ora = require("ora");
var logger = require("./logger");
var util = require("./util");
var PluginNotFoundError = require("./plugin/plugin_not_found_error");
Bluebird.promisifyAll(fs);
var log = logger.create("plugin");
var FILE_EXT = /\.[^\.]*$/;
var is_plugin = function (name) {
    return !!/^vile-/.test(name);
};
var valid_plugin = function (api) {
    return !!(api && typeof api.punish == "function");
};
var is_array = function (list) {
    return !!(list && typeof list.forEach == "function");
};
var is_promise = function (list) {
    return !!(list && typeof list.then == "function");
};
var require_plugin = function (name) {
    var cwd_node_modules = path.join(process.cwd(), "node_modules");
    return require(cwd_node_modules + "/vile-" + name);
};
var map_plugin_name_to_issues = function (name) { return function (issues) {
    return _.map(issues, function (issue) {
        issue.plugin = name;
        return issue;
    });
}; };
var exec_in_fork = function (plugins, config, worker) {
    return new Bluebird(function (resolve, reject) {
        worker.on("message", function (issues) {
            if (issues) {
                worker.disconnect();
                resolve(issues);
            }
            else {
                var data = { config: config, plugins: plugins };
                worker.send(data);
            }
        });
        worker.on("exit", function (code, signal) {
            var name = plugins.join(",");
            if (signal || code !== 0) {
                reject(name + " worker exited [code = " + code + " | sig = " + signal + "]");
            }
        });
    });
};
var on_windows = function () { return /windows/i.test(os.type()); };
var normalize_paths = function (issues) {
    return _.each(issues, function (issue) {
        if (_.has(issue, "path")) {
            issue.path = unixify(issue.path);
            if (process.cwd() !== ".") {
                issue.path = issue.path
                    .replace(process.cwd(), "");
            }
            if (!on_windows()) {
                issue.path = issue.path
                    .replace(/^\.\//, "")
                    .replace(/^\//, "");
            }
        }
    });
};
var check_for_uninstalled_plugins = function (allowed, plugins) {
    _.each(allowed, function (name) {
        if (!_.some(plugins, function (plugin) {
            return plugin.replace("vile-", "") == name;
        })) {
            throw new PluginNotFoundError(name + " is not installed");
        }
    });
};
var combine_paths = function (combine_str, issues) {
    var sanitized_combine_paths = _.map(combine_str.split(","), function (def) { return def.split(":"); });
    _.each(sanitized_combine_paths, function (paths) {
        var base = paths[0];
        var merge = paths[1];
        var base_path_ext = _.first(base.match(FILE_EXT));
        var merge_path_ext = _.first(merge.match(FILE_EXT));
        var base_path = base.replace(FILE_EXT, "");
        var merge_path = merge.replace(FILE_EXT, "");
        var merge_path_regexp = new RegExp("^" + merge_path + "/", "i");
        issues.forEach(function (issue, idx) {
            var issue_path = unixify(_.get(issue, "path", ""));
            var issue_type = _.get(issue, "type");
            if (!merge_path_regexp.test(issue_path))
                return;
            if (!!merge_path_ext &&
                !_.first(issue_path.match(FILE_EXT)) == !!merge_path_ext)
                return;
            var new_path = issue_path.replace(merge_path_regexp, base_path + "/");
            if (base_path_ext) {
                new_path = new_path.replace(FILE_EXT, base_path_ext);
            }
            var potential_data_dupe = !_.some(util.displayable_issues, function (t) { return t == issue_type; });
            var same_data_exists = potential_data_dupe &&
                _.some(issues, function (i) {
                    return i && _.has(i, "path") && unixify(i.path) == new_path &&
                        i.type == issue_type;
                });
            if (same_data_exists) {
                issues[idx] = undefined;
            }
            else {
                _.set(issue, "path", new_path);
            }
        });
    });
    return _.filter(issues);
};
var exec_plugin = function (name, config) {
    if (config === void 0) { config = {
        config: {},
        ignore: []
    }; }
    return new Bluebird(function (resolve, reject) {
        var api = require_plugin(name);
        if (!valid_plugin(api))
            reject("invalid plugin API: " + name);
        var issues = api.punish(config);
        if (is_promise(issues)) {
            issues
                .then(map_plugin_name_to_issues(name))
                .then(resolve)
                .catch(reject);
        }
        else if (is_array(issues)) {
            resolve(map_plugin_name_to_issues(name)(issues));
        }
        else {
            log.warn(name + " plugin did not return [] or Promise<[]>");
            resolve([]);
        }
    });
};
var execute_plugins = function (allowed, config, opts) {
    if (allowed === void 0) { allowed = []; }
    if (config === void 0) { config = null; }
    if (opts === void 0) { opts = {}; }
    return function (plugins) {
        check_for_uninstalled_plugins(allowed, plugins);
        cluster.setupMaster({
            exec: path.join(__dirname, "plugin", "worker.js")
        });
        if (allowed.length > 0) {
            plugins = _.filter(plugins, function (p) {
                return _.some(allowed, function (a) { return p.replace("vile-", "") == a; });
            });
        }
        var plugins_finished = 0;
        var plugins_running = {};
        var plugin_count = plugins.length;
        var concurrency = os.cpus().length || 1;
        var spin = ora({ color: "green" });
        if (opts.spinner && opts.format != "json")
            spin.start();
        var update_spinner = function () {
            var percent = _.toNumber(plugins_finished / plugin_count * 100).toFixed(0);
            var names = _.map(_.keys(plugins_running), function (p) { return p.replace(/^vile-/, ""); }).join(" + ");
            if (names)
                names = " [" + names + "]";
            spin.text = chalk.gray(percent + "%" + names);
        };
        return Bluebird.map(plugins, function (plugin) {
            var worker = cluster.fork();
            var plugins_to_run = [plugin];
            _.each(plugins_to_run, function (p) { plugins_running[p] = true; });
            update_spinner();
            return exec_in_fork(plugins_to_run, config, worker)
                .then(function (issues) {
                if (spin)
                    spin.stop();
                plugins_finished += plugins_to_run.length;
                _.each(plugins_to_run, function (p) { delete plugins_running[p]; });
                update_spinner();
                if (spin)
                    spin.start();
                normalize_paths(issues);
                return issues;
            });
        }, { concurrency: concurrency })
            .then(_.flatten)
            .then(function (issues) {
            if (!_.isEmpty(opts.combine)) {
                issues = combine_paths(opts.combine, issues);
            }
            var stop_spinner = function () { return spin && spin.stop(); };
            if (opts.dont_post_process) {
                stop_spinner();
                return issues;
            }
            else {
                var app_ignore_1 = _.get(config, "vile.ignore", null);
                var app_allow_1 = _.get(config, "vile.allow", null);
                if (opts.skip_snippets) {
                    return add_ok_issues(app_allow_1, app_ignore_1, issues)
                        .then(function (i) {
                        stop_spinner();
                        return i;
                    });
                }
                else {
                    return add_code_snippets(issues)
                        .then(function (i) { return add_ok_issues(app_allow_1, app_ignore_1, i); })
                        .then(function (i) {
                        stop_spinner();
                        return i;
                    });
                }
            }
        });
    };
};
var into_snippet = function (lines, start, end) {
    return _.reduce(lines, function (snippets, line, num) {
        if ((num > (start - 4) && num < (end + 2))) {
            snippets.push({
                ending: "\n",
                line: _.get(line, "number"),
                text: _.get(line, "text", " ")
            });
        }
        return snippets;
    }, []);
};
var add_code_snippets = function (issues) {
    return Bluebird.map(_.uniq(_.map(issues, "path")), function (filepath) {
        if (!(filepath &&
            fs.existsSync(filepath) &&
            fs.lstatSync(filepath).isFile()))
            return;
        var lines = linez(fs.readFileSync(path.join(process.cwd(), filepath), "utf-8")).lines;
        _.each(_.filter(issues, function (i) { return i.path == filepath; }), function (issue) {
            var start = Number(_.get(issue, "where.start.line", 0));
            var end = Number(_.get(issue, "where.end.line", start));
            if (issue.type == util.DUPE) {
                var locations = _.
                    get(issue, "duplicate.locations", []);
                _.each(locations, function (loc) {
                    var sub_start = Number(_.get(loc, "where.start.line", 0));
                    var sub_end = Number(_.get(loc, "where.end.line", sub_start));
                    if (sub_start === 0 && end === sub_end)
                        return;
                    if (loc.path == filepath) {
                        loc.snippet = into_snippet(lines, sub_start, sub_end);
                    }
                    else {
                        var alt_lines = linez(fs.readFileSync(path.join(process.cwd(), loc.path), "utf-8")).lines;
                        loc.snippet = into_snippet(alt_lines, sub_start, sub_end);
                    }
                });
            }
            else {
                if (start === 0 && end === start)
                    return;
                if (_.some(util.displayable_issues, function (t) { return t == issue.type; })) {
                    issue.snippet = into_snippet(lines, start, end);
                }
            }
        });
    })
        .then(function () { return issues; });
};
var cwd_plugins_path = function () {
    return path.resolve(path.join(process.cwd(), "node_modules"));
};
var add_ok_issues = function (vile_allow, vile_ignore, issues) {
    if (vile_allow === void 0) { vile_allow = []; }
    if (vile_ignore === void 0) { vile_ignore = []; }
    if (issues === void 0) { issues = []; }
    return util.promise_each(process.cwd(), function (p, is_dir) {
        return (util.allowed(p, vile_allow) || is_dir) &&
            !util.ignored(p, vile_ignore);
    }, function (filepath) { return util.issue({
        path: unixify(filepath),
        type: util.OK
    }); }, { read_data: false })
        .then(function (ok_issues) {
        var distinct_ok_issues = _.reject(ok_issues, function (issue) {
            return _.some(issues, function (i) { return i.path == issue.path; });
        });
        return distinct_ok_issues.concat(issues);
    });
};
var exec = function (config, opts) {
    if (config === void 0) { config = {}; }
    if (opts === void 0) { opts = {}; }
    var app_config = _.get(config, "vile", {});
    var config_specified_plugins = _.get(app_config, "plugins", []);
    var plugins = _.isEmpty(opts.plugins) ?
        config_specified_plugins :
        _.compact(_.concat([], opts.plugins));
    return fs.readdirAsync(cwd_plugins_path())
        .filter(is_plugin)
        .then(execute_plugins(plugins, config, opts));
};
module.exports = {
    exec: exec,
    exec_plugin: exec_plugin
};
