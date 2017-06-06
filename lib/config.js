"use strict";
var yaml = require("js-yaml");
var fs = require("fs");
var conf = {};
var load_config_from_file = function (filepath) {
    try {
        return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"));
    }
    catch (e) {
        console.error(e);
        process.exit(1);
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
    load: load_config_from_file
};
