/// <reference path="lib/typings/index.d.ts" />
"use strict";

var vile;
(function (vile) {
    var Bluebird = require("bluebird");
    var request = require("request");
    var _ = require("lodash");
    var fs = require("fs");
    var path = require("path");
    var PRODUCTON_URL = "http://joffrey-baratheon.herokuapp.com";
    var VILE_APP = process.env.VILE_APP || PRODUCTON_URL;
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
                if (err) reject({ error: err });else resolve({
                    body: body,
                    response: httpResponse
                });
            });
        });
    };
    module.exports = {
        commit: commit
    };
})(vile || (vile = {}));