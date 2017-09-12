"use strict";
var fs = require("fs");
var path = require("path");
var inquirer = require("inquirer");
var Bluebird = require("bluebird");
var fs_writeFile = Bluebird.promisify(fs.writeFile);
var check_for_existing_config = function (config) {
    var vile_yml_path = path.join(process.cwd(), ".vile.yml");
    if (fs.existsSync(vile_yml_path)) {
        return inquirer.prompt([
            {
                default: true,
                message: "Found an existing .vile.yml. OK to overwrite?",
                name: "ok_to_overwrite",
                type: "confirm"
            }
        ]).then(function (answers) {
            if (answers.ok_to_overwrite) {
                return Bluebird.resolve(config);
            }
            else {
                return Bluebird.resolve(process.exit(0));
            }
        });
    }
    else {
        return Bluebird.resolve(config);
    }
};
var check_for_existing_package_json = function (config) {
    var pkg_json_path = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkg_json_path))
        return Bluebird.resolve(config);
    var pkg_json_shell = {
        description: "Tracks any Node.js based dependencies for Vile.",
        name: "vile-project-dependency-config",
        private: true
    };
    var file_data = new Buffer(JSON.stringify(pkg_json_shell, null, "  "));
    return fs_writeFile(pkg_json_path, file_data)
        .then(function (err) {
        return err ?
            Bluebird.reject(err) :
            Bluebird.resolve(config);
    });
};
module.exports = {
    init: function (config) {
        return check_for_existing_config(config)
            .then(check_for_existing_package_json);
    }
};
