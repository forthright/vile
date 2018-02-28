"use strict";
var path = require("path");
var os = require("os");
var cluster = require("cluster");
var Bluebird = require("bluebird");
var fs = require("fs");
var unixify = require("unixify");
var _ = require("lodash");
var linez = require("linez");
var logger = require("./logger");
var util = require("./util");
var PluginNotFoundError = require("./plugin/plugin_not_found_error");
var chalk = require("chalk");
var fs_readdir = Bluebird.promisify(fs.readdir);
var log = logger.create("plugin");
var FILE_EXT = /\.[^\.]*$/;
var WORKER_MODULE = path.join(__dirname, "plugin", "worker.js");
var BUNDLED_PLUGINS = [
    "vile-comment",
    "vile-coverage",
    "vile-ncu",
    "vile-stat"
];
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
var cannot_find_module = function (err) {
    return /cannot find module/i.test(_.get(err, "stack", err));
};
var require_plugin = function (name) {
    var cwd_node_modules = path.join(process.cwd(), "node_modules");
    var module_name = "vile-" + name;
    var module_name_cwd_node_modules = cwd_node_modules + "/" + module_name;
    var plugin;
    try {
        plugin = require(module_name_cwd_node_modules);
    }
    catch (e) {
        if (cannot_find_module(e)) {
            try {
                plugin = require(module_name);
            }
            catch (e2) {
                if (cannot_find_module(e2)) {
                    throw new PluginNotFoundError(e2);
                }
                else {
                    throw e2;
                }
            }
        }
        else {
            throw e;
        }
    }
    return plugin;
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
var execute_plugins = function (plugins, config, opts) {
    if (plugins === void 0) { plugins = []; }
    if (config === void 0) { config = null; }
    if (opts === void 0) { opts = {}; }
    cluster.setupMaster({ exec: WORKER_MODULE });
    var plugins_finished = 0;
    var plugins_running = {};
    var plugin_count = plugins.length;
    var concurrency = os.cpus().length || 1;
    var update_spinner = function () {
        var percent = _.toNumber(plugins_finished / plugin_count * 100).toFixed(0);
        var names = _.map(_.keys(plugins_running), function (p) { return p.replace(/^vile-/, ""); }).join(" + ");
        if (names)
            names = " [" + names + "]";
        logger.update_spinner(chalk.gray(percent + "%" + names));
    };
    update_spinner();
    return Bluebird.map(plugins, function (plugin) {
        var worker = cluster.fork();
        var plugins_to_run = [plugin];
        _.each(plugins_to_run, function (p) { plugins_running[p] = true; });
        update_spinner();
        return exec_in_fork(plugins_to_run, config, worker)
            .then(function (issues) {
            plugins_finished += plugins_to_run.length;
            _.each(plugins_to_run, function (p) { delete plugins_running[p]; });
            update_spinner();
            normalize_paths(issues);
            return issues;
        });
    }, { concurrency: concurrency })
        .then(_.flatten)
        .then(function (issues) {
        update_spinner();
        if (!_.isEmpty(opts.combine)) {
            issues = combine_paths(opts.combine, issues);
        }
        if (opts.dont_post_process) {
            logger.stop_spinner();
            return issues;
        }
        else {
            var app_ignore_1 = _.get(config, "vile.ignore", []);
            var app_allow_1 = _.get(config, "vile.allow", []);
            var stop_spinner = function (list) {
                logger.stop_spinner();
                return list;
            };
            if (opts.skip_snippets) {
                return add_ok_issues(app_allow_1, app_ignore_1, issues)
                    .then(stop_spinner);
            }
            else {
                return add_code_snippets(issues)
                    .then(function (i) { return add_ok_issues(app_allow_1, app_ignore_1, i); })
                    .then(stop_spinner);
            }
        }
    });
};
var into_snippet = function (lines, start, end) {
    return _.reduce(lines, function (snippets, line, num) {
        var num_as_num = _.toNumber(num);
        if (num_as_num > (start - 4) && num_as_num < (end + 2)) {
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
var filter_plugins_to_run = function (peer_installed, via_config, via_opts, via_force_opts, skip_core_plugins) {
    var allowed_plugins = _
        .isEmpty(via_opts) ? via_config : _.concat([], via_opts);
    var available_plugins = skip_core_plugins ?
        peer_installed :
        _.uniq(_.concat(peer_installed, BUNDLED_PLUGINS));
    available_plugins = _.uniq(available_plugins.concat(via_force_opts));
    check_for_uninstalled_plugins(allowed_plugins, available_plugins);
    return _.isEmpty(allowed_plugins) ?
        available_plugins :
        _.filter(available_plugins, function (p) {
            return _.some(allowed_plugins, function (a) { return p.replace("vile-", "") == a; });
        });
};
var exec = function (config, opts) {
    if (config === void 0) { config = {}; }
    if (opts === void 0) { opts = {}; }
    var app_config = _.get(config, "vile", {});
    var allowed_plugins_via_config = _.get(app_config, "plugins", []);
    var allowed_plugins_via_opts = _.get(opts, "plugins", []);
    var plugins_path = cwd_plugins_path();
    var allowed_plugins_via_force_opts = _
        .get(opts, "force_plugins", []);
    var run = function (peer_installed_plugins) {
        return execute_plugins(filter_plugins_to_run(peer_installed_plugins, allowed_plugins_via_config, allowed_plugins_via_opts, allowed_plugins_via_force_opts, opts.skip_core_plugins), config, opts);
    };
    if (fs.existsSync(plugins_path)) {
        return fs_readdir(plugins_path)
            .filter(is_plugin)
            .then(run);
    }
    else {
        return run([]);
    }
};
var module_exports = {
    exec: exec,
    exec_plugin: exec_plugin
};
module.exports = module_exports;
