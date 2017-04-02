mimus = require "mimus"
chai = require "./../../helpers/sinon_chai"
expect = chai.expect
map = require "./../../../lib/cli/init/map"
cli_init = mimus.require(
  "./../../../lib/cli/init", __dirname, [])
pre = mimus.get cli_init, "pre"
language = mimus.get cli_init, "language"
framework = mimus.get cli_init, "framework"
ignore = mimus.get cli_init, "ignore"
coverage = mimus.get cli_init, "coverage"
post = mimus.get cli_init, "post"

promise_stub = undefined
commander = undefined

describe "cli/init", ->
  beforeEach ->
    promise_stub = { then: mimus.stub() }
    promise_stub.then.returns promise_stub
    mimus.stub pre, "init"
    pre.init.returns promise_stub
    commander = {}
    commander.command = mimus.stub()
    commander.command.returns commander
    commander.alias = mimus.stub()
    commander.alias.returns commander
    commander.action = mimus.stub()
    commander.action.returns commander
    commander.action.callsArgWith(0, commander)

  afterEach -> mimus.reset()

  after -> mimus.restore()

  beforeEach ->
    pre.init
      .returns promise_stub

  describe ".create", ->
    beforeEach ->
      cli_init.create commander

    it "sets the command to init", ->
      expect(commander.command).to.have.been
        .calledWith "init"

    it "sets an alias of init", ->
      expect(commander.alias).to.have.been
        .calledWith "i"

    it "calls pre-init with a vile config base", ->
      expect(pre.init).to.have.been
        .calledWith {
          vile: {
            ignore: [],
            allow: [],
            plugins: map.frameworks.core
          }
        }

    describe "after pre-initializing", ->
      it "initializes ignore", ->
        expect(promise_stub.then).to.have.been
          .calledWith ignore.init

      it "initializes language", ->
        expect(promise_stub.then).to.have.been
          .calledWith language.init

      it "initializes framework", ->
        expect(promise_stub.then).to.have.been
          .calledWith framework.init

      it "initializes coverage", ->
        expect(promise_stub.then).to.have.been
          .calledWith coverage.init

      it "initializes post", ->
        expect(promise_stub.then).to.have.been
          .calledWith ignore.init
