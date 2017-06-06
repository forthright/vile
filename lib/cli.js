"use strict";
var _ = require("lodash");
var cli = require("commander");
var cli_punish = require("./cli/punish");
var cli_auth = require("./cli/auth");
var cli_init = require("./cli/init");
var cli_docs = require("./cli/docs");
var pkg = require("./../package");
process.on("unhandledRejection", function (error, promise) {
    console.log();
    console.error("[Unhandled rejection]");
    console.error(_.get(error, "stack", error));
    process.exit(1);
});
var no_args = function (argv) {
    return !argv.slice(2).length;
};
var log_additional_help = function () {
    console.log("  Command specific help:");
    console.log();
    console.log("    {cmd} -h, --help");
    console.log();
};
var sub_modules = function () { return [
    cli_punish,
    cli_auth,
    cli_init,
    cli_docs
]; };
var bind_sub_module = function (cli_sub_mod) {
    cli_sub_mod.create(cli);
};
var configure = function (argv) {
    cli.version(pkg.version);
    _.each(sub_modules(), bind_sub_module);
    cli.on("--help", log_additional_help);
    if (no_args(argv))
        cli.outputHelp();
};
var interpret = function (argv) {
    return (configure(argv),
        cli.parse(argv));
};
module.exports = { interpret: interpret };
