"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/// <reference path="lib/typings/index.d.ts" />
var Bluebird = require("bluebird");
var fs = require("fs");
var path = require("path");
var os = require("os");
var cluster = require("cluster");
var linez = require("linez");
var _ = require("lodash");
var spinner = require("cli-spinner");
var Spinner = spinner.Spinner;
var logger = require("./logger");
var util = require("./util");
var log = logger.create("plugin");
Bluebird.promisifyAll(fs);
var FILE_EXT = /\.[^\.]*$/;
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
    var format = arguments.length <= 1 || arguments[1] === undefined ? "default" : arguments[1];

    if (format == "syntastic") {
        var _ret = function () {
            var t = issue.type;
            var start_info = void 0;
            var synastic_type = _.some(util.errors, function (i) {
                return i.type == t;
            }) ? "E" : "W";
            if (t == util.DUPE) {
                var locs = _.get(issue, "duplicate.locations", []);
                start_info = _.get(_.first(locs), "where.start", {});
            } else {
                start_info = _.get(issue, "where.start", {});
            }
            var h_line = _.get(start_info, "line", 1);
            var h_char = _.get(start_info, "character", 1);
            var details = _.has(issue, "title") && issue.message != issue.title ? issue.title + " => " + issue.message : issue.message || issue.title;
            return {
                v: issue.path + ":" + h_line + ":" + h_char + ": " + (synastic_type + ": " + details)
            };
        }();

        if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
    } else {
        var _h_line = humanize_line_num(issue);
        var _h_char = humanize_line_char(issue);
        var _details = _.has(issue, "title") && issue.message != issue.title ? issue.title + " => " + issue.message : issue.message || issue.title;
        var loc = _h_line || _h_char ? "" + (_h_line ? "line " + _h_line + ", " : "") + ("" + (_h_char ? "col " + _h_char + ", " : "")) : "";
        return issue.path + ": " + loc + _details;
    }
};
var to_console_duplicate = function to_console_duplicate(issue) {
    var files = _.chain(issue).get("duplicate.locations", []).map("path").uniq().join(", ");
    return issue.path + ": Duplicate code in " + files;
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
var to_console_stat = function to_console_stat(issue) {
    var size = _.get(issue, "stat.size", "?");
    var loc = _.get(issue, "stat.loc", "?");
    var lines = _.get(issue, "stat.loc", "?");
    var comments = _.get(issue, "stat.comment", "?");
    return issue.path + " (" + (size ? (size / 1024).toFixed(3) + "KB" : "") + ")" + (" - " + lines + " lines, " + loc + " loc, " + comments + " comments");
};
var log_syntastic_applicable_messages = function log_syntastic_applicable_messages() {
    var issues = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

    issues.forEach(function (issue, index) {
        var issue_type = issue.type;
        if (_.some(util.displayable_issues, function (t) {
            return issue_type == t;
        })) {
            console.log(to_console(issue, "syntastic"));
        }
    });
};
var log_issue_messages = function log_issue_messages() {
    var issues = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

    var nlogs = {};
    issues.forEach(function (issue, index) {
        var t = issue.type;
        if (!nlogs[t]) nlogs[t] = logger.create(t);
        if (_.some(util.errors, function (t) {
            return issue.type == t;
        })) {
            nlogs[t].error(to_console(issue));
        } else if (_.some(util.warnings, function (t) {
            return issue.type == t;
        })) {
            if (issue.type == util.COMP) {
                nlogs[t].info(to_console_comp(issue));
            } else if (issue.type == util.CHURN) {
                nlogs[t].info(to_console_churn(issue));
            } else if (issue.type == util.DUPE) {
                nlogs[t].warn(to_console_duplicate(issue));
            } else {
                nlogs[t].warn(to_console(issue));
            }
        } else {
            if (issue.type == util.LANG) {
                nlogs[t].info(to_console_lang(issue));
            } else if (issue.type == util.GIT) {
                nlogs[t].info(to_console_git(issue));
            } else if (issue.type == util.STAT) {
                nlogs[t].info(to_console_stat(issue));
            } else if (issue.type == util.OK) {
                nlogs[t].info(issue.path);
            } else {
                nlogs[t].info(to_console(issue));
            }
        }
    });
};
var require_plugin = function require_plugin(name) {
    var cwd_node_modules = path.join(process.cwd(), "node_modules");
    try {
        return require(cwd_node_modules + "/@forthright/vile-" + name);
    } catch (e) {
        log_error(e);
    }
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
            issues.then(map_plugin_name_to_issues(name)).then(resolve).catch(reject); // TODO: keep running other plugins?
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
                var _msg = name + " worker exited with error code: " + code;
                log.error(_msg);
                reject(_msg);
            }
        });
    });
};
// TODO: test this to be Windows friendly!
var normalize_paths = function normalize_paths(issues) {
    return _.each(issues, function (issue) {
        if (_.has(issue, "path")) {
            issue.path = issue.path.replace(process.cwd(), "");
            // HACK: see above todo
            if (!/windows/i.test(os.type())) {
                issue.path = issue.path.replace(/^\.\/?/, "").replace(/^\/?/, "");
            }
        }
    });
};
var set_ignore_list = function set_ignore_list(plugin_config, base) {
    var list = _.get(plugin_config, "ignore", []);
    if (_.isString(list)) list = [list];
    if (_.isEmpty(list)) {
        _.set(plugin_config, "ignore", base);
    } else if (is_array(list)) {
        _.set(plugin_config, "ignore", _.uniq(list.concat(base)));
    }
};
var set_allow_list = function set_allow_list(plugin_config, base) {
    if (!_.isEmpty(base)) {
        if (_.isString(base)) base = [base];
        _.set(plugin_config, "allow", base);
    } else {
        var list = _.get(plugin_config, "allow", []);
        if (_.isString(list)) list = [list];
        _.set(plugin_config, "allow", list);
    }
};
var get_plugin_config = function get_plugin_config(name, config) {
    var plugin_config = _.get(config, name, {});
    var vile_ignore = _.get(config, "vile.ignore", []);
    var vile_allow = _.get(config, "vile.allow", []);
    set_ignore_list(plugin_config, vile_ignore);
    set_allow_list(plugin_config, vile_allow);
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
        return run_plugin(name, plugin_config).catch(function (err) {
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
    // TODO: don't be lazy with perf here- still preserve layered path changing
    _.each(combine_paths, function (paths) {
        var _paths = _slicedToArray(paths, 2);

        var base = _paths[0];
        var merge = _paths[1];

        var base_path_ext = _.first(base.match(FILE_EXT));
        var merge_path_ext = _.first(merge.match(FILE_EXT));
        var base_path = base.replace(FILE_EXT, "");
        var merge_path = merge.replace(FILE_EXT, "");
        var merge_path_regexp = new RegExp("^" + merge_path + "/", "i");
        // TODO: Windows support, better matching
        issues.forEach(function (issue, idx) {
            var issue_path = _.get(issue, "path", "");
            var issue_type = _.get(issue, "type");
            // if folder base is not same, return
            if (!merge_path_regexp.test(issue_path)) return;
            // if lib.js is given, make sure .js is issue path ext
            if (merge_path_ext && !_.first(issue_path.match(FILE_EXT)) == merge_path_ext) return;
            var new_path = issue_path.replace(merge_path_regexp, base_path + "/");
            if (base_path_ext) {
                new_path = new_path.replace(FILE_EXT, base_path_ext);
            }
            // HACK: ugh, such perf issue below
            var potential_data_dupe = !_.some(util.displayable_issues, function (t) {
                return t == issue_type;
            });
            var same_data_exists = potential_data_dupe && _.some(issues, function (i) {
                return i && i.path == new_path && i.type == issue_type;
            });
            // HACK: If a lang,stat,comp issue and on base already, drop it
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
                        log.info("multitasking " + workers[worker.id] + " " + ("(" + worker.id + "/" + plugin_count + ")"));
                        if (spin) spin.start();
                    });
                    if (opts.spinner && opts.format != "json") {
                        spin = new Spinner("PUNISH");
                        spin.setSpinnerDelay(60);
                        spin.start();
                    }
                    Bluebird.map(plugins, function (plugin) {
                        var worker = cluster.fork();
                        workers[worker.id] = plugin.replace("vile-", "");
                        return run_plugins_in_fork([plugin], config, worker).then(function (issues) {
                            return normalize_paths(issues), issues;
                        }).catch(function (err) {
                            if (spin) spin.stop(true);
                            log.error(err.stack || err);
                            reject(err);
                        });
                    }, { concurrency: concurrency }).then(_.flatten).then(function (issues) {
                        if (spin) spin.stop(true);
                        if (!_.isEmpty(opts.combine)) {
                            issues = combine_paths(opts.combine, issues);
                        }
                        if (opts.format == "syntastic") {
                            log_syntastic_applicable_messages(issues);
                        } else if (opts.format != "json") {
                            log_issue_messages(issues);
                        }
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
var passthrough = function passthrough(value) {
    return value;
};
// TODO: use Linez typings
var into_snippet = function into_snippet(lines, start, end) {
    return _.reduce(lines, function (snippets, line, num) {
        if (num > start - 4 && num < end + 2) {
            snippets.push({
                offset: _.get(line, "offset"),
                line: _.get(line, "number"),
                text: _.get(line, "text", " "),
                ending: _.get(line, "ending")
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
                            // HACK: dupe reading here to get this to work with right files
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
    var vile_allow = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var vile_ignore = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
    var log_distinct_ok_issues = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];
    return function (issues) {
        return util.promise_each(process.cwd(),
        // TODO: don't compile ignore/allow every time
        // NOTE: need to fallthrough if is_dir, in case --gitdiff is set
        function (p, is_dir) {
            return (util.allowed(p, vile_allow) || is_dir) && !util.ignored(p, vile_ignore);
        }, function (filepath) {
            return util.issue({
                type: util.OK,
                path: filepath
            });
        }, { read_data: false }).then(function (ok_issues) {
            var distinct_ok_issues = _.reject(ok_issues, function (issue) {
                return _.some(issues, function (i) {
                    return i.path == issue.path;
                });
            });
            if (log_distinct_ok_issues) {
                log_issue_messages(distinct_ok_issues);
            }
            return distinct_ok_issues.concat(issues);
        });
    };
};
var run_plugins = function run_plugins() {
    var custom_plugins = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var app_config = _.get(config, "vile", {});
    var ignore = _.get(app_config, "ignore");
    var allow = _.get(app_config, "allow");
    var plugins = custom_plugins;
    var lookup_ok_issues = !opts.dontpostprocess;
    if (app_config.plugins) {
        plugins = _.uniq(plugins.concat(app_config.plugins));
    }
    return fs.readdirAsync(cwd_plugins_path()).filter(is_plugin).then(execute_plugins(plugins, config, opts)).then(opts.snippets ? add_code_snippets() : passthrough).then(lookup_ok_issues ? add_ok_issues(allow, ignore, opts.scores) : passthrough).catch(error_executing_plugins);
};
module.exports = {
    exec: run_plugins,
    exec_plugin: run_plugin
};