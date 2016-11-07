/// <reference path="@types/index" />

import Bluebird = require("bluebird")
import _ = require("lodash")
import cli = require("commander")
import cli_punish = require("./cli/punish")
import cli_auth = require("./cli/auth")
import cli_init = require("./cli/init")

const pkg = require("./../package")

// Note: This only registers for non-worker forked processes
process.on("unhandledRejection", (
  error : NodeJS.ErrnoException | string,
  promise : Bluebird<any>
) => {
  console.log() // next line if spinner
  console.error("[Unhandled rejection]")
  console.error(_.get(error, "stack", error))
  process.exit(1)
})

const no_args = (argv : string[]) : boolean =>
  !argv.slice(2).length

const log_additional_help = () => {
  console.log("  Command specific help:")
  console.log()
  console.log("    {cmd} -h, --help")
  console.log()
}

const sub_modules = () : vile.Lib.CLIModule[] => [
  cli_punish,
  cli_auth,
  cli_init
]

const bind_sub_module = (cli_sub_mod : vile.Lib.CLIModule) => {
  cli_sub_mod.create(cli)
}

const configure = (argv : string[]) => {
  cli.version(pkg.version)
  _.each(sub_modules(), bind_sub_module)
  cli.on("--help", log_additional_help)
  if (no_args(argv)) cli.outputHelp()
}

const interpret = (argv : string[]) =>
  (configure(argv),
    cli.parse(argv))

export = {
  interpret: interpret
}
