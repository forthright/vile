/// <reference path="lib/typings/index.d.ts" />

module vile {

let fs = require("fs")
let path = require("path")
let child_process = require("child_process")
let _ = require("lodash")
let Bluebird : typeof bluebird.Promise = require("bluebird")
let ignore = require("ignore-file")
let logger = require("./logger")
let config  : Vile.Lib.Config = require("./config")
let log = logger.create("util")

// TODO: make a constants file or something
const DEFAULT_VILE_YML         = ".vile.yml"

Bluebird.promisifyAll(fs)

let log_error = (e : NodeJS.ErrnoException) => {
  console.log(e)
}

let is_ignored = (
  filepath : string,
  ignore_config : any
) : boolean => {
  let ignored : (a : string) => boolean

  if (!ignore_config) {
    let conf : any = config.get()
    // HACK: this is fragile, perhaps config should be in this module
    ignore_config = conf == {} ? _.get(
      config.load(DEFAULT_VILE_YML),
      "vile.ignore"
    ) : conf
  }

  if (ignore_config) {
    ignored = typeof ignore_config == "string" ?
      ignore.sync(ignore_config) :
      ignore.compile(ignore_config.join("\n"))
  } else {
    ignored = () => false
  }

  return ignored(filepath)
}

// TODO: make io async
let collect_files = (target, allowed) : string[] => {
  let at_root = !path.relative(process.cwd(), target)
  let rel_path = at_root ? target : path.relative(process.cwd(), target)
  let is_dir = fs.statSync(rel_path).isDirectory();

  if (!at_root && !allowed(rel_path, is_dir)) return;

  if (is_dir) {
    return _.flatten(fs.readdirSync(target).map((subpath) => {
      return collect_files(path.join(target, subpath), allowed)
    }))
  } else { return [ rel_path ] }
}

// TODO: better typing
// TODO: add mem limit to child process
let spawn = (bin : string, opts : any = {}) : bluebird.Promise<any> => {
  return new Bluebird((resolve : any, reject) => {
    let log = logger.create(bin)
    let chunks : Buffer[] = []
    let errors = []

    log.debug(`${bin} ${opts.args.join(" ")}`)

    let proc = child_process.spawn(bin, opts.args, {
      stdio: [process.stdin, "pipe", "pipe"]
    })

    proc.stdout.on("data", (chunk : Buffer) => {
      chunks.push(chunk)
    })

    proc.stderr.on("data", (data : Buffer) => {
      let error = data.toString("utf-8")
      errors.push(error)
      log.warn(error)
    })

    proc.on("exit", (code) => {
      let content : string = chunks
        .map((chunk) => chunk.toString("utf-8")).join("")
      if (!content) log.warn(`no data was returned from ${bin}`)
      resolve(content)
      // TODO: be able to send along with content
      //       for now.. hack log after spinner stops
    })
  })
}

// TODO: uber complex
// TODO: check for app specific ignore (to ignore files plugin ignores)
let promise_each_file = (
  dirpath : string,
  allow : (file_or_dir_path : string, is_dir : boolean) => boolean,
  parse_file : (file : string, data? : string) => void,
  opts : any = {}
) : bluebird.Promise<any> => {
  if (!opts.hasOwnProperty("read_data")) opts.read_data = true

  let readdir = new Bluebird((resolve, reject) => {
    let files = collect_files(dirpath, allow)

    let checkable = _.chain(_.flatten(files))
      .select((f) => fs.existsSync(f) && fs.statSync(f).isFile())
      .value()

    resolve(checkable)
  })

  return readdir.then((files : string[]) => {
    return Bluebird.all(files.map((target) => {
      if (fs.statSync(target).isFile()) {
        if (opts.read_data) {
          return fs.readFileAsync(target, { encoding: "utf-8" })
            .then((data) => parse_file(target, data))
        } else {
          return parse_file(target)
        }
      } else {
        return Bluebird.resolve([])
      }

    }))
    .then((errors) => _.flatten(errors))
    .catch(log_error)
  })
}

// TODO: validate issue objects as it comes in
let into_issue = (data : any) : Vile.Issue => data

module.exports = {
  promise_each: promise_each_file,
  issue: into_issue,
  ignored: is_ignored,
  spawn: spawn,

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
  GIT: "git",
  LANG: "lang",
  COV : "cov",
  infos: [
    "stat",
    "git",
    "lang",
    "cov"
  ]
}

}
