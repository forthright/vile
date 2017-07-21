import _ = require("lodash")
import commander = require("commander")
import Bluebird = require("bluebird")
import config = require("./../config")
import git = require("./../git")
import logger = require("./../logger")
import plugin = require("./../plugin")
import upload = require("./analyze/upload")
import log_helper = require("./analyze/log_helper")

const DEFAULT_IGNORE_DIRS : string[] = [
  ".git",
  "node_modules"
]

const log = logger.create("cli")

const log_and_exit = (error : any) : void => {
  log.error(_.get(error, "stack", error))
  process.exit(1)
}

const add_default_ignores = (
  vile_yml : vile.YMLConfig
) : void => {
  const base_ignore : vile.IgnoreList = _.get(
    vile_yml, "vile.ignore", [])
  const new_ignore : vile.IgnoreList = _.uniq(
    _.concat(base_ignore, DEFAULT_IGNORE_DIRS))
  _.set(vile_yml, "vile.ignore", new_ignore)
}

const analyze = (
  opts : vile.CLIApp,
  paths : string[]
) : void => {
  const custom_plugins = typeof opts.plugins == "string" ?
    _.compact(_.split(opts.plugins, ",")) : []

  const vile_yml = config.get()

  // HACK: always auto ignore node_modules/.git for now
  add_default_ignores(vile_yml)

  const exec_opts : vile.PluginExecOptions = {
    combine: opts.combine,
    dont_post_process: opts.dontPostProcess,
    format: opts.format,
    plugins: custom_plugins,
    skip_snippets: opts.skipSnippets,
    spinner: !(opts.quiet || !opts.decorations)
  }

  if (!_.isEmpty(paths)) {
    _.set(vile_yml, "vile.allow", paths)
  }

  const cli_start_time = new Date().getTime()

  const exec = () => plugin
    .exec(vile_yml, exec_opts)
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
          opts.terminalSnippets,
          !opts.decorations)
      }

      return opts.upload ?
        upload.commit(issues, cli_time, opts) :
        Bluebird.resolve()
    })
    .catch(log_and_exit)

  if (opts.gitDiff) {
    const rev = typeof opts.gitDiff == "string" ?
      opts.gitDiff : undefined
    log.info("git diff:")
    git.changed_files(rev).then((changed_paths : string[]) => {
      _.each(changed_paths, (p : string) => { log.info("", p) })
      _.set(vile_yml, "vile.allow", changed_paths)
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
    .option("-t, --terminal-snippets [path]",
            "show generated code snippets in the terminal")
    .option("-s, --skip-snippets",
            "don't generate code snippets")
    .option("-d, --dont-post-process",
            "don't post process data in any way (ex: adding ok issues)- " +
            "useful for per file checking- don't use with --upload")
    .option("-g, --git-diff [rev]",
            "only check files patched in latest HEAD commit, or rev")
    .option("-l, --log [level]",
            "specify the log level (info=default|warn|error)")
    .option("-i, --issue-log [level]",
            "specify issue types to log (ex: '-i security,dependency')")
    .option("-q, --quiet", "log nothing")
    .option("-n, --no-decorations", "disable color and progress bar")
    .action((paths : string[], opts : vile.CLIApp) => {
      const issue_levels = (_.compact(
        _.split(opts.issueLog, ",")) as vile.IssueType.All[])

      logger.enable(opts.decorations, issue_levels)

      config.load(opts.config)

      if (opts.log) logger.level(opts.log)

      if (opts.quiet || opts.format == "json" ||
          opts.format == "syntastic") logger.disable()

      analyze(opts, paths)
    })

export = { create }
