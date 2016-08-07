mimus = require "mimus"
path = require "path"
git = mimus.require "./../../lib/git", __dirname, []
chai = require "./../helpers/sinon_chai"
sinon = require "sinon"
git_log = mimus.get git, "log"
git_repo_path = path.join(process.cwd(), ".git")
expect = chai.expect
git_diff_tree = undefined

describe "git", ->
  afterEach mimus.reset

  describe ".changed_files", ->
    stream = undefined

    beforeEach ->
      git_diff_tree = mimus.stub()
      mimus.set git, "git_diff_tree", git_diff_tree
      mimus.stub git_log, "warn"
      stream = on: mimus.stub()
      stream.on.returns stream
      git_diff_tree.returns stream

    describe "on error", ->
      beforeEach ->
        stream.on
          .withArgs("error")
          .callsArgWith(1, "some error")
          .returns stream

      it "rejects with the error", ->
        git.changed_files().should.be
          .rejectedWith "some error"

    describe "on cut", ->
      beforeEach ->
        stream.on
          .withArgs("cut")
          .callsArg(1)
          .returns stream

      it "rejects with a reason", ->
        git.changed_files().should.be
          .rejectedWith "diff too big to parse"

    describe "on end", ->
      beforeEach ->
        stream.on
          .withArgs("data")
          .callsArgWith(1, "raw", {
            toFile: "a", fromFile: "b", status: "R"
          })
          .returns stream
          .withArgs("end")
          .callsArg(1)
          .returns stream

      it "resolves with the changed files", ->
        git.changed_files().should.eventually.eql [ "a" ]

      describe "original_rev", ->
        it "uses --root by default", (done) ->
          git.changed_files().should.be.fulfilled.notify ->
            process.nextTick ->
              git_diff_tree.should.have.been
                .calledWith git_repo_path, { originalRev: "--root" }
              done()
          return

        it "uses custom one if given", (done) ->
          git.changed_files("master").should.be.fulfilled.notify ->
            process.nextTick ->
              git_diff_tree.should.have.been
                .calledWith git_repo_path, { originalRev: "master" }
              done()
          return

      describe "repo path", ->
        it "uses cwd by default", (done) ->
          git.changed_files().should.be.fulfilled.notify ->
            process.nextTick ->
              git_diff_tree.should.have.been
                .calledWith path.join(process.cwd(), ".git")
              done()
          return

        it "uses custom one if given", (done) ->
          git.changed_files(undefined, "foo").should.be.fulfilled.notify ->
            process.nextTick ->
              git_diff_tree.should.have.been
                .calledWith "foo"
              done()
          return

      describe "when a file has been deleted", ->
        beforeEach ->
          stream.on
            .withArgs("data")
            .callsArgWith(1, "raw", {
              toFile: "b", fromFile: "b", status: "D"
            })
            .returns stream
            .withArgs("end")
            .callsArg(1)
            .returns stream

        it "is not included in the list", ->
          git.changed_files().should.eventually.eql []

      describe "noshow", ->
        beforeEach ->
          stream.on
            .withArgs("data")
            .callsArgWith(1, "noshow")
            .returns stream
            .withArgs("end")
            .callsArg(1)
            .returns stream

        it "logs a warning", (done) ->
          git.changed_files().should.be.fulfilled.notify ->
            process.nextTick ->
              git_log.warn.should.have.been
                .calledWith "diffs not shown because files were too big"
              done()
          return
