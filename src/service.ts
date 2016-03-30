/// <reference path="lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var request : any = require("request")

var PRODUCTON_URL = "https://vile.io"
var VILE_APP = process.env.VILE_APP || PRODUCTON_URL

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

module.exports = {
  commit: commit
}
