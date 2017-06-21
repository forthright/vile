import _ = require("lodash")
import commander = require("commander")
import Bluebird = require("bluebird")
import config = require("./../config")
import git = require("./../git")
import logger = require("./../logger")
import plugin = require("./../plugin")
import upload = require("./analyze/upload")
import log_helper = require("./analyze/log_helper")

const log = logger.create("cli")

const log_and_exit = (error : any) : void => {
  log.error(_.get(error, "stack", error))
  process.exit(1)
}

const analyze = (
  opts : vile.CLIApp,
  paths : string[]
) : void => {
  const custom_plugins = typeof opts.plugins == "string" ?
    _.compact(_.split(opts.plugins, ",")) : []

  // TODO: not ideal to mutate the app
  _.merge(opts, {
    config: config.get(),
    plugins: custom_plugins,
    spinner: !(opts.quiet || opts.nodecorations)
  })

  if (!_.isEmpty(paths)) {
    _.set(opts, "config.vile.allow", paths)
  }

  const cli_start_time = new Date().getTime()

  // TODO: don't pass in app, instead hardcode new opts (when using CC)
  const exec = () => plugin
    .exec(opts.config, opts)
    .then((issues : vile.IssueList) => {
      const cli_end_time = new Date().getTime()
      const cli_time = cli_end_time - cli_start_time

      if (opts.format == "syntastic") {
        log_helper.syntastic_issues(issues)
      } else if (opts.format == "json") {
        process.stdout.write(JSON.stringify(issues))
      } else {
        log_helper.issues(
          issues,
          opts.terminalsnippets,
          opts.nodecorations)
      }

      return opts.upload ?
        upload.commit(issues, cli_time, opts) :
        Bluebird.resolve()
    })
    .catch(log_and_exit)

  if (opts.gitdiff) {
    const rev = typeof opts.gitdiff == "string" ?
      opts.gitdiff : undefined
    log.info("git diff:")
    git.changed_files(rev).then((changed_paths : string[]) => {
      _.each(changed_paths, (p : string) => { log.info("", p) })
      _.set(opts, "config.vile.allow", changed_paths)
      exec()
    })
  } else {
    exec()
  }
}

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("analyze [paths...]")
    .alias("a")
    .option("-p, --plugins [plugin_list]",
            `unless specified in config, this can be a comma delimited ` +
            `string, else run all installed plugins`)
    .option("-c, --config [path]",
            "specify a custom config file")
    .option("-f, --format [type]",
            "specify output format (console=default,json,syntastic)")
    .option("-u, --upload [project_name]",
            "publish to vile.io (disables --gitdiff)- " +
              "alternatively, you can set a VILE_PROJECT env var")
    .option("-x, --combine [combine_def]",
            "combine file data from two directories into one path- " +
              "example: [src:lib,...] or [src.ts:lib.js,...]")
    .option("-t, --terminalsnippets [path]",
            "show generated code snippets in the terminal")
    .option("-s, --skipsnippets",
            "don't generate code snippets")
    .option("-d, --dontpostprocess",
            "don't post process data in any way (ex: adding ok issues)- " +
            "useful for per file checking- don't use with --upload")
    .option("-g, --gitdiff [rev]",
            "only check files patched in latest HEAD commit, or rev")
    .option("-l, --log [level]",
            "specify the log level (info=default|warn|error)")
    .option("-q, --quiet", "log nothing")
    .option("-n, --nodecorations", "disable color and progress bar")
    .action((paths : string[], opts : vile.CLIApp) => {
      logger.enable(!opts.nodecorations)

      config.load(opts.config)

      if (opts.log) logger.level(opts.log)

      if (opts.quiet || opts.format == "json" ||
          opts.format == "syntastic") logger.disable()

      analyze(opts, paths)
    })

export = { create }
