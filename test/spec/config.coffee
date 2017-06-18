fs = require "fs"
mimus = require "mimus"
config = mimus.require "./../../lib/config", __dirname, []
chai = require "./../helpers/sinon_chai"
yaml = mimus.get config, "yaml"
ConfigParseError = require "./../../lib/config/config_parse_error"
expect = chai.expect

describe "config", ->
  afterEach mimus.reset
  after mimus.restore

  beforeEach ->
    mimus.stub fs, "existsSync"
    mimus.stub fs, "readFileSync"

  describe ".load", ->
    afterEach ->
      mimus.set config, "conf", {}

    describe "by default", ->
      filepath = ".vile.yml"

      beforeEach ->
        fs.readFileSync
          .withArgs filepath, "utf-8"
          .returns "vile:\n  ignore:\n    - foo"

      describe "when .vile.yml does not exist", ->
        beforeEach ->
          fs.existsSync
            .withArgs filepath
            .returns false

        it "does not throw exception and sets conf to empty", ->
          config.load()
          expect(config.get()).to.eql {}

      describe "when .vile.yml exists", ->
        beforeEach ->
          fs.existsSync
            .withArgs filepath
            .returns true

        it "can load config from a .vile.yml file", ->
          expect(config.load())
            .to.eql vile: ignore: [ "foo" ]

        it "sets the config internally", ->
          config.load()
          expect(config.get())
            .to.eql vile: ignore: [ "foo" ]

    describe "custom file path", ->
      filepath = "foobar.yml"

      describe "when it exists", ->
        beforeEach ->
          fs.existsSync
            .withArgs filepath
            .returns true
          fs.readFileSync
            .withArgs filepath, "utf-8"
            .returns "vile:\n  ignore:\n    - foo"

        it "can load config from a file", ->
          expect(config.load(filepath))
            .to.eql vile: ignore: [ "foo" ]

        it "sets the config internally", ->
          config.load(filepath)
          expect(config.get())
            .to.eql vile: ignore: [ "foo" ]

      describe "when it does not exist", ->
        beforeEach ->
          fs.readFileSync
            .throws new Error()
          fs.existsSync
            .withArgs filepath
            .returns false

        it "explcitly throws an error", ->
          expect(->
            config.load(filepath)
          ).to.throw()

    describe "when an exception is thrown during load", ->
      filepath = ".vile.yml"
      err = new Error "foo"

      beforeEach ->
        fs.existsSync
          .withArgs filepath
          .returns true
        mimus.stub yaml, "safeLoad"
        yaml.safeLoad.throws err

      it "throws a ConfigParseError", ->
        try
          config.load filepath
        catch e
          expect(e).to.be.an.instanceof ConfigParseError
          expect(e.toString()).to.match /\.vile\.yml/
          expect(e.toString()).to.match /Error: foo/

        expect(config.get()).to.eql {}

  describe ".get_auth", ->
    beforeEach ->
      process.env.VILE_TOKEN = "test-token"
      process.env.VILE_PROJECT = "test-project"

    it "sets auth token data based on ENV", ->
      expect(config.get_auth())
        .to.eql token: "test-token", project: "test-project"
