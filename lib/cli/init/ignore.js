/// <reference path="../../@types/index.d.ts" />
"use strict";

var inquirer = require("inquirer");
var fs = require("fs");
var Bluebird = require("bluebird");
var _ = require("lodash");
var IGNORE_DIRECTORIES = ["node_modules", "app/assets/images", "bower_components", "typings", "build", ".build", ".test", ".git", "tmp", "vendor", "coverage"];
var get_chosen_ignored_directories = function get_chosen_ignored_directories(dirs) {
    if (_.isEmpty(dirs)) return Bluebird.resolve(dirs);
    var choices = _.map(dirs, function (dir) {
        return { name: dir };
    });
    // HACK: then is not on type Prompt?
    return inquirer.prompt({
        type: "checkbox",
        message: "Select any directories or files to ignore.",
        name: "dirs",
        choices: choices,
        validate: function validate(answer) {
            return true;
        }
    }).then(function (answers) {
        return answers.dirs;
    });
};
var ignored_directories = function ignored_directories(directory) {
    return fs.readdirAsync(directory).then(function (targets) {
        return _.filter(targets, function (target) {
            return fs.statSync(target).isDirectory() && _.some(IGNORE_DIRECTORIES, function (dir) {
                return dir == target;
            });
        });
    }).then(get_chosen_ignored_directories);
};
var get_any_extra_directories_from_user = function get_any_extra_directories_from_user() {
    return inquirer.prompt([{
        type: "input",
        name: "extra_ignore_dirs",
        message: "Enter paths (separate with commas):"
    }]).then(function (answers) {
        var dirs = answers.extra_ignore_dirs;
        return _.compact(_.toString(dirs).split(","));
    });
};
var get_any_extra_directories = function get_any_extra_directories() {
    return inquirer.prompt([{
        type: "confirm",
        name: "get_extra_dirs",
        message: "Would you like to manually add paths to ignore?",
        default: true
    }]).then(function (answers) {
        if (answers.get_extra_dirs) {
            return get_any_extra_directories_from_user();
        } else {
            return Bluebird.resolve([]);
        }
    });
};
var check_for_ignored_directories = function check_for_ignored_directories(config) {
    return ignored_directories(process.cwd()).then(function (ignored_dirs) {
        return get_any_extra_directories().then(function (dirs) {
            config.vile.ignore = _.uniq(_.concat("node_modules", ignored_dirs, dirs));
            return config;
        });
    });
};
module.exports = {
    init: check_for_ignored_directories
};