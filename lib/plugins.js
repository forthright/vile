/// <reference path="lib/typings/index.d.ts" />
"use strict";

var vile;
(function (vile) {
    var Bluebird = require("bluebird");
    var fs = require("fs");
    var path = require("path");
    var cluster = require("cluster");
    var _ = require("lodash");
    // TODO: don't hardcode padding lower in module
    var string = require("string-padder");
    var spinner = require("cli-spinner");
    var Spinner = spinner.Spinner;
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
    var log_plugin_messages = function log_plugin_messages(name) {
        var issues = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
        var format = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

        if (format == "json") return;
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
                    nlogs[t].warn(to_console_comp(issue));
                } else if (issue.type == util.CHURN) {
                    nlogs[t].warn(to_console_churn(issue));
                } else {
                    nlogs[t].warn(to_console(issue));
                }
            } else {
                if (issue.type == util.LANG) {
                    nlogs[t].info(to_console_lang(issue));
                } else if (issue.type == util.GIT) {
                    nlogs[t].info(to_console_git(issue));
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
    var failed = function failed(list) {
        return _.select(list, function (item) {
            return is_error_or_warn(item);
        }).length > 0;
    };
    var log_plugin = function log_plugin(name) {
        var list = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
        var format = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

        var message = failed(list) ? failed_message(name) : passed_message(name);
        log.info(message);
        log_plugin_messages(name, list, format);
    };
    var plugin_is_allowed = function plugin_is_allowed(name, allowed) {
        return !allowed || allowed.length == 0 || _.some(allowed, function (n) {
            return n == name;
        });
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
            var messages = api.punish(config);
            if (is_promise(messages)) {
                messages.then(resolve)["catch"](reject); // TODO: keep running other plugins?
            } else if (is_array(messages)) {
                    resolve(messages);
                } else {
                    log.warn(name + " plugin did not return [] or Promise<[]>");
                    resolve([]); // TODO: ?
                }
        });
    };
    var run_plugin_in_fork = function run_plugin_in_fork(name, config) {
        return new Bluebird(function (resolve, reject) {
            var worker = cluster.fork();
            worker.on("message", function (issues) {
                if (issues) {
                    worker.disconnect();
                    resolve(issues);
                } else {
                    worker.send({
                        name: name,
                        config: config
                    });
                }
            });
            worker.on("exit", function (code, signal) {
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
    // TODO: make into smaller methods
    // TODO: support possible concurrent forks
    var into_executed_plugins = function into_executed_plugins(allowed) {
        var config = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
        var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
        return function (pkg_name) {
            var name = pkg_name.replace("vile-", "");
            return new Bluebird(function (resolve, reject) {
                if (!plugin_is_allowed(name, allowed)) return resolve([]);
                var vile_ignore = _.get(config, "vile.ignore", []);
                var plugin_config = config[name] || {};
                if (!plugin_config.ignore) {
                    plugin_config.ignore = vile_ignore;
                } else if (is_array(plugin_config.ignore)) {
                    plugin_config.ignore = _.uniq(plugin_config.ignore.concat(vile_ignore));
                }
                if (cluster.isMaster) {
                    (function () {
                        var spin = undefined;
                        if (opts.spinner && opts.format != "json") {
                            // TODO: allow plugins to log things after spinner is stopped
                            // TODO: don't do spinner in here? somewhere better to put spinner?
                            spin = new Spinner(pad_right(26, name) + "PUNISH");
                            spin.setSpinnerDelay(60);
                            spin.start();
                        }
                        run_plugin_in_fork(name, plugin_config).then(function (issues) {
                            if (spin) spin.stop(true);
                            issues.forEach(function (issue) {
                                if (_.has(issue, "path")) {
                                    issue.path = issue.path.replace(process.cwd(), "").replace(/^\/?/, "");
                                } else {
                                    issue.path = "?";
                                }
                            });
                            log_plugin(name, issues, opts.format); // TODO: don't log here
                            resolve(issues);
                        })["catch"](function (err) {
                            console.log(); // newline because spinner is running
                            log.error(err.stack || err);
                            // Note: sub process already logs error
                            reject(new Error(name + " plugin died horribly.."));
                            process.exit(1);
                        });
                    })();
                } else {
                    process.on("message", function (data) {
                        var name = data.name;
                        var plugin_config = data.config;
                        run_plugin(name, plugin_config).then(function (issues) {
                            return process.send(issues);
                        })["catch"](function (err) {
                            console.log(); // newline because spinner is running
                            log.error(err.stack || err);
                            process.exit(1);
                        });
                    });
                    process.send("");
                }
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
        // TODO: merge custom_list with config.plugins?
        if (custom_plugins.length == 0 && app_config.plugins) {
            plugins = app_config.plugins;
        }
        return fs.readdirAsync(cwd_plugins_path()).filter(is_plugin).map(into_executed_plugins(plugins, config, opts), { concurrency: 1 }).then(_.flatten)["catch"](error_executing_plugins);
    };
    module.exports = {
        exec: run_plugins,
        exec_plugin: run_plugin
    };
})(vile || (vile = {}));