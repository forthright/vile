"use strict";
var yaml = require("js-yaml");
var fs = require("fs");
var ConfigParseError = require("./config/config_parse_error");
var DEFAULT_VILE_YML = ".vile.yml";
var conf = {};
var load_config = function (filepath) {
    if (filepath === void 0) { filepath = DEFAULT_VILE_YML; }
    if (filepath == DEFAULT_VILE_YML && !fs.existsSync(filepath)) {
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
        project: env.VILE_PROJECT,
        token: env.VILE_TOKEN
    };
};
var get_conf = function () { return conf; };
module.exports = {
    get: get_conf,
    get_auth: load_auth_config_from_env,
    load: load_config
};
