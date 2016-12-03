mimus = require "mimus"
chai = require "./../../helpers/sinon_chai"
expect = chai.expect
git = require "./../../../lib/git"
config = require "./../../../lib/config"
service = require "./../../../lib/service"
lib = require "./../../../lib"
cli_punish = mimus.require(
  "./../../../lib/cli/punish", __dirname, [])
service_log = mimus.get cli_punish, "service_log"
original_wait_for = mimus.get cli_punish, "wait_for"
fake_timer = {}
wait_for_stub = mimus.stub()
mimus.set cli_punish, "wait_for", wait_for_stub
cli_log = mimus.get cli_punish, "log"

git_changed_promise = undefined
service_commit_promise = undefined
service_commit_status_promise = undefined
commit_success_body = undefined
commit_success_data = undefined
commit_status_success_body = undefined
commit_status_success_data = undefined
commit_failure_body = undefined
commit_failure_data = undefined
commit_status_failure_body = undefined
commit_status_failure_data = undefined
clear_interval = undefined
commander = undefined
cli_cmd_args = undefined
auth_example = undefined
exec_issues = []

stub_log_and_exit = ->
  mimus.stub process, "exit"
  mimus.stub console, "error"
  mimus.stub console, "log"

restore_log_and_exit = ->
  process.exit.restore()
  console.error.restore()
  console.log.restore()

