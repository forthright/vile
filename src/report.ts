/// <reference path="../typings/index.d.ts" />

module vile {

let server = require("./report/server")

let report = (rootpath, issues : Vile.IssuesPerFile, stats : Vile.Stats) => {
  let root = rootpath || process.cwd()
  server.render(root, issues, stats)
}

module.exports = { report: report }

}
