"use strict";

/// <reference path="lib/typings/index.d.ts" />
var vile;
(function (vile) {
    var yaml = require("js-yaml");
    var fs = require("fs");
    var logger = require("./logger");
    var log = logger.create("config");
    var conf = undefined;
    var auth_conf = undefined;
    var load_config_from_file = function load_config_from_file(filepath) {
        try {
            return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"));
        } catch (e) {
            log.error(e);
        }
    };
    var load_auth_config_from_file = function load_auth_config_from_file(filepath) {
        try {
            return auth_conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"));
        } catch (e) {
            log.error(e);
        }
    };
    var get = function get() {
        return conf || {};
    };
    var get_auth = function get_auth() {
        return auth_conf || {};
    };
    module.exports = {
        load: load_config_from_file,
        get: get,
        load_auth: load_auth_config_from_file,
        get_auth: get_auth
    };
})(vile || (vile = {}));