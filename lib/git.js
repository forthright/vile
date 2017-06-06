"use strict";
var git_diff_tree = require("git-diff-tree");
var path = require("path");
var _ = require("lodash");
var Bluebird = require("bluebird");
var logger = require("./logger");
var log = logger.create("git");
var CWD = process.cwd();
var into_file_paths = function (gtd_raw) {
    return _.map(_.filter(gtd_raw, function (raw) { return _.get(raw, "status", "").toUpperCase() != "D"; }), function (raw) { return _.get(raw, "toFile", ""); });
};
var changed_files = function (original_rev, repo_path) {
    if (original_rev === void 0) { original_rev = "--root"; }
    if (repo_path === void 0) { repo_path = path.join(CWD, ".git"); }
    return new Bluebird(function (resolve, reject) {
        var stats = [];
        git_diff_tree(repo_path, { originalRev: original_rev })
            .on("data", function (type, data) {
            switch (type) {
                case "raw":
                    stats.push(data);
                    break;
                case "noshow":
                    log.warn("diffs not shown because files were too big");
                    break;
            }
        })
            .on("error", function (err) { return reject(err); })
            .on("cut", function () { return reject("diff too big to parse"); })
            .on("end", function () { return resolve(into_file_paths(stats)); });
    });
};
module.exports = { changed_files: changed_files };
