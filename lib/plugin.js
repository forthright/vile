"use strict";
var path = require("path");
var os = require("os");
var cluster = require("cluster");
var Bluebird = require("bluebird");
var fs = require("fs");
var unixify = require("unixify");
var _ = require("lodash");
var linez = require("linez");
var spinner = require("cli-spinner");
var logger = require("./logger");
var util = require("./util");
var log_helper = require("./plugin/log_helper");
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
    var plugin;
    try {
        plugin = require(cwd_node_modules + "/vile-" + name);
    }
    catch (error) {
        log.error(_.get(error, "stack", error));
    }
    return plugin;
};
var map_plugin_name_to_issues = function (name) { return function (issues) {
    return _.map(issues, function (issue) {
        return (issue.plugin = name, issue);
    });
}; };
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
            console.warn(name + " plugin did not return [] or Promise<[]>");
            resolve([]);
        }
    });
};
var log_plugins_finished = function (pkg_names) {
    _.each(pkg_names, function (plugin_name) {
        log.info(plugin_name.replace("vile-", "") + ":finish");
    });
};
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
    var errors = false;
    _.each(allowed, function (name) {
        if (!_.some(plugins, function (plugin) {
            return plugin.replace("vile-", "") == name;
        })) {
            errors = true;
            log.error(name + " is not installed");
        }
    });
    if (errors)
        process.exit(1);
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
var execute_plugins = function (allowed, config, opts) {
    if (allowed === void 0) { allowed = []; }
    if (config === void 0) { config = null; }
    if (opts === void 0) { opts = {}; }
    return function (plugins) {
        return new Bluebird(function (resolve, reject) {
            check_for_uninstalled_plugins(allowed, plugins);
            cluster.setupMaster({
                exec: path.join(__dirname, "plugin", "worker.js")
            });
            if (allowed.length > 0) {
                plugins = _.filter(plugins, function (p) {
                    return _.some(allowed, function (a) { return p.replace("vile-", "") == a; });
                });
            }
            var spin;
            var workers = {};
            var plugin_count = plugins.length;
            var concurrency = os.cpus().length || 1;
            cluster.on("fork", function (worker) {
                if (spin)
                    spin.stop(true);
                var name = workers[worker.id];
                log.info(name + ":start(" + worker.id + "/" + plugin_count + ")");
                if (spin)
                    spin.start();
            });
            if (opts.spinner && opts.format != "json") {
                spin = new spinner.Spinner("PUNISH");
                spin.setSpinnerDelay(60);
                spin.start();
            }
            Bluebird.map(plugins, function (plugin) {
                var worker = cluster.fork();
                var plugins_to_run = [plugin];
                workers[worker.id] = plugin.replace("vile-", "");
                return exec_in_fork(plugins_to_run, config, worker)
                    .then(function (issues) {
                    if (spin)
                        spin.stop(true);
                    log_plugins_finished(plugins_to_run);
                    if (spin)
                        spin.start();
                    normalize_paths(issues);
                    return issues;
                });
            }, { concurrency: concurrency })
                .then(_.flatten)
                .then(function (issues) {
                if (spin)
                    spin.stop(true);
                log.info("plugins:finish");
                if (!_.isEmpty(opts.combine)) {
                    issues = combine_paths(opts.combine, issues);
                }
                if (opts.format == "syntastic") {
                    log_helper.syntastic_issues(issues);
                }
                else if (opts.format != "json") {
                    log_helper.issues(issues);
                }
                resolve(issues);
            })
                .catch(reject);
        });
    };
};
var passthrough = function (issues) { return issues; };
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
var add_code_snippets = function () {
    return function (issues) {
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
};
var cwd_plugins_path = function () {
    return path.resolve(path.join(process.cwd(), "node_modules"));
};
var add_ok_issues = function (vile_allow, vile_ignore, log_distinct_ok_issues) {
    if (vile_allow === void 0) { vile_allow = []; }
    if (vile_ignore === void 0) { vile_ignore = []; }
    if (log_distinct_ok_issues === void 0) { log_distinct_ok_issues = false; }
    return function (issues) {
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
            if (log_distinct_ok_issues) {
                log_helper.issues(distinct_ok_issues);
            }
            return distinct_ok_issues.concat(issues);
        });
    };
};
var log_post_process = function (state) {
    return function (issues) {
        log.info("postprocess:" + state);
        return issues;
    };
};
var exec = function (custom_plugins, config, opts) {
    if (custom_plugins === void 0) { custom_plugins = []; }
    if (config === void 0) { config = {}; }
    if (opts === void 0) { opts = {}; }
    var app_config = _.get(config, "vile", { plugins: [] });
    var ignore = _.get(app_config, "ignore", null);
    var allow = _.get(app_config, "allow", null);
    var plugins = custom_plugins;
    var post_process = !opts.dontpostprocess;
    var allow_snippets = !opts.skipsnippets;
    if (app_config.plugins) {
        plugins = _.uniq(plugins.concat(app_config.plugins));
    }
    return fs.readdirAsync(cwd_plugins_path())
        .filter(is_plugin)
        .then(execute_plugins(plugins, config, opts))
        .then(post_process ? log_post_process("start") : passthrough)
        .then(post_process && allow_snippets ?
        add_code_snippets() : passthrough)
        .then(post_process ? add_ok_issues(allow, ignore) : passthrough)
        .then(post_process ? log_post_process("finish") : passthrough);
};
module.exports = {
    exec: exec,
    exec_plugin: exec_plugin
};
