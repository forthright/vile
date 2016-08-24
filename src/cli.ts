/// <reference path="lib/typings/index.d.ts" />

var _                          = require("lodash")
var cli                        = require("commander")
var cli_punish                 = require("./cli/punish")
var cli_auth                   = require("./cli/auth")
var cli_init                   = require("./cli/init")
var pkg     : Vile.Lib.Package = require("./../package")

var no_args = (argv : string[]) : boolean =>
  !argv.slice(2).length

var log_additional_help = () => {
  console.log("  Command specific help:")
  console.log()
  console.log("    {cmd} -h, --help")
  console.log()
}

var sub_modules = () : any[] => [
  cli_punish,
  cli_auth,
  cli_init
]

var bind_sub_module = (cli_sub_mod : any) => {
  cli_sub_mod.create(cli)
}

var configure = (argv : string[]) => {
  cli.version(pkg.version)
  _.each(sub_modules(), bind_sub_module)
  cli.on("--help", log_additional_help)
  if (no_args(argv)) cli.outputHelp()
}

var interpret = (argv) =>
  (configure(argv),
    cli.parse(argv))

module.exports = {
  interpret: interpret
}
