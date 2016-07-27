/// <reference path="lib/typings/index.d.ts" />

var _                          = require("lodash")
var cli                        = require("commander")
var cli_punish                 = require("./cli/punish")
var cli_auth                   = require("./cli/auth")
var cli_init                   = require("./cli/init")
var pkg     : Vile.Lib.Package = require("./../package")

var no_args = () : boolean => !process.argv.slice(2).length

var configure = () => {
  cli
    .version(pkg.version)
    .usage("[options] [cmd] [args]")

  _.each([
    cli_punish,
    cli_auth,
    cli_init
  ], (command : any) => {
    command.create(cli)
  })

  if (no_args()) cli.outputHelp()
}

var interpret = (argv) =>
  (configure(),
    cli.parse(argv))

module.exports = {
  interpret: interpret
}
