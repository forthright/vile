/// <reference path="@types/index.d.ts" />

import git_diff_tree = require("git-diff-tree")
import path = require("path")
import _ = require("lodash")
import Bluebird = require("bluebird")
import logger = require("./logger")

const log = logger.create("git")

const into_file_paths = (gtd_raw : any[]) =>
  _.map(_.filter(gtd_raw,
    (raw : any) => _.get(raw, "status", "").toUpperCase() != "D"),
    (raw : any) => _.get(raw, "toFile"))

// TODO: clean up strings in this method
// TODO: upp the threshold for streams and diff size
const changed_files = (
  original_rev : string = "--root",
  repo_path : string = path.join(process.cwd(), ".git")
) : Bluebird<any> =>
  new Bluebird((resolve, reject) => {
    let stats : any[] = []

    git_diff_tree(repo_path, { originalRev: original_rev })
      .on("data", (type : string, data : any) => {
        switch(type) {
          case "raw":
            stats.push(data)
            break
          case "noshow":
            log.warn("diffs not shown because files were too big")
            break
        }
      })
      .on("error", (err) => reject(err))
      .on("cut", () => reject("diff too big to parse"))
      .on("end", () => resolve(into_file_paths(stats)))
  })

export = {
  changed_files: changed_files
}
