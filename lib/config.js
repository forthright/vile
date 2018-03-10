"use strict";
var yaml = require("js-yaml");
var fs = require("fs");
var ConfigParseError = require("./config/config_parse_error");
var DEFAULT_FERRET_YML = ".ferret.yml";
var conf = {};
var load_config = function (filepath) {
    if (filepath === void 0) { filepath = DEFAULT_FERRET_YML; }
    if (filepath == DEFAULT_FERRET_YML && !fs.existsSync(filepath)) {
        conf = {};
        return conf;
    }
    try {
        conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"));
        return conf;
    }
    catch (e) {
        throw new ConfigParseError(filepath + "\n\n" + e);
    }
};
var load_auth_config_from_env = function () {
    var env = process.env;
    return {
        project: env.FERRET_PROJECT,
        token: env.FERRET_TOKEN
    };
};
var get_conf = function () { return conf; };
var api = {
    get: get_conf,
    get_auth: load_auth_config_from_env,
    load: load_config
};
module.exports = api;
