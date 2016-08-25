"use strict";

/// <reference path="lib/typings/index.d.ts" />
var Bluebird = require("bluebird");
var request = require("request");
var logger = require("./logger");
var _ = require("lodash");
var HOST = "vile.io";
var PROD_URL = "https://" + HOST;
var API_TARGET = "api/v0";
var VILE_APP = process.env.VILE_APP || PROD_URL;
var log = logger.create(HOST);
var http_authentication = function http_authentication(auth_token) {
    return { "Authorization": "Token token=" + auth_token };
};
var api_path = function api_path(endpoint) {
    return VILE_APP + "/" + API_TARGET + "/" + endpoint;
};
var handle_response = function handle_response(resolve, reject) {
    return function (err, response, body) {
        return err ? reject({ error: err }) : resolve({
            body: body,
            response: response
        });
    };
};
var commit = function commit(issues, cli_time, auth) {
    return new Bluebird(function (resolve, reject) {
        var url = api_path("projects/" + auth.project + "/commits");
        log.debug("POST " + url);
        request.post({
            url: url,
            headers: http_authentication(auth.token),
            form: {
                issues: JSON.stringify(issues),
                cli_time: cli_time
            }
        }, handle_response(resolve, reject));
    });
};
var commit_status = function commit_status(commit_id, auth) {
    return new Bluebird(function (resolve, reject) {
        var url = api_path("projects/" + auth.project + "/commits/" + commit_id + "/status");
        log.debug("GET " + url);
        request.get({
            url: url,
            headers: http_authentication(auth.token)
        }, handle_response(resolve, reject));
    });
};
var padded_file_score = function padded_file_score(score) {
    return (score < 100 ? " " : "") + String(score) + "%";
};
var log_summary = function log_summary(post_json, verbose) {
    var score = _.get(post_json, "score");
    var files = _.get(post_json, "files");
    var time = _.get(post_json, "time");
    var url = _.get(post_json, "url");
    var time_in_seconds = (time / 1000).toFixed(2).toString().replace(/\.0*$/, "");
    if (verbose) {
        _.each(files, function (file) {
            return log.info(padded_file_score(_.get(file, "score")) + " => " + ("" + _.get(file, "path")));
        });
    }
    log.info();
    log.info("Score: " + score + "%");
    log.info("Time: " + time_in_seconds + "s");
    log.info(url);
};
module.exports = {
    commit: commit,
    commit_status: commit_status,
    log: log_summary
};