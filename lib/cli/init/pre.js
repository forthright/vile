"use strict";

var fs = require("fs");
var path = require("path");
var inquirer = require("inquirer");
var Bluebird = require("bluebird");
var welcome_confirm = function welcome_confirm(config) {
    return inquirer.prompt([{
        type: "confirm",
        name: "ok_to_proceed",
        message: "Hello friend. Please follow the prompts and " + "answer as best you can.",
        default: true
    }]).then(function (answers) {
        if (answers.ok_to_proceed) {
            return Bluebird.resolve(config);
        } else {
            return Bluebird.resolve(process.exit(0));
        }
    });
};
var check_for_existing_config = function check_for_existing_config(config) {
    var vile_yml_path = path.join(process.cwd(), ".vile.yml");
    if (fs.existsSync(vile_yml_path)) {
        return inquirer.prompt([{
            type: "confirm",
            name: "ok_to_overwrite",
            message: "Found an existing .vile.yml. OK to overwrite?",
            default: true
        }]).then(function (answers) {
            if (answers.ok_to_overwrite) {
                return Bluebird.resolve(config);
            } else {
                return Bluebird.resolve(process.exit(0));
            }
        });
    } else {
        return Bluebird.resolve(config);
    }
};
var check_for_existing_package_json = function check_for_existing_package_json(config) {
    var pkg_json_path = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkg_json_path)) return Bluebird.resolve(config);
    var pkg_json_shell = {
        private: true,
        name: "vile-project-dependency-config",
        scripts: {
            "vile-publish": "vile p -u project_name -si --nodecorations"
        },
        description: "Run `npm install` in a freshly cloned " + "project to install vile. This does not include non-npm " + "based peer dependency requirements. See plugin readme(s) for details."
    };
    var file_data = new Buffer(JSON.stringify(pkg_json_shell, null, "  "));
    return fs.writeFileAsync(pkg_json_path, file_data).then(function (err) {
        return err ? Bluebird.reject(err) : Bluebird.resolve(config);
    });
};
module.exports = {
    init: function init(config) {
        return welcome_confirm(config).then(check_for_existing_config).then(check_for_existing_package_json);
    }
};