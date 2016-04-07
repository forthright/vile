/// <reference path="lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var request : any = require("request")
var logger : Vile.Lib.Logger = require("./logger")
var _ = require("lodash")

var HOST = "vile.io"
var PROD_URL = `https://${HOST}`
var VILE_APP = process.env.VILE_APP || PROD_URL
var log = logger.create(HOST)

var commit = (issues, auth) =>
  new Bluebird((resolve, reject) => {
    request.post({
      url: `${VILE_APP}/commits`,
      form: {
        auth: {
          project: auth.project,
          email: auth.email,
          token: auth.token
        },
        issues: JSON.stringify(issues)
      }
    }, (err, httpResponse, body) => {
      if (err) {
        reject({error: err})
      } else {
        resolve(<any>{
          body: body,
          response: httpResponse
        })
      }
    })
  })

var padded_file_score = (score : number) =>
  (score < 100 ? " " : "") + String(score) + "%"

var log_summary = (post_json : any, verbose : boolean) => {
  // HACK
  let score : number = _.get(post_json, "score")
  let files : any[] = _.get(post_json, "files")
  let description : number = _.get(post_json, "description")
  let url : string = _.get(post_json, "url")

  if (verbose)
    _.each(files, (file : any) =>
      log.info(`${padded_file_score(_.get(file, "score"))} => ` +
               `${_.get(file, "path")}`))

  log.info()
  log.info(`Score: ${score}%`)
  log.info(description)
  log.info(url)
}


module.exports = {
  commit: commit,
  log: log_summary
}
