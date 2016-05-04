"use strict";

/// <reference path="lib/typings/index.d.ts" />
var yaml = require("js-yaml");
var fs = require("fs");
var logger = require("./logger");
var log = logger.create("config");
var conf;
var auth_conf;
var load_config_from_file = function load_config_from_file(filepath) {
    try {
        return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"));
    } catch (e) {
        log.error(e);
    }
};
var load_auth_config_from_env = function load_auth_config_from_env() {
    auth_conf = {};
    var env = process.env;
    auth_conf.token = env.VILE_API_TOKEN;
    auth_conf.project = env.VILE_PROJECT;
    return auth_conf;
};
var get = function get() {
    return conf || {};
};
var get_auth = function get_auth() {
    if (!auth_conf) load_auth_config_from_env();
    return auth_conf;
};
module.exports = {
    load: load_config_from_file,
    get: get,
    get_auth: get_auth
};