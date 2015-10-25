/// <reference path="lib/typings/index.d.ts" />

module vile {

let cli = require("commander")
let _ = require("lodash")
let fs = require("fs")
let path = require("path")
let vile   : Vile.Lib.Index   = require("./index")
let util = require("./util")
let service : Vile.Lib.Service     = require("./service")
let logger  : Vile.Lib.Logger  = require("./logger")
let config  : Vile.Lib.Config  = require("./config")
let pkg     : Vile.Lib.Package = require("./../package")

const DEFAULT_VILE_YML = ".vile.yml"
const DEFAULT_VILE_AUTH_YML = ".vilerc"

// TODO: plugin interface
let parse_plugins = (plugins : string) : Vile.PluginList => {
  return plugins.split ? plugins.split(",") : undefined
}

let set_log_levels = (logs? : string) => {
  logger.quiet()
  if (logs.split) logs.split(",").forEach(logger.level)
}

let punish = (plugins, opts : any = {}) => {
  vile
    .exec(parse_plugins(plugins), opts.config, opts.format)
    .then((issues : Vile.IssueList) => {
      if (opts.deploy) {
        config.load_auth(path.join(process.cwd(), DEFAULT_VILE_AUTH_YML))
        let log = logger.create("vile.io")

        return service
          .commit(issues, config.get_auth())
          .then((http) => {
            if (_.get(http, "response.statusCode") == 200) {
              log.info(http.body)
            } else {
              log.error(http.body)
            }
          })
          .catch((err) => {
            console.log() // newline because spinner is running
            log.error(err.stack || err)
          })
      }

      if (opts.format == "json") {
        process.stdout.write(JSON.stringify(issues))
      }
    })
}

let load_config = (app : any) => {
  let app_config : string

  if (app.config) {
    if (typeof app.config == "string") {
      app_config = app.config
    // TODO: make into const/config
    } else {
      app_config = DEFAULT_VILE_YML
    }

    config.load(path.join(process.cwd(), app_config))
  }
}

// TODO
let authenticate = () => {
  console.log("  To authenticate, first go to " +
      "https://vile.io and create a project AuthToken.")
  console.log()
  console.log("  Then:")
  console.log()
  console.log("    echo \"email: user_email\"     >> .vilerc")
  console.log("    echo \"project: project_name\" >> .vilerc")
  console.log("    echo \"token: auth_token\"     >> .vilerc")
  console.log("    echo \".vilerc\"               >> .gitignore")
}

let run = (app) => {
  if (app.authenticate) return authenticate()
  if (app.verbose) logger.verbose(true)
  if (app.quiet) logger.quiet()

  load_config(app)

  if (app.log) set_log_levels(app.log)

  if (app.punish) {
    // HACK! TODO
    if (app.format == "json") logger.quiet()

    punish(app.punish, {
      format: app.format,
      deploy: app.deploy,
      config: config.get()
    })
  }
}

let no_args = () : boolean => !process.argv.slice(2).length

let configure = () => {
  cli
    .version(pkg.version)
    .usage("[options]")
    .option("-p, --punish [plugin_list]",
            `unless specified in config, this can be a comma delimited
                            string, else run all installed plugins`)
    .option("-c, --config [path]",
            "specify a config file, else look for one in the cwd")
    .option("-f, --format [type]",
            "specify output format (console=default,json)")
    .option("-l, --log [level]",
            "specify the log level info|warn|error|debug)")
    .option("-q, --quiet",
            "be wvery wvery quiet")
    .option("-v, --verbose",
            "log all the things")
    .option("-a, --authenticate",
            "authenticate with vile.io")
    .option("-d, --deploy",
            "commit data to vile.io")

  cli.on("--help", () => {
    console.log("  To log without color and a spinner:")
    console.log("")
    console.log("    $ NO_COLOR=1 vile -p")
    console.log("")
  })

  if (no_args()) cli.outputHelp()
}

let interpret = (argv) => {
  configure()
  cli.parse(argv)
  run(cli)
}

module.exports = {
  interpret: interpret
}

}
