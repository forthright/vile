request = require "request"
sinon = require "sinon"
mimus = require "mimus"
service = mimus.require "./../../lib/service", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect
log = mimus.get service, "log"

commit_status = require "./../fixtures/commit-status"
commit_status_id = 20
commit_status_api_url = "https://" +
  "ferretci.com/api/v0/projects/foo/commits/#{commit_status_id}/status"
commit_api_url = "https://ferretci.com/api/v0/projects/foo/commits"
server_response = mimus.stub()
api_body = mimus.stub()
server_error = mimus.stub()
issues = [{a: "b"}]
cli_time = 20
auth_info =
  project: "foo"
  token: "token"

describe "service", ->
  afterEach mimus.reset
  after mimus.restore

  before ->
    mimus.stub request, "post"
    mimus.stub request, "get"

  describe "constants", ->
    expect(service.API).to.eql
      COMMIT:
        FINISHED: "finished"
        PROCESSING: "processing"
        FAILED: "failed"

  describe ".commit", ->
    describe "on ok response", ->
      beforeEach ->
        request.post.callsArgWith(
          1,
          undefined,
          server_response,
          api_body)

      it "sets the correct request and data", (done) ->
        service.commit(issues, cli_time, auth_info)
          .should.be.fulfilled.notify ->
            expect(request.post).to.have.been
              .calledWith
                form: {
                  issues: JSON.stringify(issues),
                  cli_time: cli_time
                },
                url: commit_api_url
                headers: {
                  Authorization: "Token token=#{auth_info.token}"
                }
            done()
        return

      it "resolves with server data", ->
        service.commit(issues, cli_time, auth_info)
          .should.eventually.eql
            body: api_body
            response : server_response

    describe "on not ok response", ->
      beforeEach ->
        request.post.callsArgWith 1, server_error

      it "rejects with an error", ->
        service.commit(issues, cli_time, auth_info)
          .should.be.rejectedWith
            error: server_error

  describe ".commit_status", ->
    describe "on ok response", ->
      beforeEach ->
        request.get.callsArgWith(
          1,
          undefined,
          server_response,
          api_body)

      it "uses the correct api and auth", (done) ->
        service.commit_status(commit_status_id, auth_info)
          .should.be.fulfilled.notify ->
            expect(request.get).to.have.been
              .calledWith
                url: commit_status_api_url
                headers: {
                  Authorization: "Token token=#{auth_info.token}"
                }
            done()
        return

      it "resolves with server data", ->
        service.commit_status(commit_status_id, auth_info)
          .should.eventually.eql
            body: api_body
            response : server_response

    describe "on not ok response", ->
      beforeEach ->
        request.get.callsArgWith 1, server_error

      it "rejects with an error", ->
        service.commit_status(commit_status_id, auth_info)
          .should.be.rejectedWith
            error: server_error

  describe ".log", ->
    beforeEach ->
      mimus.stub log, "info"

    describe "logging base data", ->
      beforeEach ->
        service.log commit_status

      it "logs the score", ->
        expect(log.info).to.have.been
          .calledWith "Score: #{commit_status.score}%"

      it "logs the time", ->
        expect(log.info).to.have.been
          .calledWith "Time: 60s"

      it "logs the url", ->
        expect(log.info).to.have.been
          .calledWith commit_status.url

    describe "by default", ->
      beforeEach ->
        service.log commit_status

      it "logs file info", ->
        expect(log.info).not.to.have.been
          .calledWith " #{commit_status.files[0].score}%  " +
            "=> #{commit_status.files[0].path}"
        expect(log.info).not.to.have.been
          .calledWith " #{commit_status.files[1].score}% " +
            "=> #{commit_status.files[1].path}"
