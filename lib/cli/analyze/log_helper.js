"use strict";
var _ = require("lodash");
var chalk = require("chalk");
var logger = require("./../../logger");
var util = require("./../../util");
var log = logger.create("cli");
var emphasize = require("emphasize");
var humanize_line_char = function (issue) {
    var start = _.get(issue, "where.start", {});
    var end = _.get(issue, "where.end", {});
    var start_character = (typeof start.character == "number" || typeof start.character == "string") ? String(start.character) : "";
    var end_character = (typeof end.character == "number" || typeof end.character == "string") && end.character != start.character ? "-" + String(end.character) : "";
    return typeof end.character == "number" ?
        "" + start_character + end_character : start_character;
};
var humanize_line_num = function (issue) {
    var start = _.get(issue, "where.start", {});
    var end = _.get(issue, "where.end", {});
    var start_line = (typeof start.line == "number" || typeof start.line == "string") ? String(start.line) : "";
    var end_line = (typeof end.line == "number" || typeof end.line == "string") && end.line != start.line ? "-" + String(end.line) : "";
    return typeof end.line == "number" ?
        "" + start_line + end_line : start_line;
};
var to_console = function (issue, format) {
    if (format === void 0) { format = "default"; }
    if (format == "syntastic") {
        var issue_type_1 = issue.type;
        var start_info = void 0;
        var synastic_type = _
            .some(util.errors, function (name) { return name == issue_type_1; }) ? "E" : "W";
        if (issue_type_1 == util.DUPE) {
            var locs = _.get(issue, "duplicate.locations", []);
            start_info = _.get(_.first(locs), "where.start", {});
        }
        else {
            start_info = _.get(issue, "where.start", {});
        }
        var h_line = _.get(start_info, "line", 1);
        var h_char = _.get(start_info, "character", 1);
        var details = _.has(issue, "title") &&
            issue.message != issue.title ?
            issue.title + " => " + issue.message :
            (issue.message || issue.title);
        return issue.path + ":" + h_line + ":" + h_char + ": " +
            (synastic_type + ": " + details);
    }
    else {
        var h_line = humanize_line_num(issue);
        var h_char = humanize_line_char(issue);
        var details = _.has(issue, "title") &&
            issue.message != issue.title ?
            issue.title + " => " + issue.message :
            (issue.message || issue.title);
        var loc = h_line || h_char ?
            "" + (h_line ? "line " + h_line + ", " : "") +
                ("" + (h_char ? "col " + h_char + ", " : "")) : "";
        var msg = issue.path + ": " + loc + details;
        return msg;
    }
};
var to_console_duplicate = function (issue) {
    var files = _.chain(_.get(issue, "duplicate.locations", [])).map("path").uniq().join(", ");
    return issue.path + ": Similar code in " + files;
};
var to_console_churn = function (issue) { return issue.path + ": " + issue.churn; };
var to_console_comp = function (issue) { return issue.path + ": " + issue.complexity; };
var to_console_scm = function (issue) {
    var date = _.get(issue, "commit.commit_date") ||
        _.get(issue, "commit.author_date");
    var sha = _.get(issue, "commit.sha");
    return sha + ": " + date;
};
var to_console_stat = function (issue) {
    var size = _.get(issue, "stat.size", "?");
    var loc = _.get(issue, "stat.loc", "?");
    var lines = _.get(issue, "stat.lines", "?");
    var comments = _.get(issue, "stat.comments", "?");
    var lang = _.get(issue, "stat.language", "?");
    return issue.path + " " +
        ("(" + (size ? (Number(size) / 1024).toFixed(3) + "KB" : "") + ")") +
        (": " + lines + " lines, " + loc + " loc, " + comments) +
        (" comments (language: " + lang + ")");
};
var to_console_dep = function (issue) {
    var name = _.get(issue, "dependency.name", "?");
    var current = _.get(issue, "dependency.current", "?");
    var latest = _.get(issue, "dependency.latest", "?");
    return "New release for " + name + ": " + current + " < " + latest;
};
var to_console_cov = function (issue) {
    var cov = _.get(issue, "coverage.total", "?");
    return issue.path + ": " + cov + "% lines covered";
};
var log_syntastic_applicable_messages = function (issues) {
    if (issues === void 0) { issues = []; }
    issues.forEach(function (issue, index) {
        var issue_type = issue.type;
        if (_.some(util.displayable_issues, function (t) { return issue_type == t; })) {
            console.log(to_console(issue, "syntastic"));
        }
    });
};
var lines_for = function (snippets) {
    var line_pad = _.toString(_.get(_.last(snippets), "line", "3")).length;
    return _.map(snippets, function (snippet) {
        return _.padStart(snippet.line.toString(), line_pad) + ": ";
    });
};
var code_for = function (snippets) {
    return _.map(snippets, function (snippet) { return snippet.text; }).join("\n");
};
var log_snippet = function (lines, code, filepath, file_ext, nocolors) {
    if (nocolors) {
        console.log(_.zip(lines, code.split("\n"))
            .map(function (s) { return s.join(" "); }).join("\n"));
    }
    else {
        var colored = void 0;
        try {
            colored = _.get(emphasize
                .highlight(file_ext, code), "value", "");
        }
        catch (e) {
            log.warn("highlighting failed for " + filepath + ":");
            colored = code;
        }
        var colored_lines = lines.map(function (l) { return chalk.gray(l); });
        console.log(_.zip(colored_lines, colored.split("\n"))
            .map(function (s) { return s.join(""); }).join("\n"));
    }
};
var to_console_snippet = function (issue, nocolors) {
    if (_.isEmpty(issue.snippet) && _.isEmpty(issue.duplicate))
        return;
    var filepath = _.get(issue, "path", "");
    var file_ext = _.first(filepath.match(/[^\.]*$/));
    if (issue.type == util.DUPE) {
        _.each(_.get(issue, "duplicate.locations", []), function (loc) {
            var code = code_for(loc.snippet);
            var lines = lines_for(loc.snippet);
            var loc_filepath = _.get(loc, "path", "");
            var loc_file_ext = _.first(loc_filepath.match(/[^\.]*$/));
            console.log();
            log_snippet(lines, code, loc_filepath, loc_file_ext, nocolors);
        });
        console.log();
    }
    else {
        var code = code_for(issue.snippet);
        var lines = lines_for(issue.snippet);
        console.log();
        log_snippet(lines, code, filepath, file_ext, nocolors);
        console.log();
    }
};
var log_issue_messages = function (issues, showsnippets, nocolors) {
    if (issues === void 0) { issues = []; }
    if (showsnippets === void 0) { showsnippets = false; }
    if (nocolors === void 0) { nocolors = false; }
    var nlogs = {};
    issues.forEach(function (issue, index) {
        var logger_type = issue.type;
        if (!nlogs[logger_type]) {
            nlogs[logger_type] = logger.create(logger_type);
        }
        var nlog = nlogs[logger_type];
        var plugin_name = _.get(issue, "plugin", "");
        var msg_postfix = plugin_name ? " (vile-" + plugin_name + ")" : "";
        if (_.some(util.errors, function (i_type) { return issue.type == i_type; })) {
            nlog.error_issue(to_console(issue) + msg_postfix);
        }
        else if (_.some(util.warnings, function (i_type) { return issue.type == i_type; })) {
            if (issue.type == util.COMP) {
                nlog.info_issue(to_console_comp(issue) + msg_postfix);
            }
            else if (issue.type == util.CHURN) {
                nlog.info_issue(to_console_churn(issue) + msg_postfix);
            }
            else if (issue.type == util.DEP) {
                nlog.warn_issue(to_console_dep(issue) + msg_postfix);
            }
            else if (issue.type == util.DUPE) {
                nlog.warn_issue(to_console_duplicate(issue) + msg_postfix);
            }
            else {
                nlog.warn_issue(to_console(issue) + msg_postfix);
            }
        }
        else {
            if (issue.type == util.SCM) {
                nlog.info_issue(to_console_scm(issue) + msg_postfix);
            }
            else if (issue.type == util.STAT) {
                nlog.info_issue(to_console_stat(issue) + msg_postfix);
            }
            else if (issue.type == util.COV) {
                nlog.info_issue(to_console_cov(issue) + msg_postfix);
            }
            else if (issue.type == util.OK) {
                nlog.info_issue(issue.path + msg_postfix);
            }
            else {
                nlog.info_issue(to_console(issue) + msg_postfix);
            }
        }
        if (showsnippets) {
            to_console_snippet(issue, nocolors);
        }
    });
};
module.exports = {
    issues: log_issue_messages,
    syntastic_issues: log_syntastic_applicable_messages,
};
