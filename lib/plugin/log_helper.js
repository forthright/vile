"use strict";

var _ = require("lodash");
var logger = require("./../logger");
var util = require("./../util");
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
    var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "default";

    if (format == "syntastic") {
        var issue_type = issue.type;
        var start_info = void 0;
        var synastic_type = _.some(util.errors, function (name) {
            return name == issue_type;
        }) ? "E" : "W";
        if (issue_type == util.DUPE) {
            var locs = _.get(issue, "duplicate.locations", []);
            start_info = _.get(_.first(locs), "where.start", {});
        } else {
            start_info = _.get(issue, "where.start", {});
        }
        var h_line = _.get(start_info, "line", 1);
        var h_char = _.get(start_info, "character", 1);
        var details = _.has(issue, "title") && issue.message != issue.title ? issue.title + " => " + issue.message : issue.message || issue.title;
        return issue.path + ":" + h_line + ":" + h_char + ": " + (synastic_type + ": " + details);
    } else {
        var _h_line = humanize_line_num(issue);
        var _h_char = humanize_line_char(issue);
        var _details = _.has(issue, "title") && issue.message != issue.title ? issue.title + " => " + issue.message : issue.message || issue.title;
        var loc = _h_line || _h_char ? "" + (_h_line ? "line " + _h_line + ", " : "") + ("" + (_h_char ? "col " + _h_char + ", " : "")) : "";
        var msg = issue.path + ": " + loc + _details;
        return msg;
    }
};
var to_console_duplicate = function to_console_duplicate(issue) {
    var files = _.chain(_.get(issue, "duplicate.locations", [])).map("path").uniq().join(", ");
    return issue.path + ": Similar code in " + files;
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
var to_console_scm = function to_console_scm(issue) {
    var date = _.get(issue, "commit.commit_date") || _.get(issue, "commit.author_date");
    var sha = _.get(issue, "commit.sha");
    return sha + ": " + date;
};
var to_console_stat = function to_console_stat(issue) {
    var size = _.get(issue, "stat.size", "?");
    var loc = _.get(issue, "stat.loc", "?");
    var lines = _.get(issue, "stat.lines", "?");
    var comments = _.get(issue, "stat.comments", "?");
    return issue.path + " " + ("(" + (size ? (Number(size) / 1024).toFixed(3) + "KB" : "") + ")") + (": " + lines + " lines, " + loc + " loc, " + comments + " comments");
};
var to_console_dep = function to_console_dep(issue) {
    var name = _.get(issue, "dependency.name", "?");
    var current = _.get(issue, "dependency.current", "?");
    var latest = _.get(issue, "dependency.latest", "?");
    return "New release for " + name + ": " + current + " < " + latest;
};
var to_console_cov = function to_console_cov(issue) {
    var cov = _.get(issue, "coverage.total", "?");
    return issue.path + ": " + cov + "% lines covered";
};
var log_syntastic_applicable_messages = function log_syntastic_applicable_messages() {
    var issues = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

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
    var issues = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    var nlogs = {};
    issues.forEach(function (issue, index) {
        var t = issue.type;
        if (!nlogs[t]) nlogs[t] = logger.create(t);
        var plugin_name = _.get(issue, "plugin", "");
        var msg_postfix = plugin_name ? " (vile-" + plugin_name + ")" : "";
        if (_.some(util.errors, function (t) {
            return issue.type == t;
        })) {
            nlogs[t].error(to_console(issue) + msg_postfix);
        } else if (_.some(util.warnings, function (t) {
            return issue.type == t;
        })) {
            if (issue.type == util.COMP) {
                nlogs[t].info(to_console_comp(issue) + msg_postfix);
            } else if (issue.type == util.CHURN) {
                nlogs[t].info(to_console_churn(issue) + msg_postfix);
            } else if (issue.type == util.DEP) {
                nlogs[t].warn(to_console_dep(issue) + msg_postfix);
            } else if (issue.type == util.DUPE) {
                nlogs[t].warn(to_console_duplicate(issue) + msg_postfix);
            } else {
                nlogs[t].warn(to_console(issue) + msg_postfix);
            }
        } else {
            if (issue.type == util.LANG) {
                nlogs[t].info(to_console_lang(issue) + msg_postfix);
            } else if (issue.type == util.SCM) {
                nlogs[t].info(to_console_scm(issue) + msg_postfix);
            } else if (issue.type == util.STAT) {
                nlogs[t].info(to_console_stat(issue) + msg_postfix);
            } else if (issue.type == util.COV) {
                nlogs[t].info(to_console_cov(issue) + msg_postfix);
            } else if (issue.type == util.OK) {
                nlogs[t].info(issue.path + msg_postfix);
            } else {
                nlogs[t].info(to_console(issue) + msg_postfix);
            }
        }
    });
};
module.exports = {
    issues: log_issue_messages,
    syntastic_issues: log_syntastic_applicable_messages
};