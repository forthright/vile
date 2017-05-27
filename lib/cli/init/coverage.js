"use strict";

var fs = require("fs");
var path = require("path");
var Bluebird = require("bluebird");
var inquirer = require("inquirer");
var _ = require("lodash");
var plugin_map = require("./map");
var check_for_test_coverage_step = function check_for_test_coverage_step(config) {
    var exists = function exists(target) {
        return fs.existsSync(path.join(process.cwd(), target));
    };
    if (exists("coverage") || exists("test") || exists("spec")) {
        return inquirer.prompt([{
            default: true,
            message: "Looks like you have tests. Install plugin?",
            name: "ok_to_add",
            type: "confirm"
        }]).then(function (answers) {
            if (answers.ok_to_add) {
                var cov_map = _.get(plugin_map.frameworks, "coverage");
                _.each(cov_map, function (plugin) {
                    return config.vile.plugins.push(plugin);
                });
            }
            return Bluebird.resolve(config);
        });
    } else {
        return Bluebird.resolve(config);
    }
};
module.exports = {
    init: check_for_test_coverage_step
};