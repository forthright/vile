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
var is_plugin = function is_plugin(name) {
    return !!/^vile-/.test(name);
};
var valid_plugin = function valid_plugin(api) {
    return !!(api && typeof api.punish == "function");
};
var is_array = function is_array(list) {
    return !!(list && typeof list.forEach == "function");
};
var is_promise = function is_promise(list) {
    return !!(list && typeof list.then == "function");
};
var require_plugin = function require_plugin(name) {
    var cwd_node_modules = path.join(process.cwd(), "node_modules");
    var plugin = void 0;
    try {
        plugin = require(cwd_node_modules + "/@forthright/vile-" + name);
    } catch (error) {
        log.error(_.get(error, "stack", error));
    }
    return plugin;
};
var map_plugin_name_to_issues = function map_plugin_name_to_issues(name) {
    return function (issues) {
        return _.map(issues, function (issue) {
            return issue.plugin = name, issue;
        });
    };
};
var run_plugin = function run_plugin(name) {
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        config: {},
        ignore: []
    };
    return new Bluebird(function (resolve, reject) {
        var api = require_plugin(name);
        if (!valid_plugin(api)) reject("invalid plugin API: " + name);
        var issues = api.punish(config);
        if (is_promise(issues)) {
            issues.then(map_plugin_name_to_issues(name)).then(resolve).catch(reject);
        } else if (is_array(issues)) {
            resolve(map_plugin_name_to_issues(name)(issues));
        } else {
            console.warn(name + " plugin did not return [] or Promise<[]>");
            resolve([]);
        }
    });
};
var log_plugins_finished = function log_plugins_finished(pkg_names) {
    _.each(pkg_names, function (plugin_name) {
        log.info(plugin_name.replace("vile-", "") + ":finish");
    });
};
var run_plugins_in_fork = function run_plugins_in_fork(plugins, config, worker) {
    return new Bluebird(function (resolve, reject) {
        worker.on("message", function (issues) {
            if (issues) {
                worker.disconnect();
                log_plugins_finished(plugins);
                resolve(issues);
            } else {
                worker.send({
                    plugins: plugins,
                    config: config
                });
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
var normalize_paths = function normalize_paths(issues) {
    return _.each(issues, function (issue) {
        if (_.has(issue, "path")) {
            issue.path = unixify(issue.path).replace(process.cwd(), "");
            if (!/windows/i.test(os.type())) {
                issue.path = unixify(issue.path).replace(/^\.\/?/, "").replace(/^\/?/, "");
            }
        }
    });
};
var check_for_uninstalled_plugins = function check_for_uninstalled_plugins(allowed, plugins) {
    var errors = false;
    _.each(allowed, function (name) {
        if (!_.some(plugins, function (plugin) {
            return plugin.replace("vile-", "") == name;
        })) {
            errors = true;
            log.error(name + " is not installed");
        }
    });
    if (errors) process.exit(1);
};
var combine_paths = function combine_paths(combine_str, issues) {
    var combine_paths = _.map(combine_str.split(","), function (def) {
        return def.split(":");
    });
    _.each(combine_paths, function (paths) {
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
            if (!merge_path_regexp.test(issue_path)) return;
            if (!!merge_path_ext && !_.first(issue_path.match(FILE_EXT)) == !!merge_path_ext) return;
            var new_path = issue_path.replace(merge_path_regexp, base_path + "/");
            if (base_path_ext) {
                new_path = new_path.replace(FILE_EXT, base_path_ext);
            }
            var potential_data_dupe = !_.some(util.displayable_issues, function (t) {
                return t == issue_type;
            });
            var same_data_exists = potential_data_dupe && _.some(issues, function (i) {
                return i && _.has(i, "path") && unixify(i.path) == new_path && i.type == issue_type;
            });
            if (same_data_exists) {
                issues[idx] = undefined;
            } else {
                _.set(issue, "path", new_path);
            }
        });
    });
    return _.filter(issues);
};
var execute_plugins = function execute_plugins() {
    var allowed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return function (plugins) {
        return new Bluebird(function (resolve, reject) {
            check_for_uninstalled_plugins(allowed, plugins);
            cluster.setupMaster({
                exec: path.join(__dirname, "plugin", "worker.js")
            });
            if (allowed.length > 0) {
                plugins = _.filter(plugins, function (p) {
                    return _.some(allowed, function (a) {
                        return p.replace("vile-", "") == a;
                    });
                });
            }
            var spin = void 0;
            var workers = {};
            var plugin_count = plugins.length;
            var concurrency = os.cpus().length || 1;
            cluster.on("fork", function (worker) {
                if (spin) spin.stop(true);
                var name = workers[worker.id];
                log.info(name + ":start(" + worker.id + "/" + plugin_count + ")");
                if (spin) spin.start();
            });
            if (opts.spinner && opts.format != "json") {
                spin = new spinner.Spinner("PUNISH");
                spin.setSpinnerDelay(60);
                spin.start();
            }
            Bluebird.map(plugins, function (plugin) {
                var worker = cluster.fork();
                workers[worker.id] = plugin.replace("vile-", "");
                return run_plugins_in_fork([plugin], config, worker).then(function (issues) {
                    return normalize_paths(issues), issues;
                });
            }, { concurrency: concurrency }).then(_.flatten).then(function (issues) {
                if (spin) spin.stop(true);
                if (!_.isEmpty(opts.combine)) {
                    issues = combine_paths(opts.combine, issues);
                }
                if (opts.format == "syntastic") {
                    log_helper.syntastic_issues(issues);
                } else if (opts.format != "json") {
                    log_helper.issues(issues);
                }
                resolve(issues);
            }).catch(reject);
        });
    };
};
var passthrough = function passthrough(issues) {
    return issues;
};
var into_snippet = function into_snippet(lines, start, end) {
    return _.reduce(lines, function (snippets, line, num) {
        if (num > start - 4 && num < end + 2) {
            snippets.push({
                line: _.get(line, "number"),
                text: _.get(line, "text", " "),
                ending: "\n"
            });
        }
        return snippets;
    }, []);
};
var add_code_snippets = function add_code_snippets() {
    return function (issues) {
        return Bluebird.map(_.uniq(_.map(issues, "path")), function (filepath) {
            if (!(filepath && fs.existsSync(filepath) && fs.lstatSync(filepath).isFile())) return;
            var lines = linez(fs.readFileSync(path.join(process.cwd(), filepath), "utf-8")).lines;
            _.each(_.filter(issues, function (i) {
                return i.path == filepath;
            }), function (issue) {
                var start = Number(_.get(issue, "where.start.line", 0));
                var end = Number(_.get(issue, "where.end.line", start));
                if (issue.type == util.DUPE) {
                    var locations = _.get(issue, "duplicate.locations", []);
                    _.each(locations, function (loc) {
                        var start = Number(_.get(loc, "where.start.line", 0));
                        var end = Number(_.get(loc, "where.end.line", start));
                        if (start === 0 && end === start) return;
                        if (loc.path == filepath) {
                            loc.snippet = into_snippet(lines, start, end);
                        } else {
                            var alt_lines = linez(fs.readFileSync(path.join(process.cwd(), loc.path), "utf-8")).lines;
                            loc.snippet = into_snippet(alt_lines, start, end);
                        }
                    });
                } else {
                    if (start === 0 && end === start) return;
                    if (_.some(util.displayable_issues, function (t) {
                        return t == issue.type;
                    })) {
                        issue.snippet = into_snippet(lines, start, end);
                    }
                }
            });
        }).then(function () {
            return issues;
        });
    };
};
var cwd_plugins_path = function cwd_plugins_path() {
    return path.resolve(path.join(process.cwd(), "node_modules", "@forthright"));
};
var add_ok_issues = function add_ok_issues() {
    var vile_allow = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var vile_ignore = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var log_distinct_ok_issues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    return function (issues) {
        return util.promise_each(process.cwd(), function (p, is_dir) {
            return (util.allowed(p, vile_allow) || is_dir) && !util.ignored(p, vile_ignore);
        }, function (filepath) {
            return util.issue({
                type: util.OK,
                path: unixify(filepath)
            });
        }, { read_data: false }).then(function (ok_issues) {
            var distinct_ok_issues = _.reject(ok_issues, function (issue) {
                return _.some(issues, function (i) {
                    return i.path == issue.path;
                });
            });
            if (log_distinct_ok_issues) {
                log_helper.issues(distinct_ok_issues);
            }
            return distinct_ok_issues.concat(issues);
        });
    };
};
var run_plugins = function run_plugins() {
    var custom_plugins = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var app_config = _.get(config, "vile", { plugins: [] });
    var ignore = _.get(app_config, "ignore", null);
    var allow = _.get(app_config, "allow", null);
    var plugins = custom_plugins;
    var post_process = !opts.dontpostprocess;
    if (app_config.plugins) {
        plugins = _.uniq(plugins.concat(app_config.plugins));
    }
    return fs.readdirAsync(cwd_plugins_path()).filter(is_plugin).then(execute_plugins(plugins, config, opts)).then(opts.snippets ? add_code_snippets() : passthrough).then(post_process ? add_ok_issues(allow, ignore, opts.scores) : passthrough);
};
module.exports = {
    exec: run_plugins,
    exec_plugin: run_plugin
};