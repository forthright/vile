/// <reference path="@types/index.d.ts" />
"use strict";

var _ = require("lodash");
var cli = require("commander");
var cli_punish = require("./cli/punish");
var cli_auth = require("./cli/auth");
var cli_init = require("./cli/init");
var pkg = require("./../package");
// Note: This only registers for non-worker forked processes
process.on("unhandledRejection", function (error, promise) {
    console.log(); // next line if spinner
    console.error("[Unhandled rejection]");
    console.error(_.get(error, "stack", error));
    process.exit(1);
});
var no_args = function no_args(argv) {
    return !argv.slice(2).length;
};
var log_additional_help = function log_additional_help() {
    console.log("  Command specific help:");
    console.log();
    console.log("    {cmd} -h, --help");
    console.log();
};
// TODO: map submodule to a type
var sub_modules = function sub_modules() {
    return [cli_punish, cli_auth, cli_init];
};
var bind_sub_module = function bind_sub_module(cli_sub_mod) {
    cli_sub_mod.create(cli);
};
var configure = function configure(argv) {
    cli.version(pkg.version);
    _.each(sub_modules(), bind_sub_module);
    cli.on("--help", log_additional_help);
    if (no_args(argv)) cli.outputHelp();
};
var interpret = function interpret(argv) {
    return configure(argv), cli.parse(argv);
};
module.exports = {
    interpret: interpret
};