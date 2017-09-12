"use strict";
var _ = require("lodash");
var Bluebird = require("bluebird");
var config = require("./../config");
var git = require("./../git");
var logger = require("./../logger");
var plugin = require("./../plugin");
var util = require("./../util");
var upload = require("./analyze/upload");
var log_helper = require("./analyze/log_helper");
var plugin_map = require("./init/map");
var DEFAULT_IGNORE_DIRS = plugin_map.ignore;
var log = logger.create("cli");
var log_and_exit = function (error) {
    log.error("\n", _.get(error, "stack", error));
    process.exit(1);
};
var add_default_ignores = function (vile_yml) {
    var base_ignore = _.get(vile_yml, "vile.ignore", []);
    var new_ignore = _.uniq(_.concat(base_ignore, DEFAULT_IGNORE_DIRS));
    _.set(vile_yml, "vile.ignore", new_ignore);
};
var has_non_info_issues = function (issues) {
    return _.filter(issues, function (issue) {
        return _.some(util.displayable_issues, function (t) { return t == issue.type; });
    }).length > 0;
};
var analyze = function (opts, paths) {
    var custom_plugins = typeof opts.plugins == "string" ?
        _.compact(_.split(opts.plugins, ",")) : [];
    var vile_yml = config.get();
    add_default_ignores(vile_yml);
    var exec_opts = {
        combine: opts.combine,
        dont_post_process: opts.dontPostProcess,
        format: opts.format,
        plugins: custom_plugins,
        skip_core_plugins: opts.withoutCorePlugins,
        skip_snippets: opts.skipSnippets,
        spinner: !(opts.quiet || !opts.decorations)
    };
    if (!_.isEmpty(paths)) {
        _.set(vile_yml, "vile.allow", paths);
    }
    var cli_start_time = new Date().getTime();
    var exec = function () { return plugin
        .exec(vile_yml, exec_opts)
        .then(function (issues) {
        var cli_end_time = new Date().getTime();
        var cli_time = cli_end_time - cli_start_time;
        if (opts.format == "syntastic") {
            log_helper.syntastic_issues(issues);
        }
        else if (opts.format == "json") {
            process.stdout.write(JSON.stringify(issues));
        }
        else {
            log_helper.issues(issues, opts.terminalSnippets, !opts.decorations);
        }
        if (opts.upload) {
            return upload.commit(issues, cli_time, opts);
        }
        else {
            if (opts.exitOnIssues && has_non_info_issues(issues)) {
                process.exit(1);
            }
            return Bluebird.resolve();
        }
    })
        .catch(log_and_exit); };
    if (opts.gitDiff) {
        var rev = typeof opts.gitDiff == "string" ?
            opts.gitDiff : undefined;
        log.info("git diff:");
        git.changed_files(rev).then(function (changed_paths) {
            _.each(changed_paths, function (p) { log.info("", p); });
            _.set(vile_yml, "vile.allow", changed_paths);
            exec();
        });
    }
    else {
        exec();
    }
};
var configure = function (opts) {
    var issue_levels = _.compact(_.split(opts.issueLog, ","));
    logger.enable(opts.decorations, issue_levels);
    config.load(opts.config);
    if (opts.log)
        logger.level(opts.log);
    var disable_logger = opts.quiet ||
        opts.format == "json" ||
        opts.format == "syntastic";
    if (disable_logger)
        logger.disable();
    if (!disable_logger && opts.decorations) {
        logger.start_spinner();
    }
};
var action = function (paths, opts) {
    configure(opts);
    analyze(opts, paths);
};
var create = function (cli) {
    return cli
        .command("analyze [paths...]")
        .alias("a")
        .option("-p, --plugins [plugin_list]", "unless specified in config, this can be a comma delimited " +
        "string, else run all installed plugins")
        .option("-c, --config [path]", "specify a custom config file")
        .option("-f, --format [type]", "specify output format (console=default,json,syntastic)")
        .option("-u, --upload [project_name]", "publish to vile.io (disables --gitdiff)- " +
        "alternatively, you can set a VILE_PROJECT env var")
        .option("-x, --combine [combine_def]", "combine file data from two directories into one path- " +
        "example: [src:lib,...] or [src.ts:lib.js,...]")
        .option("-t, --terminal-snippets [path]", "show generated code snippets in the terminal")
        .option("-s, --skip-snippets", "don't generate code snippets")
        .option("-g, --git-diff [rev]", "only check files patched in latest HEAD commit, or rev")
        .option("-d, --dont-post-process", "don't post process data in any way (ex: adding ok issues)- " +
        "useful for per file checking")
        .option("-w, --without-core-plugins", "don't use plugins bundled with core lib")
        .option("-l, --log [level]", "specify the log level (info=default|warn|error)")
        .option("-i, --issue-log [level]", "specify issue types to log (ex: '-i security,dependency')")
        .option("-e, --exit-on-issues", "exit with bad code " +
        "if non-info issues exist")
        .option("-q, --quiet", "log nothing")
        .option("-n, --no-decorations", "disable color and progress bar")
        .action(action);
};
module.exports = { create: create };
