import unixify = require("unixify")
import fs = require("fs")
import path = require("path")
import cross_spawn = require("cross-spawn")
import npm_run_path = require("npm-run-path")
import _ = require("lodash")
import Bluebird = require("bluebird")
import ignore = require("ignore")
import logger = require("./logger")

// HACK: no options in type defs?
const fs_readFile : any = Bluebird.promisify(fs.readFile)

const matches = (
  filepath : string,
  to_match : string[] | string
) : boolean => {
  const matcher = ignore()

  return matcher
    .add(_.concat([], to_match))
    .ignores(filepath)
}

const is_ignored = (
  filepath : string,
  ignore_list : ferret.IgnoreList
) : boolean =>
  matches(unixify(filepath), ignore_list)

const is_allowed = (
  filepath : string,
  allow_list : ferret.AllowList
) : boolean => {
  const unixpath : string = unixify(filepath)

  if (_.isEmpty(allow_list)) return true

  // HACK: not ideal way of doing this (need to do better matching)
  return _
    .some(_.concat([], allow_list), (pattern : string) =>
      pattern.indexOf(unixpath) == 0 ||
        unixpath.indexOf(pattern) == 0) ||
          matches(unixpath, allow_list)
}

const filter_promise_each = (
  ignore_list : ferret.IgnoreList,
  allow_list : ferret.AllowList
) => (
  file_or_dir : string
) : boolean =>
  is_allowed(file_or_dir, allow_list) &&
    !is_ignored(file_or_dir, ignore_list)

// TODO: make io async?
const collect_files = (
  target : string,
  allowed : (p : string, i : boolean) => boolean
) : string[] => {
  const at_root = !path.relative(process.cwd(), target)
  const rel_path = at_root ? target : path.relative(process.cwd(), target)
  const is_dir = fs.lstatSync(rel_path).isDirectory()

  if (!at_root && !allowed(rel_path, is_dir)) return []

  if (is_dir) {
    return _.flatten(fs.readdirSync(target).map((subpath) => {
      return collect_files(path.join(target, subpath), allowed)
    }))
  } else { return [ rel_path ] }
}

const move_node_bin_to_end = (env_path : string) : string => {
  const node_bin_dir : string = path.dirname(process.execPath)

  const filtered_paths : string[] = _.filter(
    env_path.split(path.delimiter),
    (p : string) => p != node_bin_dir)

  filtered_paths.push(node_bin_dir)

  return _.uniq(filtered_paths).join(path.delimiter)
}

// TODO: add mem limit to child process
const spawn = (
  bin : string,
  opts : ferret.SpawnOptions = {}
) : Bluebird<ferret.SpawnData> =>
  new Bluebird((
    resolve : (r : ferret.SpawnData) => void,
    reject : (e : Error) => void
  ) => {
    const stdout : Buffer[] = []
    const stderr : Buffer[] = []

    // HACK: Move node bin path added by npm-run-path to end
    //       (ex: so we don't clobber ruby rbenv/n shims etc)
    const new_path : string = move_node_bin_to_end(npm_run_path({
      cwd: process.cwd(),
      path: process.env.PATH
    }))

    const new_env = _.assign({}, process.env)

    // HACK: If we don't do this, npm run scripts fail,
    // but not gems based ones? Force this for now.
    new_env.Path = new_path
    new_env.PATH = new_path

    const proc = cross_spawn(bin, opts.args, {
      env: new_env,
      stdio: opts.stdio || [ process.stdin, "pipe", "pipe" ]
    })

    proc.stdout.on("data", (data : Buffer) => {
      stdout.push(data)
    })

    proc.stderr.on("data", (data : Buffer) => {
      stderr.push(data)
    })

    proc.on("close", (code : number) => {
      const stdout_str : string = stdout
        .map((out) => out.toString("utf-8")).join("")
      const stderr_str : string = stderr
        .map((err) => err.toString("utf-8")).join("")

      // TODO: should be lib opt to disable auto logging stderr
      if (stderr_str) {
        const log = logger.create(bin)
        log.warn("\n", stderr_str)
      }

      const data : ferret.SpawnData = {
        code,
        stderr: stderr_str,
        stdout: stdout_str
      }

      resolve(data)
    })
  })

const promise_each_file = (
  dirpath : string,
  allow : (file_or_dir_path : string, is_dir : boolean) => boolean,
  parse_file : (file : string, data? : string) => Bluebird<any> | any,
  opts : ferret.PromiseEachFileOptions = {}
) : Bluebird<any> => {
  if (!opts.hasOwnProperty("read_data")) opts.read_data = true

  const readdir = new Bluebird((resolve, reject) => {
    const files = collect_files(dirpath, allow)

    const checkable = _.chain(_.flatten(files))
      .filter((f) => fs.existsSync(f) && fs.lstatSync(f).isFile())
      .value()

    resolve(checkable)
  })

  return readdir.then((files : string[]) => {
    return Bluebird.all(files.map((target) => {
      if (fs.lstatSync(target).isFile()) {
        if (opts.read_data) {
          return fs_readFile(target, { encoding: "utf-8" })
            .then((data : string) => parse_file(target, data))
        } else {
          return parse_file(target)
        }
      } else {
        return Bluebird.resolve([])
      }
    }))
    .then((targets) => _.flatten(targets))
  })
}

// TODO: validate data objects as it comes in
const into_data = (data : ferret.Data) : ferret.Data => data

const displayable_data : ferret.DataType.All[] = [
  "warning",
  "style",
  "maintainability",
  "duplicate",
  "error",
  "security",
  "dependency"
]

const warnings : ferret.DataType.Warnings[] = [
  "warning",
  "style",
  "maintainability",
  "complexity",
  "churn",
  "duplicate",
  "dependency"
]

const errors : ferret.DataType.Errors[] = [
  "error",
  "security"
]

const infos : ferret.DataType.Infos[] = [
  "stat",
  "scm",
  "lang",
  "cov"
]

const api : ferret.Module.Util = {
  CHURN :  ("churn" as ferret.DataType.Churn),
  COMP  :  ("complexity" as ferret.DataType.Comp),
  COV   :  ("cov" as ferret.DataType.Cov),
  DEP   :  ("dependency" as ferret.DataType.Dep),
  DUPE  :  ("duplicate" as ferret.DataType.Dupe),
  ERR   :  ("error" as ferret.DataType.Err),
  MAIN  :  ("maintainability" as ferret.DataType.Main),
  OK    :  ("ok" as ferret.DataType.Ok),
  SCM   :  ("scm" as ferret.DataType.Scm),
  SEC   :  ("security" as ferret.DataType.Sec),
  STAT  :  ("stat" as ferret.DataType.Stat),
  STYL  :  ("style" as ferret.DataType.Styl),
  WARN  :  ("warning" as ferret.DataType.Warn),

  allowed: is_allowed,
  displayable_data,
  errors,
  filter: filter_promise_each,
  ignored: is_ignored,
  infos,
  data: into_data,
  promise_each: promise_each_file,
  spawn,
  warnings
}

export = api
