fs = require "fs"
path = require "path"
Bluebird = require "bluebird"
mimus = require "mimus"
inquirer = require "inquirer"
chai = require "./../../../helpers/sinon_chai"
coverage = mimus.require(
  "./../../../../lib/cli/init/coverage", __dirname, [])
map = require "./../../../../lib/cli/init/map"
promise_stub = undefined
config = vile: plugins: []
expect = chai.expect

describe "cli/init/coverage", ->
  before ->
    promise_stub = { then: mimus.stub() }
    mimus.stub fs, "existsSync"
    mimus.stub inquirer, "prompt"

  beforeEach ->
    promise_stub.then.returns promise_stub
    config.vile.plugins = []

  after -> mimus.restore()

  afterEach -> mimus.reset()

  describe ".init", ->
    answers = undefined

    beforeEach ->
      answers = {}
      inquirer.prompt.returns new Bluebird (resolve, reject) ->
        resolve answers

    describe "without test dirs", ->
      beforeEach ->
        fs.existsSync.returns false

      it "does nothing and passes back the config", ->
        coverage.init(config)
          .should.eventually.eql config

    describe "with test dir", ->
      [
        "coverage"
        "test"
        "spec"
      ].forEach (dir) ->
        describe dir, ->
          beforeEach ->
            fs.existsSync
              .withArgs path.join(process.cwd(), dir)
              .returns true

          it "calls with a prompt", (done) ->
            coverage.init(config).should.be.fulfilled.notify ->
              process.nextTick ->
                expect(inquirer.prompt).to.have.been
                  .calledWith [
                    type: "confirm",
                    name: "ok_to_add",
                    message: "Looks like you have tests. Install plugin?",
                    default: true
                  ]
                done()
            return

          describe "when asking to install the coverage plugin", ->
            it "resolves the config", ->
              coverage.init(config).should.eventually
                .eql config

            describe "on yes", ->
              beforeEach ->
                answers.ok_to_add = true

              it "adds coverage plugins", (done) ->
                coverage.init(config).then (con) ->
                  process.nextTick ->
                    expect(config.vile.plugins).to.eql [ "coverage" ]
                    done()
                return

            describe "on no", ->
              beforeEach ->
                answers.ok_to_add = false

              it "does not add any plugins", (done) ->
                coverage.init(config).then (con) ->
                  process.nextTick ->
                    expect(config.vile.plugins).to.eql []
                    done()
                return
