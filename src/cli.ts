/// <reference path="lib/typings/index.d.ts" />

module vile {

let cli                        = require("commander")
let _                          = require("lodash")
let fs                         = require("fs")
let path                       = require("path")
let vile    : Vile.Lib.Index   = require("./index")
let util                       = require("./util")
let service : Vile.Lib.Service = require("./service")
let logger  : Vile.Lib.Logger  = require("./logger")
let config  : Vile.Lib.Config  = require("./config")
let pkg     : Vile.Lib.Package = require("./../package")

const DEFAULT_VILE_YML         = ".vile.yml"
const DEFAULT_VILE_AUTH_YML    = ".vilerc"

// TODO: plugin interface
let parse_plugins = (plugins : string) : Vile.PluginList =>
  plugins.split ? plugins.split(",") : undefined

let set_log_levels = (logs? : string) => {
  logger.quiet()
  if (logs.split) logs.split(",").forEach(logger.level)
}

let padded_file_score = (score : number) =>
  (score < 100 ? " " : "") + String(score) + "%"

let log_vileio_summary = (log : any, info : any, verbose : boolean) => {
  // HACK
  let score : number = _.get(info, "score")
  let files : any[] = _.get(info, "files")
  let new_issues : number = _.get(info, "new_issues")
  let review_url : string = _.get(info, "review_url")

  if (verbose)
    _.each(files, (file : any) =>
      log.info(`${padded_file_score(_.get(file, "score"))} => ` +
               `${_.get(file, "path")}`))

  log.info()
  log.info(`Score: ${score}%`)
  log.info(`New Issues: ${new_issues}`)
  log.info(review_url)
}

let publish = (issues : Vile.IssueList, opts : any) => {
  config.load_auth(path.join(process.cwd(), DEFAULT_VILE_AUTH_YML))
  let log = logger.create("vile.io")

  return service
    .commit(issues, config.get_auth())
    .then((http) => {
      if (_.get(http, "response.statusCode") == 200) {
        log_vileio_summary(
          log,
          _.attempt(JSON.parse.bind(null, http.body)),
          opts.scores
        )
      } else {
        log.error(http.body)
      }
    })
    .catch((err) => {
      console.log() // newline because spinner is running
      log.error(err.stack || err)
    })
}

let punish = (app : any) => {
  let plugins : string = app.punish

  // TODO: not ideal to mutate the app
  _.merge(app, {
    spinner: !(app.quiet || app.nodecorations),
    config: config.get()
  })

  vile
    .exec(parse_plugins(plugins), app.config, app)
    .then((issues : Vile.IssueList) => {
      if (app.deploy) return publish(issues, app)
      if (app.format == "json")
        process.stdout.write(JSON.stringify(issues))
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
  if (app.quiet || app.format == "json") logger.quiet()
  if (app.log) set_log_levels(app.log)
  load_config(app)
  if (app.punish) punish(app)
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
            "specify output format (color=default,json)")
    .option("-l, --log [level]",
            "specify the log level (info|warn|error|debug)")
    .option("-q, --quiet",
            "log nothing")
    .option("-v, --verbose",
            "log all the things")
    .option("-a, --authenticate",
            "authenticate with vile.io")
    .option("-d, --deploy",
            "publish to vile.io")
    .option("-s, --scores",
            "show file scores and detailed stats")
    .option("-i, --snippets",
            "add code snippets to issues")
    .option("--nodecorations", "disable color and progress bar")

  if (no_args()) cli.outputHelp()
}

let interpret = (argv) =>
  (configure(),
    cli.parse(argv),
      run(cli))

module.exports = {
  interpret: interpret
}

}