describe "cli/punish", ->
  beforeEach ->
    cli_cmd_args = []
    commander = {}
    auth_example = token: "abc", project: "foo"
    mimus.stub git, "changed_files"
    mimus.stub lib, "exec"
    lib_exec_promise = mimus.stub()
    catch_promise = mimus.stub()
    catch_promise.returns {
      then: lib_exec_promise,
      catch: catch_promise }
    lib_exec_promise.returns {
      then: lib_exec_promise,
      catch: catch_promise }
    lib_exec_promise.callsArgWith 0, exec_issues
    lib.exec.returns {
      then: lib_exec_promise,
      catch: catch_promise }
    commander.command = mimus.stub()
    commander.command.returns commander
    commander.alias = mimus.stub()
    commander.alias.returns commander
    commander.option = mimus.stub()
    commander.option.returns commander
    commander.action = mimus.stub()
    commander.action.returns commander
    commander.action.callsArgWith(0, cli_cmd_args, commander)

  afterEach -> mimus.reset()
  after -> mimus.restore()

  # HACK: we just pass through this in unit tests for easy of testing
  describe "wait_for private method", ->
    it "merely waits for a speificed ms then invokes cb", (done) ->
      t1 = new Date().getTime()
      original_wait_for 25, (timer) ->
        expect(timer).to.be.ok
        clearInterval timer
        t2 = new Date().getTime()
        expect(t2 - t1).to.be.within 25, 100 # slow VMs...
        done()
      return

  # TODO: these tests form a nest of horror- untangle modules
  describe "uploading a commit", ->
    beforeEach ->
      mimus.stub config, "get_auth"
      mimus.stub service, "commit"
      mimus.stub service, "commit_status"
      mimus.stub service, "log"
      mimus.stub cli_log, "error"
      mimus.stub service_log, "info"
      mimus.stub service_log, "error"

      clear_interval = mimus.stub()
      mimus.set cli_punish, "clearInterval", clear_interval
      wait_for_stub.callsArgWith 1, fake_timer
      config.get_auth.returns auth_example

      commander.upload = true

      # service.commit
      service_commit_promise = mimus.stub()
      service_commit_promise_catch = mimus.stub()
      service_commit_promise.returns { then: service_commit_promise }
      service.commit.returns { then: service_commit_promise }

      # service.commit_status
      service_commit_status_promise = mimus.stub()
      service_commit_status_promise_catch = mimus.stub()
      service_commit_status_promise.returns {
        then: service_commit_status_promise }
      service.commit_status.returns { then: service_commit_status_promise }

    describe "when commit (and its initial status) is returned", ->
      beforeEach ->
        commit_success_body = JSON.stringify({
          message: "processing",
          data: { commit_id: 2 }
        })
        commit_success_data =
          response: { statusCode: 200 },
          body: commit_success_body

        commit_status_success_body = JSON.stringify({
          message: "processing",
          data: { commit_id: 2 }
        })
        commit_status_success_data =
          response: { statusCode: 200 },
          body: commit_status_success_body

      describe "if data looks ok", ->
        describe "in general", ->
          beforeEach ->
            service_commit_promise.callsArgWith 0, commit_success_data
            cli_punish.create commander

          it "polls for done status", ->
            expect(wait_for_stub).to.have.been.calledWith 2000
            expect(service.commit_status).to.have.been.
              calledWith 2, auth_example

          it "logs the commit state as processing and continues to wait", ->
            expect(clear_interval).not.to.have.been.calledWith fake_timer
            expect(service.log).not.to.have.been.called
            expect(service_log.info).to.have.been
              .calledWith "Commit 2 processing"

        # commit_status start
        describe "if status is not 200", ->
          beforeEach ->
            service_commit_promise.callsArgWith 0, commit_success_data

          beforeEach ->
            commit_status_failure_body = JSON.stringify({
              message: "processing",
              data: {}
            })
            commit_status_failure_data = {
              response: { statusCode: 404 },
              body: commit_status_failure_body }
            service_commit_status_promise
              .callsArgWith 0, commit_status_failure_data

          it "logs body info and exits process", ->
            mimus.stub process, "exit"
            mimus.stub console, "error"
            mimus.stub console, "log"
            cli_punish.create commander
            expect(console.error).to.have.been
              .calledWith "http status:", 404
            expect(console.error).to.have.been
              .calledWith commit_status_failure_body
            process.exit.restore()
            console.error.restore()
            console.log.restore()

          it "clears the interval", ->
            stub_log_and_exit()
            cli_punish.create commander
            expect(clear_interval).to.have.been
              .calledWith fake_timer
            restore_log_and_exit()

        describe "if status is 200", ->
          beforeEach ->
            service_commit_promise.callsArgWith 0, commit_success_data

          describe "in general", ->
            beforeEach ->
              commit_status_success_body = JSON.stringify({
                message: "processing",
                data: {}
              })
              commit_status_success_data = {
                response: { statusCode: 200 },
                body: commit_status_success_body }
              service_commit_status_promise
                .callsArgWith 0, commit_status_success_data
              cli_punish.create commander

            it "logs the commit id and message", ->
              expect(service_log.info).to.have.been
                .calledWith "Commit 2 processing"

          describe "if commit is finished", ->
            beforeEach ->
              commit_status_success_body = JSON.stringify({
                message: "finished",
                data: {}
              })
              commit_status_success_data = {
                response: { statusCode: 200 },
                body: commit_status_success_body }
              service_commit_status_promise
                .callsArgWith 0, commit_status_success_data

            describe "not verbose logging", ->
              beforeEach ->
                commander.scores = false
                cli_punish.create commander

              it "clears the interval", ->
                expect(clear_interval).to.have.been.calledWith fake_timer

              it "logs the data", ->
                expect(service.log).to.have.been
                  .calledWith JSON.parse(commit_status_success_body).data, false

            describe "verbose logging", ->
              beforeEach ->
                commander.scores = true
                cli_punish.create commander

              it "is set via opts.scores", ->
                expect(service.log).to.have.been
                  .calledWith JSON.parse(commit_status_success_body).data, true

          describe "if commit failed", ->
            beforeEach ->
              commit_status_success_body = JSON.stringify({
                message: "failed",
                data: {}
              })
              commit_status_success_data = {
                response: { statusCode: 200 },
                body: commit_status_success_body }
              service_commit_status_promise
                .callsArgWith 0, commit_status_success_data

            it "mentions the commit has failed", ->
              stub_log_and_exit()
              cli_punish.create commander
              expect(service_log.info).to.have.been
                .calledWith "Commit 2 failed"
              restore_log_and_exit()

            it "clears the interval", ->
              stub_log_and_exit()
              cli_punish.create commander
              expect(clear_interval).to.have.been.calledWith fake_timer
              restore_log_and_exit()

            it "logs packet and exits process", ->
              stub_log_and_exit()
              cli_punish.create commander
              expect(console.error).to.have.been
                .calledWith JSON.parse(commit_status_success_body).data
              expect(process.exit).to.have.been.calledWith 1
              restore_log_and_exit()

      describe "when there is no commit id", ->
        beforeEach ->
          commit_success_body = JSON.stringify({
            message: "processing",
            data: {}
          })
          commit_success_data = {
            response: { statusCode: 200 },
            body: commit_success_body }

          service_commit_promise.callsArgWith 0, commit_success_data

        it "logs an error and exits process", ->
          stub_log_and_exit()

          cli_punish.create commander

          expect(console.error).to.have.been
            .calledWith(
              "No commit uid was provided on commit. " +
              "Can't check status.")
          expect(process.exit).to.have.been.calledWith 1

          restore_log_and_exit()

      describe "when there is no commit state", ->
        beforeEach ->
          commit_success_body = JSON.stringify({
            data: { commit_id: 2 }
          })
          commit_success_data = {
            response: { statusCode: 200 },
            body: commit_success_body }

          service_commit_promise.callsArgWith 0, commit_success_data

        it "logs an error and exits process", ->
          stub_log_and_exit()

          cli_punish.create commander

          err = "No commit state was provided upon creation. " +
            "Can't check status."
          expect(process.exit).to.have.been.calledWith 1
          expect(console.error).to.have.been.calledWith err

          restore_log_and_exit()

      describe "when commit state is failed", ->
        beforeEach ->
          commit_success_body = JSON.stringify({
            message: "failed",
            data: { commit_id: 2 }
          })
          commit_success_data = {
            response: { statusCode: 200 },
            body: commit_success_body }

          service_commit_promise.callsArgWith 0, commit_success_data

        it "logs an error and exits process", ->
          stub_log_and_exit()

          cli_punish.create commander

          err = "Creating commit state is failed."
          expect(console.error).to.have.been.calledWith err
          expect(process.exit).to.have.been.calledWith 1

          restore_log_and_exit()

      describe "when status code is non 200", ->
        beforeEach ->
          commit_failure_body = JSON.stringify({
            message: "processing",
            data: {}
          })
          commit_failure_data = {
            response: { statusCode: 404 },
            body: commit_failure_body }

          service_commit_promise.callsArgWith 0, commit_failure_data

        it "logs an error and nothing else", ->
          stub_log_and_exit()

          cli_punish.create commander

          expect(console.error).to.have.been
            .calledWith commit_failure_body
          expect(process.exit).to.have.been.calledWith 1
          expect(service.commit_status).to.not.have.been.called

          restore_log_and_exit()

  describe "when gitdiff is set", ->
    beforeEach ->
      cli_cmd_args.push "foo"
      git_changed_promise = { then: mimus.stub() }
      git_changed_promise.then.returns git_changed_promise
      git_changed_promise.then.callsArgWith 0, [ "foo" ]
      git.changed_files.returns git_changed_promise

    describe "with no rev", ->
      beforeEach ->
        commander.gitdiff = true
        cli_punish.create commander

      it "sets allow list to all files in latest commit", ->
        git.changed_files.should.have.been.calledWith()
        expect(commander.config.vile.allow).to.eql [ "foo" ]

    describe "with a custom rev", ->
      beforeEach ->
        commander.gitdiff = "master"
        cli_punish.create commander

      it "sets allow list to all files in rev", ->
        git.changed_files.should.have.been.calledWith("master")
        expect(commander.config.vile.allow).to.eql [ "foo" ]
