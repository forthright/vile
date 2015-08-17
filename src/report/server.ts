/// <reference path="../lib/typings/index.d.ts" />

module vile {

let child_process = require("child_process")
let Promise = require("bluebird")
let _ = require("lodash")
let stylus = require("stylus")
let express = require("express")
let wrench = require("wrench")
let connect_coffee_script = require("connect-coffee-script")
let uuid = require("uuid")
let path = require("path")
let fs = require("fs")
let logger = require("./../logger")
let log = logger.create("report")

const WEB = path.join(__dirname, "..", "..", "web")
const BOWER_COMPONENTS = path.join(__dirname, "..", "..", "bower_components")
const APP_DIR = path.join(WEB, "report")
const PURE_CSS = path.join(BOWER_COMPONENTS, "pure")
const JQUERY = path.join(BOWER_COMPONENTS, "jquery", "dist")
const PORT = 3000

let close_relative_ext = (ext : string) : string => {
  switch(ext) {
    case "styl": return "sass"
    case "less": return "scss"
    case "gemspec": return "ruby"
    default: return ext
  }
}

let pygmented_as_promised = (
  code_or_file : string,
  opts : any
) : bluebird.Promise<string> => {
  // TODO: make a pygmented-as-promised package
  // TODO: why do some calls return empty code data
  return new Promise((resolve, reject) => {
    // TODO: use vile.spawn
    let chunks = []

    let args = _.reduce(opts, (arr, option, name) => {
      return arr.concat([`-${name}`, option])
    }, [])

    log.debug("pygmentize " + args.join(" "))
    let pyg = child_process.spawn("pygmentize", args)
    pyg.stdout.on("data", (chunk) => chunks.push(chunk))
    pyg.stderr.on("data", (data) => log.warn(data.toString()))
    pyg.on("exit", (code) => {
      if (code != 0) return resolve("highlighting failed")
      let content : string = chunks.reduce((s, c) => s += c.toString(), "")
      resolve(content)
    })

    pyg.stdin.write(code_or_file)
    pyg.stdin.end()
  })
}

let read_lines = (filepath) : string[] => {
  let file = new wrench.LineReader(filepath)
  let lines = []
  while (file.hasNextLine()) {
    lines.push(file.getNextLine())
  }
  return lines
}

// TODO move regexs into const
let current_tree_path = (req) => {
  return req.path
    .replace(/^\//, "")
    .replace(/\?[^\?]*$/, "")
}

// TODO: too complex- refactor
// TODO: separate pygments stuff into own module
// TODO: be able to report via console, vs web
let render_view = (root, issues, stats) => (req, res) => {
  let curr_path = current_tree_path(req)
  let files = _.sortBy(_.keys(issues))
  let stat = fs.statSync(path.join(root, curr_path))

  if (!stat.isFile()) {
    return res.render("list", {
      title: curr_path,
      stats: stats,
      // TODO: into method-
      files: _.sortBy(files.map((file) => {
        return {
          score: _.sum(issues[file], (i) => i.score) /
                  issues[file].length,
          number_issues: issues[file].length,
          path: file
        }
      }), (i) => i.score),
      project_name: path.basename(process.cwd())
    })
  } else {
    let lines = read_lines(path.join(root, curr_path))

    let file_issues = issues[curr_path].map((issue) => {
      issue.id = uuid.v4()
      return issue
    })

    let file_score

    if (file_issues.length > 0) {
      file_score = _.sum(issues[curr_path], (i) => i.score) /
                   issues[curr_path].length
    } else {
      file_score = 100
    }

    if (file_score == 100) {
      return res.render("file", {
        title: curr_path,
        // TODO: into method
        issues: issues[curr_path],
        issues_json: JSON.stringify(issues[curr_path] || []),
        snippets: null
      })
    }

    return Promise.all(file_issues.map((file_issue) => {
      // TODO: clean this up
      let start = _.get(file_issue, "where.start.line", 1)
      if (start < 1) start = 1
      let end = _.get(file_issue, "where.end.line", start)

      // TODO: support windows
      // TODO: fix the need for " " to make pygments print all lines
      let s_start = start - 3
      if (start < 1) s_start = 1
      let s_end = end + 34
      if (s_end > lines.length) s_end = lines.length

      let raw_code = lines.slice(s_start - 1, s_end).join("\n ")

      let opts = {
        l: close_relative_ext(path.extname(curr_path).replace(/^\./, "")),
        f: "html",
        // TODO why is hl_lines failing in node env?
        // P: "hl_lines=\"#{hl_lines}\""
        O: `linenos=inline,linenostart=${s_start},linespans=line`
      }

      // TODO: cache
      pygmented_as_promised(raw_code, opts)
        .then((html) => {
          return { issue: file_issue, code: html }
        })
    }))
    .then((snippets) => res.render("file", {
      title: curr_path,
      // TODO: into method
      file_score: file_score,
      issues: issues[curr_path],
      issues_json: JSON.stringify(issues[curr_path] || []),
      snippets: snippets
    }))
  }
}

let configure = (app) => {
  app.set("view engine", "jade")
  app.set("views", APP_DIR)
}

let bind_routes = (
  app,
  issues : Vile.IssuesPerFile,
  stats : Vile.Stats,
  root : string = process.cwd()
) => {
  app.use(stylus.middleware(APP_DIR))
  app.use(connect_coffee_script({ src: APP_DIR, bare: true }))
  app.use(express.static(APP_DIR))
  app.use(express.static(PURE_CSS))
  app.use(express.static(JQUERY))
  app.get("/*", render_view(root, issues, stats))
}

let render = (
  rootpath : string,
  issues : Vile.IssuesPerFile,
  stats : Vile.Stats
) => {
  let app = express()
  configure(app)
  bind_routes(app, issues, stats, rootpath)
  app.listen(PORT, () => {
    log.info("")
    log.info(`Ready: http://localhost:${PORT}`)
  })
}

module.exports = {
  render: render
}

}
