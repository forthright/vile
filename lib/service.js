"use strict";
var Bluebird = require("bluebird");
var request = require("request");
var logger = require("./logger");
var _ = require("lodash");
var HOST = "vile.io";
var PROD_URL = "https://" + HOST;
var API_TARGET = "api/v0";
var VILE_APP = process.env.VILE_APP || PROD_URL;
var log = logger.create(HOST);
var http_authentication = function (auth_token) {
    return { Authorization: "Token token=" + auth_token };
};
var api_path = function (endpoint) {
    return VILE_APP + "/" + API_TARGET + "/" + endpoint;
};
var handle_response = function (resolve, reject) { return function (err, response, body) {
    return err ?
        reject({ error: err }) :
        resolve({ body: body, response: response });
}; };
var commit = function (issues, cli_time, auth) {
    return new Bluebird(function (resolve, reject) {
        var url = api_path("projects/" + auth.project + "/commits");
        request.post({
            form: {
                cli_time: cli_time,
                issues: JSON.stringify(issues)
            },
            headers: http_authentication(auth.token),
            url: url
        }, handle_response(resolve, reject));
    });
};
var commit_status = function (commit_id, auth) {
    return new Bluebird(function (resolve, reject) {
        var url = api_path("projects/" + auth.project + "/commits/" + commit_id + "/status");
        request.get({
            headers: http_authentication(auth.token),
            url: url
        }, handle_response(resolve, reject));
    });
};
var padded_file_score = function (score) {
    return (score < 100 ? " " : "") + String(score) + "%";
};
var log_summary = function (post_json) {
    var score = _.get(post_json, "score", 100);
    var files = _.get(post_json, "files", []);
    var time = _.get(post_json, "time", 0);
    var url = _.get(post_json, "url", "");
    var time_in_seconds = (time / 1000)
        .toFixed(2)
        .toString()
        .replace(/\.0*$/, "");
    _.each(files, function (file) {
        log.info(padded_file_score(_.get(file, "score", 0)) + " => " +
            ("" + _.get(file, "path")));
    });
    log.info();
    log.info("Score: " + score + "%");
    log.info("Time: " + time_in_seconds + "s");
    log.info(url);
};
var API = {
    COMMIT: {
        FAILED: "failed",
        FINISHED: "finished",
        PROCESSING: "processing"
    }
};
module.exports = {
    API: API,
    commit: commit,
    commit_status: commit_status,
    log: log_summary
};
