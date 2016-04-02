"use strict";

/// <reference path="lib/typings/index.d.ts" />
var git_diff_tree = require("git-diff-tree");
var path = require("path");
var _ = require("lodash");
var Bluebird = require("bluebird");
var logger = require("./logger");
var log = logger.create("git");
var into_file_paths = function into_file_paths(gtd_raw) {
    return _.map(_.filter(gtd_raw, function (raw) {
        return _.get(raw, "status", "").toUpperCase() != "D";
    }), function (raw) {
        return _.get(raw, "toFile");
    });
};
// TODO: clean up strings in this method
// TODO: upp the threshold for streams and diff size
var changed_files = function changed_files() {
    var original_rev = arguments.length <= 0 || arguments[0] === undefined ? "--root" : arguments[0];
    var repo_path = arguments.length <= 1 || arguments[1] === undefined ? path.join(process.cwd(), ".git") : arguments[1];
    return new Bluebird(function (resolve, reject) {
        var stats = [];
        git_diff_tree(repo_path, { originalRev: original_rev }).on("data", function (type, data) {
            if (type == "raw") {
                stats.push(data);
            } else if (type == "noshow") {
                log.warn("diffs not shown because files were too big");
            }
        }).on("error", function (err) {
            return reject(err);
        }).on("cut", function () {
            return reject("diff too big to parse");
        }).on("end", function () {
            return resolve(into_file_paths(stats));
        });
    });
};
module.exports = {
    changed_files: changed_files
};