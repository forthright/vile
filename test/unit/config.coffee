fs = require "fs"
mimus = require "mimus"
config = mimus.require "./../../lib/config", __dirname, []
chai = require "./../helpers/sinon_chai"
yaml = mimus.get config, "yaml"
expect = chai.expect

describe "config", ->
  afterEach mimus.reset
  after mimus.restore

  beforeEach ->
    mimus.stub fs, "readFileSync"

  describe ".load", ->
    filepath = ".vile.yml"

    beforeEach ->
      fs.readFileSync
        .withArgs filepath, "utf-8"
        .returns "vile:\n  ignore:\n    - foo"

    afterEach ->
      mimus.set config, "conf", {}

    it "can load config from a .vile.yml file", ->
      expect(config.load(filepath))
        .to.eql vile: ignore: [ "foo" ]

    it "sets the config internally", ->
      config.load(filepath)
      expect(config.get())
        .to.eql vile: ignore: [ "foo" ]

    describe "when an exception is thrown during load", ->
      beforeEach ->
        mimus.stub yaml, "safeLoad"
        yaml.safeLoad.throws new Error "foo"

      it "logs the error to stderr and exits process", ->
        mimus.stub console, "error"
        mimus.stub process, "exit"
        config.load filepath
        expect(config.get()).to.eql {}
        expect(process.exit).to.have.been.calledWith 1
        console.error.restore()
        process.exit.restore()

  describe ".get_auth", ->
    beforeEach ->
      process.env.VILE_TOKEN = "test-token"
      process.env.VILE_PROJECT = "test-project"

    it "sets auth token data based on ENV", ->
      expect(config.get_auth())
        .to.eql token: "test-token", project: "test-project"
