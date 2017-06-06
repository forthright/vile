"use strict";
var inquirer = require("inquirer");
var fs = require("fs");
var Bluebird = require("bluebird");
var _ = require("lodash");
var IGNORE_DIRECTORIES = [
    "node_modules",
    "app/assets/images",
    "bower_components",
    "typings",
    "build",
    ".build",
    ".test",
    ".git",
    "tmp",
    "vendor",
    "coverage"
];
var get_chosen_ignored_directories = function (dirs) {
    if (_.isEmpty(dirs))
        return Bluebird.resolve(dirs);
    var choices = _.map(dirs, function (dir) {
        return { name: dir };
    });
    return inquirer.prompt({
        choices: choices,
        message: "Select any directories or files to ignore.",
        name: "dirs",
        type: "checkbox",
        validate: function (answer) { return true; }
    })
        .then(function (answers) { return answers.dirs; });
};
var ignored_directories = function (directory) {
    return fs.readdirAsync(directory)
        .then(function (targets) {
        return _.filter(targets, function (target) {
            return fs.statSync(target).isDirectory() &&
                _.some(IGNORE_DIRECTORIES, function (dir) { return dir == target; });
        });
    })
        .then(get_chosen_ignored_directories);
};
var get_any_extra_directories_from_user = function () {
    return inquirer.prompt([
        {
            message: "Enter paths (separate with commas):",
            name: "extra_ignore_dirs",
            type: "input"
        }
    ])
        .then(function (answers) {
        var dirs = answers.extra_ignore_dirs;
        return _.compact(_.toString(dirs).split(","));
    });
};
var get_any_extra_directories = function () {
    return inquirer.prompt([
        {
            default: true,
            message: "Would you like to manually add paths to ignore?",
            name: "get_extra_dirs",
            type: "confirm"
        }
    ]).then(function (answers) {
        if (answers.get_extra_dirs) {
            return get_any_extra_directories_from_user();
        }
        else {
            return Bluebird.resolve([]);
        }
    });
};
var check_for_ignored_directories = function (config) {
    return ignored_directories(process.cwd())
        .then(function (ignored_dirs) {
        return get_any_extra_directories()
            .then(function (dirs) {
            config.vile.ignore = _.uniq(_.concat("node_modules", ignored_dirs, dirs));
            return config;
        });
    });
};
module.exports = {
    init: check_for_ignored_directories
};
