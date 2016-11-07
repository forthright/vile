/// <reference path="../../@types/index.d.ts" />
"use strict";

var detect = require("language-detect");
var inquirer = require("inquirer");
var _ = require("lodash");
var Bluebird = require("bluebird");
var util = require("./../../util");
var plugin_map = require("./map");
var KNOWN_PROJECT_DIRS = ["app/controllers", "app/views", "app/models", "app/models", "app/assets/javascripts", "app/assets/stylesheets", "config", "src", "lib", "test", "spec"];
var detect_language = function detect_language(filepath) {
    return new Bluebird(function (resolve, reject) {
        detect(filepath, function (err, language) {
            err ? reject(err) : resolve(language);
        });
    });
};
var check_for_project_languages = function check_for_project_languages(config) {
    var langs = [];
    return util.promise_each(process.cwd(), util.filter([], KNOWN_PROJECT_DIRS), function (file) {
        return detect_language(file).then(function (language) {
            // HACK: typescript does not show up ATM
            if (/\.ts$/.test(file)) {
                langs.push("typescript");
            } else {
                langs.push(language);
            }
        });
    }, { read_data: false }).then(function () {
        var uniq_langs = _.chain(_.filter(_.uniq(langs))).map(function (lang) {
            return lang.toLowerCase();
        }).value();
        if (_.isEmpty(uniq_langs)) return Bluebird.resolve(config);
        return inquirer.prompt({
            type: "checkbox",
            message: "It appears you speak our language. Select any that apply!",
            name: "langs",
            choices: _.map(uniq_langs, function (lang) {
                return { name: lang };
            }),
            validate: function validate(answer) {
                return true;
            }
        }).then(function (answers) {
            _.each(_.get(answers, "langs", []), function (lang) {
                var lcase = lang.toLowerCase();
                var plugins = plugin_map.langs[lcase] || [];
                config.vile.plugins = config.vile.plugins.concat(plugins);
            });
            return config;
        });
    });
};
module.exports = {
    init: check_for_project_languages
};