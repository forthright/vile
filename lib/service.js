"use strict";

/// <reference path="lib/typings/index.d.ts" />
var Bluebird = require("bluebird");
var request = require("request");
var logger = require("./logger");
var _ = require("lodash");
var HOST = "vile.io";
var PROD_URL = "https://" + HOST;
var VILE_APP = process.env.VILE_APP || PROD_URL;
var log = logger.create(HOST);
var commit = function commit(issues, auth) {
    return new Bluebird(function (resolve, reject) {
        request.post({
            url: VILE_APP + "/commits",
            form: {
                auth: {
                    project: auth.project,
                    email: auth.email,
                    token: auth.token
                },
                issues: JSON.stringify(issues)
            }
        }, function (err, httpResponse, body) {
            if (err) {
                reject({ error: err });
            } else {
                resolve({
                    body: body,
                    response: httpResponse
                });
            }
        });
    });
};
var padded_file_score = function padded_file_score(score) {
    return (score < 100 ? " " : "") + String(score) + "%";
};
var log_summary = function log_summary(post_json, verbose) {
    // HACK
    var score = _.get(post_json, "score");
    var files = _.get(post_json, "files");
    var description = _.get(post_json, "description");
    var url = _.get(post_json, "url");
    if (verbose) _.each(files, function (file) {
        return log.info(padded_file_score(_.get(file, "score")) + " => " + ("" + _.get(file, "path")));
    });
    log.info();
    log.info("Score: " + score + "%");
    log.info(description);
    log.info(url);
};
module.exports = {
    commit: commit,
    log: log_summary
};