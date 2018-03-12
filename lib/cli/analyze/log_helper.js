"use strict";
var _ = require("lodash");
var logger = require("./../../logger");
var util = require("./../../util");
var chalk = require("chalk");
var log = logger.create("cli");
var emphasize = require("emphasize");
var humanize_line_char = function (data) {
    var start = _.get(data, "where.start", {});
    var end = _.get(data, "where.end", {});
    var start_character = (typeof start.character == "number" || typeof start.character == "string") ? String(start.character) : "";
    var end_character = (typeof end.character == "number" || typeof end.character == "string") && end.character != start.character ? "-" + String(end.character) : "";
    return typeof end.character == "number" ?
        "" + start_character + end_character : start_character;
};
var humanize_line_num = function (data) {
    var start = _.get(data, "where.start", {});
    var end = _.get(data, "where.end", {});
    var start_line = (typeof start.line == "number" || typeof start.line == "string") ? String(start.line) : "";
    var end_line = (typeof end.line == "number" || typeof end.line == "string") && end.line != start.line ? "-" + String(end.line) : "";
    return typeof end.line == "number" ?
        "" + start_line + end_line : start_line;
};
var to_console = function (data, format) {
    if (format === void 0) { format = "default"; }
    if (format == "syntastic") {
        var data_type_1 = data.type;
        var start_info = void 0;
        var synastic_type = _
            .some(util.errors, function (name) { return name == data_type_1; }) ? "E" : "W";
        if (data_type_1 == util.DUPE) {
            var locs = _.get(data, "duplicate.locations", []);
            start_info = _.get(_.first(locs), "where.start", {});
        }
        else {
            start_info = _.get(data, "where.start", {});
        }
        var h_line = _.get(start_info, "line", 1);
        var h_char = _.get(start_info, "character", 1);
        var details = _.has(data, "title") &&
            data.message != data.title ?
            data.title + " => " + data.message :
            (data.message || data.title);
        return data.path + ":" + h_line + ":" + h_char + ": " +
            (synastic_type + ": " + details);
    }
    else {
        var h_line = humanize_line_num(data);
        var h_char = humanize_line_char(data);
        var details = _.has(data, "title") &&
            data.message != data.title ?
            data.title + " => " + data.message :
            (data.message || data.title);
        var loc = h_line || h_char ?
            "" + (h_line ? "line " + h_line + ", " : "") +
                ("" + (h_char ? "col " + h_char + ", " : "")) : "";
        var data_path = _.isEmpty(data.path) ? "" : data.path + ": ";
        return "" + data_path + loc + details;
    }
};
var to_console_duplicate = function (data) {
    var files = _.chain(_.get(data, "duplicate.locations", [])).map("path").uniq().join(", ");
    return data.path + ": Similar code in " + files;
};
var to_console_churn = function (data) { return data.path + ": " + data.churn; };
var to_console_comp = function (data) { return data.path + ": " + data.complexity; };
var to_console_scm = function (data) {
    var date = _.get(data, "commit.commit_date") ||
        _.get(data, "commit.author_date");
    var sha = _.get(data, "commit.sha");
    return sha + ": " + date;
};
var to_console_stat = function (data) {
    var size = _.get(data, "stat.size", "?");
    var loc = _.get(data, "stat.loc", "?");
    var lines = _.get(data, "stat.lines", "?");
    var comments = _.get(data, "stat.comments", "?");
    var lang = _.get(data, "stat.language", "?");
    return data.path + " " +
        ("(" + (size ? (Number(size) / 1024).toFixed(3) + "KB" : "") + ")") +
        (": " + lines + " lines, " + loc + " loc, " + comments) +
        (" comments (language: " + lang + ")");
};
var to_console_dep = function (data) {
    var name = _.get(data, "dependency.name", "?");
    var current = _.get(data, "dependency.current", "?");
    var latest = _.get(data, "dependency.latest", "?");
    return "New release for " + name + ": " + current + " < " + latest;
};
var to_console_cov = function (data) {
    var cov = _.get(data, "coverage.total", "?");
    return data.path + ": " + cov + "% lines covered";
};
var log_syntastic_applicable_messages = function (data) {
    if (data === void 0) { data = []; }
    data.forEach(function (datum, index) {
        var data_type = datum.type;
        if (_.some(util.displayable_data, function (t) { return data_type == t; })) {
            console.log(to_console(datum, "syntastic"));
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
var to_console_snippet = function (data, nocolors) {
    if (_.isEmpty(data.snippet) && _.isEmpty(data.duplicate))
        return;
    var filepath = _.get(data, "path", "");
    var file_ext = _.first(filepath.match(/[^\.]*$/));
    if (data.type == util.DUPE) {
        _.each(_.get(data, "duplicate.locations", []), function (loc) {
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
        var code = code_for(data.snippet);
        var lines = lines_for(data.snippet);
        console.log();
        log_snippet(lines, code, filepath, file_ext, nocolors);
        console.log();
    }
};
var log_data_messages = function (data, showsnippets, nocolors) {
    if (data === void 0) { data = []; }
    if (showsnippets === void 0) { showsnippets = false; }
    if (nocolors === void 0) { nocolors = false; }
    var nlogs = {};
    data.forEach(function (datum, index) {
        var logger_type = datum.type;
        if (!nlogs[logger_type]) {
            nlogs[logger_type] = logger.create(logger_type);
        }
        var nlog = nlogs[logger_type];
        var plugin_name = _.get(datum, "plugin", "");
        var msg_postfix = plugin_name ? " (ferret-" + plugin_name + ")" : "";
        if (_.some(util.errors, function (i_type) { return datum.type == i_type; })) {
            nlog.error_data(to_console(datum) + msg_postfix);
        }
        else if (_.some(util.warnings, function (i_type) { return datum.type == i_type; })) {
            if (datum.type == util.COMP) {
                nlog.info_data(to_console_comp(datum) + msg_postfix);
            }
            else if (datum.type == util.CHURN) {
                nlog.info_data(to_console_churn(datum) + msg_postfix);
            }
            else if (datum.type == util.DEP) {
                nlog.warn_data(to_console_dep(datum) + msg_postfix);
            }
            else if (datum.type == util.DUPE) {
                nlog.warn_data(to_console_duplicate(datum) + msg_postfix);
            }
            else {
                nlog.warn_data(to_console(datum) + msg_postfix);
            }
        }
        else {
            if (datum.type == util.SCM) {
                nlog.info_data(to_console_scm(datum) + msg_postfix);
            }
            else if (datum.type == util.STAT) {
                nlog.info_data(to_console_stat(datum) + msg_postfix);
            }
            else if (datum.type == util.COV) {
                nlog.info_data(to_console_cov(datum) + msg_postfix);
            }
            else if (datum.type == util.OK) {
            }
            else {
                nlog.info_data(to_console(datum) + msg_postfix);
            }
        }
        if (showsnippets) {
            to_console_snippet(datum, nocolors);
        }
    });
};
module.exports = {
    issues: log_data_messages,
    syntastic_issues: log_syntastic_applicable_messages,
};
