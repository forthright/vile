"use strict";

/// <reference path="../lib/typings/index.d.ts" />
var fs = require("fs");
var Bluebird = require("bluebird");
var inquirer = require("inquirer");
var _ = require("lodash");
var logger = require("./../logger");
var log = logger.create("cli");
Bluebird.promisifyAll(fs);
var IGNORE_DIRECTORIES = ["node_modules", "bower_components", ".build", ".test", ".git", "vendor", "coverage"];
var get_chosen_ignored_directories = function get_chosen_ignored_directories(dirs) {
    return inquirer.prompt({
        type: "checkbox",
        message: "Select any directories or files to ignore.",
        name: "dirs",
        choices: _.map(dirs, function (dir) {
            return { name: dir };
        }),
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
        return !_.isEmpty(dirs) ? dirs.split(",") : [];
    });
};
var get_any_extra_directories = function get_any_extra_directories() {
    return inquirer.prompt([{
        type: "confirm",
        name: "get_extra_dirs",
        message: "Did we miss some (hit enter for YES)?",
        default: true
    }]).then(function (answers) {
        if (answers.get_extra_dirs) {
            return get_any_extra_directories_from_user();
        } else {
            return Bluebird.resolve([]);
        }
    });
};
// * Found an existing installation of vile plugins. Ok to remove?
var check_for_existing_install_step = function check_for_existing_install_step(config) {
    return Bluebird.resolve(config);
};
// * Found an existing .vile.yml- this WILL overwrite it. Cool?
var check_for_existing_config_step = function check_for_existing_config_step(config) {
    return Bluebird.resolve(config);
};
// * Found these ignored directories?
// * Did we miss any dirs?
var check_for_ignored_directories_step = function check_for_ignored_directories_step(config) {
    return ignored_directories(process.cwd()).then(function (ignored_dirs) {
        return get_any_extra_directories().then(function (dirs) {
            config.vile.ignore = _.concat(ignored_dirs, dirs);
            return config;
        });
    });
};
// * Found these languages?
// * Did we miss any?
var check_for_project_languages_step = function check_for_project_languages_step(config) {
    return Bluebird.resolve(config);
};
// * Found these frameworks (ex: rails, nodejs)- correct?
//   Pick types of core plugins (i.e. not traditional file based stuff)
// * Did we miss any?
// * Based on what you've told us, we also recommend installing plugins
//   for various underlying data.
//   Cool?
//   I.e. if rails, add rubycritic (complex, churn, etc)
//        if nodejs, add escomplex plugin, etc
//
//   AND/OR!
//
// * Found .eslintrc (use all types), .jshintrc, .brakeman.yml,
// .sass-lint.yml, rbp, .rubocop.yml etc
//   Install the related plugins for them (you can install more lat:wqaer)
// TODO: right now, user selects, be nice to auto detect
var check_for_project_frameworks_step = function check_for_project_frameworks_step(config) {
    return Bluebird.resolve(config);
};
// * Looks like you use Git. We recommend having the plugin to track
// commits data vs just by date.
var check_for_source_control_step = function check_for_source_control_step(config) {
    return Bluebird.resolve(config);
};
// * Found a coverage dir with lcov files? Track project coverage
// (lcov support- need to find?) -- will get more robust some point
var check_for_test_coverage_step = function check_for_test_coverage_step(config) {
    return Bluebird.resolve(config);
};
// * Show final summary and .vile.yml (and mention can edit later)
var confirm_vile_config_is_ok = function confirm_vile_config_is_ok(config) {
    return Bluebird.resolve(config);
};
// * Found existing package.json file. We recommend saving vile and plugin
// packages to your npm dev dependencies.
//   Cool?
// * WARN: No package.json file found. Vile and its plugins use NPM
// package.json files to make it easy to install and use vile.
// One will be generated.
var confirm_package_json_creation = function confirm_package_json_creation(config) {
    return Bluebird.resolve(config);
};
// * Installing plugins. This could take a bit of time...
var install_plugins = function install_plugins(config) {
    // TODO: get plugins from vile.config, ideal for first time users
    return Bluebird.resolve(config);
};
// * Yay, looks like we are ready to punish.
//   Run 'vile p' in your project directory to see how things work.
//   Once you are happy, be sure to authenticate and then
//   publish your first commit:
//   'VILE_API_TOKEN=XXXXXXXXX vile p -u project_name'
//   (Note: this could be part of the
//   We also recommend setting using vile's CI/CD Integrations
//   (manual schedules) to rountinely refresh and analyze your project.
var ready_to_punish = function ready_to_punish(config) {
    return Bluebird.resolve(config);
};
// TODO: any is Commander.js
var initialize_vile_project = function initialize_vile_project(cli) {
    var config = { vile: {} };
    return check_for_existing_install_step(config).then(check_for_existing_config_step).then(check_for_ignored_directories_step).then(check_for_project_languages_step).then(check_for_project_frameworks_step).then(check_for_source_control_step).then(check_for_test_coverage_step).then(confirm_vile_config_is_ok).then(confirm_package_json_creation).then(install_plugins).then(ready_to_punish);
};
var create = function create(cli) {
    return cli.command("init").alias("i").action(initialize_vile_project);
};
module.exports = {
    create: create
};