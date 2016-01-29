/// <reference path="lib/typings/index.d.ts" />
"use strict";

var vile;
(function (vile) {
    var Bluebird = require("bluebird");
    var fs = require("fs");
    var path = require("path");
    var cluster = require("cluster");
    var os = require("os");
    var _ = require("lodash");
    // TODO: don't hardcode padding lower in module
    var string = require("string-padder");
    var spinner = require("cli-spinner");
    var Spinner = spinner.Spinner;
    var ignore = require("ignore-file");
    var logger = require("./logger");
    var util = require("./util");
    var log = logger.create("plugin");
    Bluebird.promisifyAll(fs);
    var is_plugin = function is_plugin(name) {
        return (/^vile-/.test(name)
        );
    };
    var valid_plugin = function valid_plugin(api) {
        return api && typeof api.punish == "function";
    };
    var is_array = function is_array(list) {
        return list && typeof list.forEach == "function";
    };
    var is_promise = function is_promise(list) {
        return list && typeof list.then == "function";
    };
    var pad_right = function pad_right(num) {
        var txt = arguments.length <= 1 || arguments[1] === undefined ? "" : arguments[1];
        return string.padRight(txt, num, " ");
    };
    var failed_message = function failed_message(txt) {
        return pad_right(16, txt) + "FAIL";
    };
    var passed_message = function passed_message(txt) {
        return pad_right(16, txt) + "PASS";
    };
    var log_error = function log_error(e) {
        console.log();
        log.error(e.stack || e);
    };
    var error_executing_plugins = function error_executing_plugins(err) {
        log.error("Error executing plugins");
        log.error(err.stack || err);
        process.exit(1);
    };
    // TODO: DRY both methods
    // TODO: move logging out of plugins?
    var humanize_line_char = function humanize_line_char(issue) {
        var start = _.get(issue, "where.start", {});
        var end = _.get(issue, "where.end", {});
        var start_character = typeof start.character == "number" || typeof start.character == "string" ? String(start.character) : "";
        var end_character = (typeof end.character == "number" || typeof end.character == "string") && end.character != start.character ? "-" + String(end.character) : "";
        return typeof end.character == "number" ? "" + start_character + end_character : start_character;
    };
    var humanize_line_num = function humanize_line_num(issue) {
        var start = _.get(issue, "where.start", {});
        var end = _.get(issue, "where.end", {});
        var start_line = typeof start.line == "number" || typeof start.line == "string" ? String(start.line) : "";
        var end_line = (typeof end.line == "number" || typeof end.line == "string") && end.line != start.line ? "-" + String(end.line) : "";
        return typeof end.line == "number" ? "" + start_line + end_line : start_line;
    };
    var to_console = function to_console(issue) {
        var h_line = humanize_line_num(issue);
        var h_char = humanize_line_char(issue);
        var details = _.has(issue, "title") && issue.message != issue.title ? issue.title + " => " + issue.message : issue.title;
        var loc = h_line || h_char ? "" + (h_line ? "line " + h_line + ", " : "") + ("" + (h_char ? "col " + h_char + ", " : "")) : "";
        return issue.path + ": " + loc + details;
    };
    var to_console_churn = function to_console_churn(issue) {
        return issue.path + ": " + issue.churn;
    };
    var to_console_comp = function to_console_comp(issue) {
        return issue.path + ": " + issue.complexity;
    };
    var to_console_lang = function to_console_lang(issue) {
        return issue.path + ": " + issue.language;
    };
    var to_console_git = function to_console_git(issue) {
        var date = _.get(issue, "commit.commit_date") || _.get(issue, "commit.author_date");
        var sha = _.get(issue, "commit.sha");
        return sha + ": " + date;
    };
    var is_error_or_warn = function is_error_or_warn(issue) {
        return _.any(util.warnings.concat(util.errors), function (t) {
            return issue.type == t;
        });
    };
    var log_issue_messages = function log_issue_messages() {
        var issues = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        var nlogs = {};
        issues.forEach(function (issue, index) {
            var t = issue.type;
            if (!nlogs[t]) nlogs[t] = logger.create(t);
            if (_.any(util.errors, function (t) {
                return issue.type == t;
            })) {
                nlogs[t].error(to_console(issue));
            } else if (_.any(util.warnings, function (t) {
                return issue.type == t;
            })) {
                if (issue.type == util.COMP) {
                    nlogs[t].info(to_console_comp(issue));
                } else if (issue.type == util.CHURN) {
                    nlogs[t].info(to_console_churn(issue));
                } else {
                    nlogs[t].warn(to_console(issue));
                }
            } else {
                if (issue.type == util.LANG) {
                    nlogs[t].info(to_console_lang(issue));
                } else if (issue.type == util.GIT) {
                    nlogs[t].info(to_console_git(issue));
                } else if (issue.type == util.OK) {
                    nlogs[t].info(issue.path);
                } else {
                    nlogs[t].info(to_console(issue));
                }
            }
        });
    };
    var require_plugin = function require_plugin(name) {
        var cwd_node_modules = process.cwd() + "/node_modules";
        try {
            return require(cwd_node_modules + "/@brentlintner/vile-" + name);
        } catch (e) {
            log.error(failed_message(name));
            log_error(e);
        }
    };
    var failed = function failed(name, list) {
        return _.any(list, function (item) {
            return item.plugin = name && is_error_or_warn(item);
        });
    };
    var log_issues = function log_issues(plugins) {
        var issues = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

        log_issue_messages(issues);
        _.each(plugins, function (plugin) {
            var name = plugin.replace("vile-", "");
            var message = failed(name, issues) ? failed_message(name) : passed_message(name);
            log.info(message);
        });
    };
    var map_plugin_name_to_issues = function map_plugin_name_to_issues(name) {
        return function (issues) {
            return _.map(issues, function (issue) {
                return issue.plugin = name, issue;
            });
        };
    };
    var run_plugin = function run_plugin(name) {
        var config = arguments.length <= 1 || arguments[1] === undefined ? {
            config: {},
            ignore: []
        } : arguments[1];
        return new Bluebird(function (resolve, reject) {
            var api = require_plugin(name);
            if (!valid_plugin(api)) {
                return Bluebird.reject("invalid plugin API: " + name);
            }
            var issues = api.punish(config);
            if (is_promise(issues)) {
                issues.then(map_plugin_name_to_issues(name)).then(resolve)["catch"](reject); // TODO: keep running other plugins?
            } else if (is_array(issues)) {
                    resolve(map_plugin_name_to_issues(name)(issues));
                } else {
                    log.warn(name + " plugin did not return [] or Promise<[]>");
                    resolve([]); // TODO: ?
                }
        });
    };
    var run_plugins_in_fork = function run_plugins_in_fork(plugins, config, worker) {
        return new Bluebird(function (resolve, reject) {
            worker.on("message", function (issues) {
                if (issues) {
                    worker.disconnect();
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
                if (signal) {
                    var msg = name + " worker was killed by signal: " + signal;
                    log.warn(msg);
                    reject(msg);
                } else if (code !== 0) {
                    var msg = name + " worker exited with error code: " + code;
                    log.error(msg);
                    reject(msg);
                }
            });
        });
    };
    var normalize_paths = function normalize_paths(issues) {
        return _.each(issues, function (issue) {
            if (_.has(issue, "path")) {
                issue.path = issue.path.replace(process.cwd(), "").replace(/^\/?/, "");
            }
        });
    };
    var get_plugin_config = function get_plugin_config(name, config) {
        var plugin_config = config[name] || {};
        var vile_ignore = _.get(config, "vile.ignore", []);
        if (!plugin_config.ignore) {
            plugin_config.ignore = vile_ignore;
        } else if (is_array(plugin_config.ignore)) {
            plugin_config.ignore = _.uniq(plugin_config.ignore.concat(vile_ignore));
        }
        return plugin_config;
    };
    var ping_parent = function ping_parent(process) {
        return process.send("");
    };
    var handle_worker_request = function handle_worker_request(data) {
        var plugins = data.plugins;
        var config = data.config;
        Bluebird.map(plugins, function (plugin) {
            var name = plugin.replace("vile-", "");
            var plugin_config = get_plugin_config(name, config);
            return run_plugin(name, plugin_config)["catch"](function (err) {
                console.log(); // newline because spinner is running
                log.error(err.stack || err);
                process.exit(1);
            });
        }).then(_.flatten).then(function (issues) {
            return process.send(issues);
        });
    };
    var check_for_uninstalled_plugins = function check_for_uninstalled_plugins(allowed, plugins) {
        var errors = false;
        _.each(allowed, function (name) {
            if (!_.any(plugins, function (plugin) {
                return plugin.replace("vile-", "") == name;
            })) {
                errors = true;
                log.error(name + " is not installed");
            }
        });
        if (errors) process.exit(1);
    };
    var execute_plugins = function execute_plugins() {
        var allowed = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
        var config = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
        var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
        return function (plugins) {
            return new Bluebird(function (resolve, reject) {
                check_for_uninstalled_plugins(allowed, plugins);
                if (cluster.isMaster) {
                    (function () {
                        // TODO: own method
                        if (allowed.length > 0) {
                            plugins = _.select(plugins, function (p) {
                                return _.any(allowed, function (a) {
                                    return p.replace("vile-", "") == a;
                                });
                            });
                        }
                        var spin = undefined;
                        var plugin_count = plugins.length;
                        var concurrency = os.cpus().length || 1;
                        cluster.on("fork", function (worker) {
                            if (spin) spin.stop(true);
                            log.info("multitasking (" + worker.id + "/" + plugin_count + ")");
                            if (spin) spin.start();
                        });
                        if (opts.spinner && opts.format != "json") {
                            spin = new Spinner("PUNISH");
                            spin.setSpinnerDelay(60);
                            spin.start();
                        }
                        Bluebird.map(plugins, function (plugin) {
                            return run_plugins_in_fork([plugin], config, cluster.fork()).then(function (issues) {
                                return normalize_paths(issues), issues;
                            })["catch"](function (err) {
                                if (spin) spin.stop();
                                log.error(err.stack || err);
                                reject(err);
                            });
                        }, { concurrency: concurrency }).then(_.flatten).then(function (issues) {
                            if (spin) spin.stop();
                            if (opts.format != "json") log_issues(plugins, issues);
                            resolve(issues);
                        });
                    })();
                } else {
                    process.on("message", handle_worker_request);
                    ping_parent(process);
                }
            });
        };
    };
    var add_ok_issues = function add_ok_issues(vile_ignore) {
        return function (issues) {
            return util.promise_each(process.cwd(),
            // TODO: don't compile ignore every time
            function (p) {
                return !util.ignored(p, vile_ignore);
            }, function (filepath) {
                return util.issue({
                    type: util.OK,
                    path: filepath
                });
            }, { read_data: false }).then(function (ok_issues) {
                var distinct_ok_issues = _.reject(ok_issues, function (issue) {
                    return _.any(issues, function (i) {
                        return i.path == issue.path;
                    });
                });
                log_issue_messages(distinct_ok_issues);
                return distinct_ok_issues.concat(issues);
            });
        };
    };
    var cwd_plugins_path = function cwd_plugins_path() {
        return path.resolve(path.join(process.cwd(), "node_modules", "@brentlintner"));
    };
    var run_plugins = function run_plugins() {
        var custom_plugins = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
        var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var app_config = _.get(config, "vile", {});
        var plugins = custom_plugins;
        // TODO: merge custom_list with config.plugins
        if (custom_plugins.length == 0 && app_config.plugins) {
            plugins = app_config.plugins;
        }
        return fs.readdirAsync(cwd_plugins_path()).filter(is_plugin).then(execute_plugins(plugins, config, opts)).then(add_ok_issues(app_config.ignore))["catch"](error_executing_plugins);
    };
    module.exports = {
        exec: run_plugins,
        exec_plugin: run_plugin
    };
})(vile || (vile = {}));