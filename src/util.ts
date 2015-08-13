/// <reference path="../typings/index.d.ts" />

module vile {

let fs = require("fs")
let child_process = require("child_process")
let _ = require("lodash")
let Bluebird : typeof bluebird.Promise = require("bluebird")
let wrench = require("wrench")
let ignore = require("ignore-file")
let logger = require("./logger")
let log = logger.create("util")

Bluebird.promisifyAll(fs)

let log_error = (e : NodeJS.ErrnoException) => {
  console.log()
  log.error(e.stack || e)
}

// TODO: figure out an ideal ignore system
//       make it work with ignore-file?
let is_ignored = (
  filepath : string,
  ignore_list : Vile.IgnoreList = []
) : boolean => {
  let ignored : (a : string) => boolean

  if (ignore_list) {
    ignored = ignore.compile(ignore_list.join("\n"))
  } else {
    ignored = () => false
  }

  return ignored(filepath)
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
  allow : (a : string) => boolean,
  parse_file : (file : string, data? : string) => void,
  opts : any = {}
) : bluebird.Promise<any> => {
  if (!opts.hasOwnProperty("read_data")) opts.read_data = true

  let readdir = new Bluebird((resolve, reject) => {
    let files = wrench.readdirSyncRecursive(dirpath)

    let checkable = _.chain(_.flatten(files))
      .select((f) => fs.existsSync(f) && fs.statSync(f).isFile())
      .select(allow)
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

let into_issue = (
  type : string,
  filepath : string,
  message : string,
  start : any,
  end : any
) : Vile.Issue => {
  return {
    type: type,
    file: filepath,
    msg: message,
    where: {
      start: start,
      end: end
    }
  }
}

module.exports = {
  promise_each: promise_each_file,
  issue: into_issue,
  ignored: is_ignored,
  spawn: spawn,
  OK : "ok",
  INFO: "info",
  WARNING: "warn",
  ERROR: "error"
}

}
