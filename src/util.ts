/// <reference path="@types/index.d.ts" />

import unixify = require("unixify")
import fs = require("fs")
import path = require("path")
import child_process = require("child_process")
import npm_run_path = require("npm-run-path")
import extend = require("extend")
import _ = require("lodash")
import Bluebird = require("bluebird")
import ignore = require("ignore-file")
import logger = require("./logger")
import config = require("./config")

// TODO: make a constants file or something
const DEFAULT_VILE_YML         = ".vile.yml"

Bluebird.promisifyAll(fs)

const log_error = (e : NodeJS.ErrnoException) => {
  console.log(e)
}

const matches = (
  filepath : string,
  key : string,
  list_or_string : any
) : boolean => {
  let matched : (a : string) => boolean

  if (!list_or_string) {
    let conf : any = config.get()
    // HACK: this is fragile, perhaps config should be in this module
    list_or_string = _.isEmpty(conf) ? _.get(
      config.load(DEFAULT_VILE_YML),
      key
    ) : conf
  }

  if (list_or_string) {
    matched = typeof list_or_string == "string" ?
      ignore.sync(list_or_string) :
      ignore.compile(list_or_string)
  } else {
    matched = () => false
  }

  return matched(filepath)
}

// TODO: what to do about dirs (expecting called to know that)

const is_ignored = (
  filepath : string,
  ignore_config : any = []
) : boolean =>
  matches(unixify(filepath), "vile.ignore", ignore_config)

const is_allowed = (
  filepath : string,
  allow_config : any = []
) : boolean => {
  filepath = unixify(filepath)

  if (_.isEmpty(allow_config)) {
    return true

  // HACK: not ideal way of doing this (need to do better matching)
  } else {
    if (typeof allow_config == "string") allow_config = [ allow_config ]
    // HACK: not totally correct (ex: /fo is not within /foo)
    return _
      .some(allow_config, (pattern : string) =>
        pattern.indexOf(filepath) == 0 ||
          filepath.indexOf(pattern) == 0) ||
            matches(filepath, "vile.allow", allow_config)
  }
}

const filter_promise_each = (
  ignore_config : vile.IgnoreList,
  allow_config : vile.AllowList
) => (
  file_or_dir : string
) : boolean =>
  is_allowed(file_or_dir, allow_config) &&
    !is_ignored(file_or_dir, ignore_config)

// TODO: make io async
const collect_files = (
  target : string,
  allowed : (p : string, i : boolean) => boolean
) : string[] => {
  let at_root = !path.relative(process.cwd(), target)
  let rel_path = at_root ? target : path.relative(process.cwd(), target)
  let is_dir = fs.lstatSync(rel_path).isDirectory()

  if (!at_root && !allowed(rel_path, is_dir)) return []

  if (is_dir) {
    return _.flatten(fs.readdirSync(target).map((subpath) => {
      return collect_files(path.join(target, subpath), allowed)
    }))
  } else { return [ rel_path ] }
}

// TODO: better typing
// TODO: add mem limit to child process
const spawn = (
  bin : string,
  opts : vile.Lib.SpawnOptions = {}
) : Bluebird<string> =>
  new Bluebird((
    resolve : (buffer : string) => void,
    reject : (e : string) => void
  ) => {
    let log = logger.create(bin)
    let chunks : Buffer[] = []
    let errors : string[] = []
    let env = extend({}, process.env)

    env.PATH = npm_run_path({
      cwd: process.cwd(),
      path: env.PATH
    })

    let proc = child_process.spawn(bin, opts.args, {
      stdio: opts.stdio || [process.stdin, "pipe", "pipe"],
      env: env
    })

    proc.stdout.on("data", (chunk : Buffer) => {
      chunks.push(chunk)
    })

    proc.stderr.on("data", (data : Buffer) => {
      let error = data.toString("utf-8")
      // TODO: log errors after running (do something with them)
      errors.push(error)
      log.warn(error)
    })

    proc.on("close", (code : number) => {
      let content : string = chunks
        .map((chunk) => chunk.toString("utf-8")).join("")
      if (code != 0) {
        reject(`Exited with code: ${code}`)
      } else {
        resolve(content)
      }
    })
  })

const promise_each_file = (
  dirpath : string,
  allow : (file_or_dir_path : string, is_dir : boolean) => boolean,
  parse_file : (file : string, data? : string) => void,
  opts : any = {}
) : Bluebird<any> => {
  if (!opts.hasOwnProperty("read_data")) opts.read_data = true

  let readdir = new Bluebird((resolve, reject) => {
    let files = collect_files(dirpath, allow)

    let checkable = _.chain(_.flatten(files))
      .filter((f) => fs.existsSync(f) && fs.lstatSync(f).isFile())
      .value()

    resolve(checkable)
  })

  return readdir.then((files : string[]) => {
    return Bluebird.all(files.map((target) => {
      if (fs.lstatSync(target).isFile()) {
        if (opts.read_data) {
          return (<any>fs).readFileAsync(target, { encoding: "utf-8" })
            .then((data : string) => parse_file(target, data))
        } else {
          return parse_file(target)
        }
      } else {
        return Bluebird.resolve([])
      }

    }))
    .then((targets) => _.flatten(targets))
    .catch(log_error)
  })
}

// TODO: validate issue objects as it comes in
const into_issue = (data : vile.Issue) : vile.Issue => data

export = {
  promise_each: promise_each_file,
  filter: filter_promise_each,
  issue: into_issue,
  ignored: is_ignored,
  allowed: is_allowed,
  spawn: spawn,

  API: {
    COMMIT: {
      FINISHED: "finished",
      PROCESSING: "processing",
      FAILED: "failed"
    }
  },

  OK: "ok",

  displayable_issues: [
    "warning",
    "style",
    "maintainability",
    "duplicate",
    "error",
    "security",
    "dependency"
  ],

  WARN: "warning",
  STYL: "style",
  MAIN: "maintainability",
  COMP: "complexity",
  CHURN: "churn",
  DUPE: "duplicate",
  DEP: "dependency",
  // TODO: map dynamically
  warnings: [
    "warning",
    "style",
    "maintainability",
    "complexity",
    "churn",
    "duplicate",
    "dependency"
  ],

  ERR: "error",
  SEC: "security",
  errors: [
    "error",
    "security"
  ],

  STAT: "stat",
  SCM: "scm",
  LANG: "lang",
  COV : "cov",
  infos: [
    "stat",
    "scm",
    "lang",
    "cov"
  ]
}
