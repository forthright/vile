"use strict";

/// <reference path="lib/typings/index.d.ts" />
var _ = require("lodash");
var cli = require("commander");
var cli_punish = require("./cli/punish");
var cli_auth = require("./cli/auth");
var pkg = require("./../package");
var no_args = function no_args() {
    return !process.argv.slice(2).length;
};
var configure = function configure() {
    cli.version(pkg.version).usage("[options] [cmd] [args]");
    _.each([cli_punish, cli_auth], function (command) {
        command.create(cli);
    });
    if (no_args()) cli.outputHelp();
};
var interpret = function interpret(argv) {
    return configure(), cli.parse(argv);
};
module.exports = {
    interpret: interpret
};