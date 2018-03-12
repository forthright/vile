"use strict";
var inquirer = require("inquirer");
var fs = require("fs");
var Bluebird = require("bluebird");
var _ = require("lodash");
var fs_readdir = Bluebird.promisify(fs.readdir);
var EXTRA_IGNORE_DIRECTORIES = [
    "app/assets/images",
    "app/assets/videos",
    "bin",
    ".bin",
    "build",
    ".build",
    "config/*.yml",
    "public",
    ".test",
    ".tmp",
    "typings"
];
var get_chosen_ignored_directories = function (dirs) {
    if (_.isEmpty(dirs))
        return Bluebird.resolve(dirs);
    var choices = _.map(dirs, function (dir) {
        return { name: dir };
    });
    return new Bluebird(function (resolve, reject) {
        inquirer.prompt({
            choices: choices,
            message: "Select any extra directories or files to ignore.",
            name: "dirs",
            type: "checkbox",
            validate: function () { return true; }
        })
            .then(function (answers) {
            resolve(answers.dirs);
        });
    });
};
var ignored_directories = function (directory) {
    return fs_readdir(directory)
        .then(function (targets) {
        return _.filter(targets, function (target) {
            return fs.statSync(target).isDirectory() &&
                _.some(EXTRA_IGNORE_DIRECTORIES, function (dir) { return dir == target; });
        });
    })
        .then(get_chosen_ignored_directories);
};
var check_for_ignored_directories = function (config) {
    return ignored_directories(process.cwd())
        .then(function (ignored_dirs) {
        config.ferret.ignore = _.uniq(ignored_dirs);
        return config;
    });
};
module.exports = {
    init: check_for_ignored_directories
};
