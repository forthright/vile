/// <reference path="lib/typings/index.d.ts" />

module vile {

let Bluebird : typeof bluebird.Promise = require("bluebird")
let request : any = require("request")

const VILE_IO = "http://localhost:3000/commits"

let commit = (project, issues, email) =>
  new Bluebird((resolve, reject) => {
    request.post({
      url: VILE_IO,
      form: {
       project: project,
       issues: issues,
       email: email
      }
    }, (err, httpResponse, body) => {
      if (err) reject(err)
      resolve(body)
    })
  })

module.exports = {
  commit: commit
}

}
