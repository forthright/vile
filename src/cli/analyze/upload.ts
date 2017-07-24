import _ = require("lodash")
import http = require("http")
import config = require("./../../config")
import service = require("./../../service")
import logger = require("./../../logger")
import CommitUploadError = require("./commit_upload_error")

const log = logger.create("vile.io")

const COMMIT_STATUS_INTERVAL_TIME = 2000 // 2s

const upload_error = (msg : string) : void => {
  throw new CommitUploadError(msg)
}

const wait_for = (ms : number, cb : (t : any) => void) => {
  const timer  = setInterval(() => {
    cb(timer)
  }, ms)
}

const wait_for_done_status_and_log = (
  commit_id : number | null,
  auth : vile.Auth
) => {
  wait_for(COMMIT_STATUS_INTERVAL_TIME, (timer) => {
    service
      .commit_status(commit_id, auth)
      .then((msg : http.IncomingMessage) => {
        const api_body : vile.Service.HTTPResponse = _.get(msg, "body")
        const response : vile.Service.JSONResponse = _.get(
          msg, "response", { message: null })

        const status_code = _.get(response, "statusCode")
        const body_json = _.attempt(
          JSON.parse.bind(null, api_body))
        const message = _.get(body_json, "message")
        const data = _.get(body_json, "data")

        if (status_code != 200) {
          clearInterval(timer)
          upload_error(
            `status: ${status_code}: ` +
            JSON.stringify(api_body))
        } else {
          log.info(`Commit ${commit_id} ${message}`)

          // TODO: handle when message is garbage (don't assume processing)
          if (message == service.API.COMMIT.FINISHED) {
            clearInterval(timer)
            service.log(data)
          } else if (message == service.API.COMMIT.FAILED) {
            clearInterval(timer)
            upload_error(JSON.stringify(data))
          }
        }
      })
  })
}

const commit = (
  issues : vile.IssueList,
  cli_time : number,
  opts : vile.CLIApp
) => {
  const auth = config.get_auth()

  // HACK: can pass in project via cli arg, or via env var
  if (_.isEmpty(auth.project)) auth.project = opts.upload

  return service
    .commit(issues, cli_time, auth)
    .then((msg : http.IncomingMessage) => {
      if (_.get(msg, "response.statusCode") != 200) {
        upload_error(_.get(msg, "body", "[no body]"))
      }

      const body_json = _.attempt(
        JSON.parse.bind(null, _.get(msg, "body", "{}")))
      const commit_state = _.get(body_json, "message")
      const commit_id = _.get(body_json, "data.commit_id", null)

      log.info(`Commit ${commit_id} ${commit_state}`)

      if (!commit_id) {
        upload_error("No commit uid was provided on commit. " +
                        "Can't check status.")
      } else if (!commit_state) {
        upload_error("No commit state was provided upon creation. " +
                        "Can't check status.")
      } else if (commit_state == service.API.COMMIT.FAILED) {
        upload_error("Creating commit state is failed.")
      } else {
        wait_for_done_status_and_log(commit_id, auth)
      }
    })
}

export = { commit }
