/// <reference path="@types/index.d.ts" />

import _ = require("lodash")
import cli = require("commander")
import cli_punish = require("./cli/punish")
import cli_auth = require("./cli/auth")
import cli_init = require("./cli/init")

const pkg = require("./../package")

const no_args = (argv : string[]) : boolean =>
  !argv.slice(2).length

const log_additional_help = () => {
  console.log("  Command specific help:")
  console.log()
  console.log("    {cmd} -h, --help")
  console.log()
}

const sub_modules = () : any[] => [
  cli_punish,
  cli_auth,
  cli_init
]

const bind_sub_module = (cli_sub_mod : any) => {
  cli_sub_mod.create(cli)
}

const configure = (argv : string[]) => {
  cli.version(pkg.version)
  _.each(sub_modules(), bind_sub_module)
  cli.on("--help", log_additional_help)
  if (no_args(argv)) cli.outputHelp()
}

const interpret = (argv) =>
  (configure(argv),
    cli.parse(argv))

export = {
  interpret: interpret
}
