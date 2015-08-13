/// <reference path="../typings/index.d.ts" />

module vile {

let cli = require("commander")
let path = require("path")
let vile   : Vile.Lib.Index   = require("./index")
let score  : Vile.Lib.Score   = require("./score")
let logger : Vile.Lib.Logger  = require("./logger")
let config : Vile.Lib.Config  = require("./config")
let pkg    : Vile.Lib.Package = require("./../package")

const DEFAULT_VILE_YML = ".vile.yml"

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
    .exec(parse_plugins(plugins), opts.config)
    // TODO: Vile.IssuesPerFile
    .then((issues : any) => {
      let stats = score.digest(issues)

      // TODO: dual options sucks
      if (opts.scores || opts.summary) {
        score.log(issues, stats, opts.summary, opts.grades)
      }

      if (opts.fileview) {
        // TODO: support a custom route (just log to console)
        let rootview = opts.fileview == true ? null : opts.fileview
        vile.report(rootview, issues, stats)
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

let run = (app) => {
  if (app.verbose) logger.verbose(true)
  if (app.quiet) logger.quiet()

  load_config(app)

  if (app.log) set_log_levels(app.log)

  if (app.punish) {
    punish(app.punish, {
      scores: app.scores,
      fileview: app.format == "web",
      config: config.get(),
      summary: app.summary,
      grades: app.grades
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
    .option("-s, --scores",
            "print all file scores")
    .option("-S, --summary",
            "print just a summary of scores")
    .option("-g, --grades",
            "print all file scores as A-F grades")
    .option("-f, --format [type]",
            "specify output format (web,console,json,yml)")
    .option("-l, --log [level]",
            "specify the log level info|warn|error|debug)")
    .option("-q, --quiet",
            "be wvery wvery quiet")
    .option("-v, --verbose",
            "log all the things")

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
