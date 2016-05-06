/// <reference path="lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var request : any = require("request")
var logger : Vile.Lib.Logger = require("./logger")
var _ = require("lodash")

var HOST = "vile.io"
var PROD_URL = `https://${HOST}`
var API_TARGET = "api/v0"
var VILE_APP = process.env.VILE_APP || PROD_URL
var log = logger.create(HOST)

var http_authentication = (auth_token : string) : any => {
  return { "Authorization": `Token token=${auth_token}` }
}

var api_path = (endpoint : string) : string =>
  `${VILE_APP}/${API_TARGET}/${endpoint}`

var handle_response = (resolve, reject) =>
  (err, response, body : Vile.Lib.JsonApiResponse) =>
    err ?
      reject({error: err}) :
      resolve(<any>{
        body: body,
        response: response
      })

var commit = (
  issues : any[],
  cli_time : number,
  auth : any
) =>
  new Bluebird((resolve, reject) => {
    let url = api_path(`${auth.project}/commits`)
    log.debug(`POST ${url}`)
    request.post({
      url: url,
      headers: http_authentication(auth.token),
      form: {
        issues: JSON.stringify(issues),
        cli_time: cli_time
      }
    },
    handle_response(resolve, reject))
  })

var commit_status = (
  commit_id : number,
  auth : any
) =>
  new Bluebird((resolve, reject) => {
    let url = api_path(`${auth.project}/commits/${commit_id}/status`)
    log.debug(`GET ${url}`)
    request.get({
      url: url,
      headers: http_authentication(auth.token)
    },
    handle_response(resolve, reject))
  })

var padded_file_score = (score : number) =>
  (score < 100 ? " " : "") + String(score) + "%"

var log_summary = (post_json : any, verbose : boolean) => {
  let score : number = _.get(post_json, "score")
  let files : any[] = _.get(post_json, "files")
  let time : number = _.get(post_json, "time")
  let url : string = _.get(post_json, "url")
  let time_in_seconds : string = (time / 1000)
    .toFixed(2)
    .toString()
    .replace(/\.0*$/, "")

  if (verbose) {
    _.each(files, (file : any) =>
      log.info(
        `${padded_file_score(_.get(file, "score"))} => ` +
        `${_.get(file, "path")}`))
  }

  log.info()
  log.info(`Score: ${score}%`)
  log.info(`Time: ${time_in_seconds}s`)
  log.info(url)
}

module.exports = {
  commit: commit,
  commit_status: commit_status,
  log: log_summary
}
