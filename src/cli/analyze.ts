import _ = require("lodash")
import commander = require("commander")
import Bluebird = require("bluebird")
import config = require("./../config")
import git = require("./../git")
import logger = require("./../logger")
import plugin = require("./../plugin")
import util = require("./../util")
import upload = require("./analyze/upload")
import log_helper = require("./analyze/log_helper")
import plugin_map = require("./init/map")

const DEFAULT_IGNORE_DIRS = plugin_map.ignore

const log = logger.create("cli")

const log_and_exit = (error : any) : void => {
  log.error("\n", _.get(error, "stack", error))
  process.exit(1)
}

const add_default_ignores = (
  ferret_yml : ferret.YMLConfig
) : void => {
  const base_ignore : ferret.IgnoreList = _.get(
    ferret_yml, "ferret.ignore", [])
  const new_ignore : ferret.IgnoreList = _.uniq(
    _.concat(base_ignore, DEFAULT_IGNORE_DIRS))
  _.set(ferret_yml, "ferret.ignore", new_ignore)
}

const has_non_info_data = (data : ferret.DataList) : boolean =>
  _.filter(data, (datum : ferret.Data) =>
    _.some(util.displayable_data, (t) => t == datum.type)
  ).length > 0

const analyze = (
  opts : ferret.CLIApp,
  paths : string[]
) : void => {
  const custom_plugins = typeof opts.plugins == "string" ?
    _.compact(_.split(opts.plugins, ",")) : []

  const ferret_yml = config.get()

  const additional_plugins = typeof opts.additionalPlugins == "string" ?
    _.compact(_.split(opts.additionalPlugins, ",")) : []

  add_default_ignores(ferret_yml)

  const exec_opts : ferret.PluginExecOptions = {
    combine: opts.combine,
    dont_post_process: opts.dontPostProcess,
    format: opts.format,
    plugins: custom_plugins,
    additional_plugins: additional_plugins,
    skip_core_plugins: opts.withoutCorePlugins,
    skip_snippets: opts.skipSnippets,
    spinner: !(opts.quiet || !opts.decorations)
  }

  if (!_.isEmpty(paths)) {
    _.set(ferret_yml, "ferret.allow", paths)
  }

  const cli_start_time = new Date().getTime()

  const exec = () => plugin
    .exec(ferret_yml, exec_opts)
    .then((data : ferret.DataList) => {
      const cli_end_time = new Date().getTime()
      const cli_time = cli_end_time - cli_start_time

      if (opts.format == "syntastic") {
        log_helper.syntastic_issues(data)
      } else if (opts.format == "json") {
        process.stdout.write(JSON.stringify(data))
      } else {
        log_helper.issues(
          data,
          opts.terminalSnippets,
          !opts.decorations)
      }

      if (opts.upload) {
        return upload.commit(data, cli_time, opts)
      } else {
        if (opts.exitOnIssues && has_non_info_data(data)) {
          process.exit(1)
        }
        return Bluebird.resolve()
      }
    })
    .catch(log_and_exit)

  if (opts.gitDiff) {
    const rev = typeof opts.gitDiff == "string" ?
      opts.gitDiff : undefined
    log.info("git diff:")
    git.changed_files(rev).then((changed_paths : string[]) => {
      _.each(changed_paths, (p : string) => { log.info("", p) })
      _.set(ferret_yml, "ferret.allow", changed_paths)
      exec()
    })
  } else {
    exec()
  }
}

const configure = (
  opts : ferret.CLIApp
) : void => {
  const issue_levels = (_.compact(
    _.split(opts.issueLog, ",")) as ferret.DataType.All[])

  logger.enable(opts.decorations, issue_levels)

  config.load(opts.config)

  if (opts.log) logger.level(opts.log)

  const disable_logger = opts.quiet ||
    opts.format == "json" ||
    opts.format == "syntastic"

  if (disable_logger) logger.disable()

  if (!disable_logger && opts.decorations) {
    logger.start_spinner()
  }
}

const action = (paths : string[], opts : ferret.CLIApp) => {
  configure(opts)
  analyze(opts, paths)
}

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("analyze [paths...]")
    .alias("a")
    .option("-p, --plugins [plugin_list]",
            `run only these plugins`)
    .option("-a, --additional-plugins [plugin_list]",
            `unless you specify --plugins, this will ` +
            `add these plugins to auto-detected list`)
    .option("-c, --config [path]",
            "specify a custom config file")
    .option("-f, --format [type]",
            "specify output format (console=default,json,syntastic)")
    .option("-u, --upload [project_name]",
            "publish to ferret.io (disables --gitdiff)- " +
              "alternatively, you can set a FERRET_PROJECT env var")
    .option("-x, --combine [combine_def]",
            "combine file data from two directories into one path- " +
              "example: [src:lib,...] or [src.ts:lib.js,...]")
    .option("-t, --terminal-snippets [path]",
            "show generated code snippets in the terminal")
    .option("-s, --skip-snippets",
            "don't generate code snippets")
    .option("-g, --git-diff [rev]",
            "only check files patched in latest HEAD commit, or rev")
    .option("-d, --dont-post-process",
            "don't post process data in any way (ex: adding ok data)- " +
            "useful for per file checking")
    .option("-w, --without-core-plugins",
            "don't use plugins bundled with core lib")
    .option("-l, --log [level]",
            "specify the log level (info=default|warn|error)")
    .option("-i, --issue-log [level]",
            "specify data types to log (ex: '-i security,dependency')")
    .option("-e, --exit-on-issues", "exit with bad code " +
            "if non-info data points exist")
    .option("-q, --quiet", "log nothing")
    .option("-n, --no-decorations", "disable color and progress bar")
    .action(action)

export = { create }
