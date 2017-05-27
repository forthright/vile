"use strict";

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
        return _.get(raw, "toFile", "");
    });
};
var changed_files = function changed_files() {
    var original_rev = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "--root";
    var repo_path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : path.join(process.cwd(), ".git");
    return new Bluebird(function (resolve, reject) {
        var stats = [];
        git_diff_tree(repo_path, { originalRev: original_rev }).on("data", function (type, data) {
            switch (type) {
                case "raw":
                    stats.push(data);
                    break;
                case "noshow":
                    log.warn("diffs not shown because files were too big");
                    break;
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
module.exports = { changed_files: changed_files };