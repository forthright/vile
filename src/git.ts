/// <reference path="lib/typings/index.d.ts" />

var git_diff_tree = require("git-diff-tree")
var path = require("path")
var _ = require("lodash")
var Bluebird : typeof bluebird.Promise = require("bluebird")
var logger : Vile.Lib.Logger  = require("./logger")
var log = logger.create("git")

var into_file_paths = (gtd_raw : any[]) =>
  _.map(_.filter(gtd_raw,
    (raw : any) => _.get(raw, "status", "").toUpperCase() != "D"),
    (raw : any) => _.get(raw, "toFile"))

// TODO: clean up strings in this method
// TODO: upp the threshold for streams and diff size
var changed_files = (
  original_rev : string = "--root",
  repo_path : string = path.join(process.cwd(), ".git")
) : bluebird.Promise<any> =>
  new Bluebird((resolve, reject) => {
    let stats : any[] = []

    git_diff_tree(repo_path, { originalRev: original_rev })
      .on("data", (type : string, data : any) => {
        if (type == "raw") {
          stats.push(data)
        } else if (type == "noshow") {
          log.warn("diffs not shown because files were too big")
        }
      })
      .on("error", (err) => reject(err))
      .on("cut", () => reject("diff too big to parse"))
      .on("end", () => resolve(into_file_paths(stats)))
  })

module.exports = {
  changed_files: changed_files
}
