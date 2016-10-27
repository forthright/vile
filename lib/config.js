"use strict";

/// <reference path="lib/typings/index.d.ts" />
var yaml = require("js-yaml");
var fs = require("fs");
var logger = require("./logger");
var log = logger.create("config");
var conf = {};
var load_config_from_file = function load_config_from_file(filepath) {
    try {
        return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"));
    } catch (e) {
        log.error(e);
    }
};
var load_auth_config_from_env = function load_auth_config_from_env() {
    var env = process.env;
    var auth_conf = {
        token: env.VILE_API_TOKEN,
        project: env.VILE_PROJECT
    };
    return auth_conf;
};
var get = function get() {
    return conf;
};
module.exports = {
    load: load_config_from_file,
    get: get,
    get_auth: load_auth_config_from_env
};