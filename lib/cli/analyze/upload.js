"use strict";
var _ = require("lodash");
var config = require("./../../config");
var service = require("./../../service");
var logger = require("./../../logger");
var CommitUploadError = require("./commit_upload_error");
var log = logger.create("vile.io");
var COMMIT_STATUS_INTERVAL_TIME = 2000;
var upload_error = function (msg) {
    throw new CommitUploadError(msg);
};
var wait_for = function (ms, cb) {
    var timer = setInterval(function () {
        cb(timer);
    }, ms);
};
var wait_for_done_status_and_log = function (commit_id, auth) {
    wait_for(COMMIT_STATUS_INTERVAL_TIME, function (timer) {
        service
            .commit_status(commit_id, auth)
            .then(function (http) {
            var api_body = _.get(http, "body");
            var response = _.get(http, "response", { message: null });
            var status_code = _.get(response, "statusCode");
            var body_json = _.attempt(JSON.parse.bind(null, api_body));
            var message = _.get(body_json, "message");
            var data = _.get(body_json, "data");
            if (status_code != 200) {
                clearInterval(timer);
                upload_error("status: " + status_code + ": " +
                    JSON.stringify(api_body));
            }
            else {
                log.info("Commit " + commit_id + " " + message);
                if (message == service.API.COMMIT.FINISHED) {
                    clearInterval(timer);
                    service.log(data);
                }
                else if (message == service.API.COMMIT.FAILED) {
                    clearInterval(timer);
                    upload_error(JSON.stringify(data));
                }
            }
        });
    });
};
var commit = function (issues, cli_time, opts) {
    var auth = config.get_auth();
    if (_.isEmpty(auth.project))
        auth.project = opts.upload;
    return service
        .commit(issues, cli_time, auth)
        .then(function (http) {
        if (_.get(http, "response.statusCode") != 200) {
            upload_error(_.get(http, "body", "[no body]"));
        }
        var body_json = _.attempt(JSON.parse.bind(null, _.get(http, "body", "{}")));
        var commit_state = _.get(body_json, "message");
        var commit_id = _.get(body_json, "data.commit_id", null);
        log.info("Commit " + commit_id + " " + commit_state);
        if (!commit_id) {
            upload_error("No commit uid was provided on commit. " +
                "Can't check status.");
        }
        else if (!commit_state) {
            upload_error("No commit state was provided upon creation. " +
                "Can't check status.");
        }
        else if (commit_state == service.API.COMMIT.FAILED) {
            upload_error("Creating commit state is failed.");
        }
        else {
            wait_for_done_status_and_log(commit_id, auth);
        }
    });
};
module.exports = { commit: commit };
