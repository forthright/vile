path = require "path"
_ = require "lodash"
yml = require "js-yaml"
fs = require "fs"
Bluebird = require "bluebird"
chai = require "chai"
rimraf = require "rimraf"
cli = require "./../helpers/system"
issues_snippets = require "./../fixtures/issues-snippets"
issues_combined = require "./../fixtures/issues-combined"
issues_not_combined = require "./../fixtures/issues-not-combined"
expect = chai.expect

CWD = process.cwd()
FIXTURES = path.join(
  __dirname, "..", "..", "test", "fixtures")
SYSTEM_TESTS = path.join(FIXTURES, "system")
SYNC_DIR  = path.resolve(path.join(SYSTEM_TESTS, "sync"))
ASYNC_DIR = path.resolve(path.join(SYSTEM_TESTS, "async"))
CMB_FILES_DIR = path.resolve(path.join(SYSTEM_TESTS, "combine_files"))
CLI_INIT_EMPTY_DIR = path.join SYSTEM_TESTS, "cli_init_empty"
CLI_INIT_IGNORES_DIR = path.join SYSTEM_TESTS, "cli_init_ignores"
CLI_INIT_LANGS_DIR = path.join SYSTEM_TESTS, "cli_init_langs"
PLUGIN_CHECK_DIR = path.join SYSTEM_TESTS, "plugin_check"
SNIPPET_DIR = path.join SYSTEM_TESTS, "snippet"
FILTER_IGNORE_DIR = path.join SYSTEM_TESTS, "filtering_ignore"
FILTER_ALLOW_DIR = path.join SYSTEM_TESTS, "filtering_allow"
FILTER_ALLOW_DIR_SINGLE_FILE = path
  .join SYSTEM_TESTS, "filtering_allow_single_file"
FILTER_ALLOW_DIR_VIA_CLI_ARGS = path
  .join SYSTEM_TESTS, "filtering_allow_via_cli_args"
LOGGING_DIR = path.join SYSTEM_TESTS, "logging"
SPAWN_DIR = path.join SYSTEM_TESTS, "spawn"
SPAWN_STDERR_DIR = path.join SYSTEM_TESTS, "spawn_stderr"
SPAWN_NON_ZERO_DIR = path.join SYSTEM_TESTS, "spawn_non_zero"
LOGGING_DIR = path.join SYSTEM_TESTS, "logging"
PLUGIN_EXCEPTION_DIR = path.join SYSTEM_TESTS, "err_plugin_exception"
PLUGIN_REJECT_DIR = path.join SYSTEM_TESTS, "err_plugin_reject"
PLUGIN_BAD_API_DIR = path.join SYSTEM_TESTS, "err_plugin_bad_api"
PLUGIN_INVALID_DATA_DIR = path.join SYSTEM_TESTS, "err_plugin_invalid_data"

SNIPPET_OUTPUT = fs.readFileSync(
  path.join(FIXTURES, "console-snippets.txt")).toString()

press =
  ENTER: '\x0D'
  SPACE: '\x20'
  UP: '\x1B\x5B\x41'
  DOWN: '\x1B\x5B\x42'

describe "system :: cli blackbox testing", ->
  afterEach -> process.chdir CWD

  it "can list help", (done) ->
    process.chdir SYNC_DIR

    cli.exec "-h", (stdout) ->
      expect(stdout).to.match /Usage\: vile \[options\] \[command\]/i
      done()

  describe "auth", ->
    beforeEach -> process.chdir SYNC_DIR

    it "just logs info about creating an account", (done) ->
      cli.exec "auth", (stdout) ->
        expect(stdout).to.match /To authenticate, first go to/i
        expect(stdout).to.match /then:/i
        expect(stdout).to.match /vile a \-u/i
        done()

  describe "init", ->
    describe "with an empty, fresh project", ->
      beforeEach ->
        process.chdir CLI_INIT_EMPTY_DIR

      afterEach (done) ->
        rimraf path.join(CLI_INIT_EMPTY_DIR, ".vile.yml"), (err) ->
          throw err if err
          rimraf path.join(CLI_INIT_EMPTY_DIR, "package.json"), (err) ->
            throw err if err
            rimraf path.join(CLI_INIT_EMPTY_DIR, "node_modules"), (err) ->
              throw err if err
              fs.writeFileSync(
                path.join(CLI_INIT_EMPTY_DIR, ".keep"), '', "utf-8")
              expect(fs.existsSync("package.json")).to.eql false
              expect(fs.existsSync(".vile.yml")).to.eql false
              done()

      it "can go through a default sequence", (done) ->
        answers = [
          [ /hello friend/i, [] ]
          [ /manually add paths/i, [ "y" ] ]
          [ /enter paths/i, [ "foo,bar" ] ]
          [ /frameworks and tooling/i, [] ]
          [ /look good/i, [ "y" ] ]
          [ /install required plugins/i, [ "n" ] ]
        ]

        proc = cli.exec_interactive "init",
          (question) ->
            match = _.find(answers, (answer) -> answer[0].test question)

            return if _.isEmpty match

            answers = _.reject(answers, (answer) -> answer == match)
            responses = match[1]
            #console.log "Q:", question
            #console.log "A:", responses.join(""), "ENTER"
            proc.stdin.write responses.join("") + press.ENTER
          ,
          (stdout, stderr, code) ->
            expect(code).to.eql 0
            expect(fs.existsSync("package.json")).to.eql true
            expect(fs.existsSync(".vile.yml")).to.eql true
            expect(yml.safeLoad(fs.readFileSync(".vile.yml")))
              .to.eql {
                vile: {
                  allow: []
                  ignore: [ "node_modules", "foo", "bar" ]
                }
              }
            expect(stdout).to.match /created: .vile.yml/i
            expect(stderr).to
              .match /skipping: npm install \-\-save\-dev npm\-check\-updates/i
            expect(stderr).to
              .match /skipping: npm install \-\-save\-dev vile/i
            expect(stdout).to.match /\'language\'/i
            expect(stdout).to.match /\'stat\'/i
            expect(stdout).to.match /\'ncu\'/i
            expect(stdout).to.match /looks like we are good to go/i
            expect(stdout).to.match /tips:/i
            expect(stdout).to.match /authenticate/i
            expect(stdout).to.match /upload/i
            expect(stdout).to.match /vile a/i
            expect(stdout).to.match /vile\.io/i
            expect(stdout).to
              .match /be sure to read up on your installed plugins/i
            done()

        return

    describe "with an empty, fresh project with specific languages", ->
      beforeEach ->
        process.chdir CLI_INIT_LANGS_DIR

      afterEach (done) ->
        rimraf path.join(CLI_INIT_LANGS_DIR, ".vile.yml"), (err) ->
          throw err if err
          rimraf path.join(CLI_INIT_LANGS_DIR, "package.json"), (err) ->
            throw err if err
            rimraf path.join(CLI_INIT_LANGS_DIR, "node_modules"), (err) ->
              throw err if err
              expect(fs.existsSync("package.json")).to.eql false
              expect(fs.existsSync(".vile.yml")).to.eql false
              done()

      it "has the expected directories ignore in .vile.yml", (done) ->
        answers = [
          [ /hello friend/i, [] ]
          [ /manually add paths/i, [ "n" ] ]
          [ /frameworks and tooling/i, [] ]
          [
            /It appears you speak our language/,
            [
              press.SPACE
              press.DOWN
              press.SPACE
              press.DOWN
              press.SPACE
            ]
          ]
          [ /Looks like you have tests/, [ "n" ] ]
          [ /look good/i, [ "y" ] ]
          [ /install required plugins and their peer dependencies/i, [ "n" ] ]
        ]

        cli_proc = cli.exec_interactive "init",
          (question) ->
            match = _.find(answers, (answer) -> answer[0].test question)

            return if _.isEmpty match

            answers = _.reject(answers, (answer) -> answer == match)
            responses = match[1]
            #console.log "Q:", question
            #console.log "A:", responses.join(""), "ENTER"
            cli_proc.stdin.write responses.join("") + press.ENTER
          ,
          (stdout, stderr, code) ->
            expect(code).to.eql 0
            expect(fs.existsSync("package.json")).to.eql true
            expect(fs.existsSync(".vile.yml")).to.eql true
            expect(stdout).to.match /created: .vile.yml/i
            expect(stdout).to.match /\'language\'/i
            expect(stdout).to.match /\'stat\'/i
            expect(stdout).to.match /\'escomplex\'/i
            expect(stdout).to.match /\'rubocop\'/i
            expect(stdout).to.match /\'rubycritic\'/i
            expect(stdout).to.match /\'tslint\'/i
            expect(stdout).to.match /\'retire\'/i
            expect(stdout).to.match /\'ncu\'/i
            expect(stderr).to
              .match /skipping: npm install \-\-save\-dev npm\-check\-updates/i
            expect(stderr).to
              .match /skipping: npm install \-\-save\-dev vile/i
            expect(stdout).to.match /looks like we are good to go/i
            done()

        return

    describe "with pre-existing ignorables and a .vile.yml", ->
      beforeEach ->
        process.chdir CLI_INIT_IGNORES_DIR

      afterEach (done) ->
        rimraf path.join(CLI_INIT_IGNORES_DIR, ".vile.yml"), (err) ->
          throw err if err
          rimraf path.join(CLI_INIT_IGNORES_DIR, "package.json"), (err) ->
            throw err if err
            rimraf path.join(CLI_INIT_IGNORES_DIR, "node_modules"), (err) ->
              throw err if err
              expect(fs.existsSync("package.json")).to.eql false
              expect(fs.existsSync(".vile.yml")).to.eql false
              fs.writeFileSync(
                path.join(CLI_INIT_IGNORES_DIR, ".vile.yml"), '', "utf-8")
              done()

      it "has the expected directories ignore in .vile.yml", (done) ->
        answers = [
          [ /hello friend/i, [] ]
          [ /found an existing \.vile\.yml/i, [ "y" ] ]
          [
            /Select any directories or files to ignore/i,
            [
              press.SPACE
              press.DOWN
              press.SPACE
              press.DOWN
              press.SPACE
              press.DOWN
              press.SPACE
              press.DOWN
              press.SPACE
            ]
          ]
          [ /manually add paths/i, [ "n" ] ]
          [ /frameworks and tooling/i, [] ]
          [ /Looks like you have tests/, [ "n" ] ]
          [ /look good/i, [ "y" ] ]
          [ /install required plugins and their peer dependencies/i, [ "n" ] ]
        ]

        cli_proc = cli.exec_interactive "init",
          (question) ->
            match = _.find(answers, (answer) -> answer[0].test question)

            return if _.isEmpty match

            answers = _.reject(answers, (answer) -> answer == match)
            responses = match[1]
            #console.log "Q:", question
            #console.log "A:", responses.join(""), "ENTER"
            cli_proc.stdin.write responses.join("") + press.ENTER
          ,
          (stdout, stderr, code) ->
            setTimeout ->
              expect(code).to.eql 0
              expect(fs.existsSync("package.json")).to.eql true
              expect(fs.existsSync(".vile.yml")).to.eql true
              expect(yml.safeLoad(fs.readFileSync(".vile.yml")))
                .to.eql {
                  vile: {
                    allow: []
                    ignore: [
                      "node_modules"
                      "coverage"
                      "tmp"
                      "vendor"
                    ]
                  }
                }
              expect(stdout).to.match /created: .vile.yml/i
              expect(stderr).to.match(
                /skipping: npm install \-\-save\-dev npm\-check\-updates/i)
              expect(stderr).to
                .match /skipping: npm install \-\-save\-dev vile/i
              expect(stdout).to.match /looks like we are good to go/i
              expect(stdout).to.match /tips:/i
              expect(stdout).to.match /authenticate/i
              expect(stdout).to.match /upload/i
              expect(stdout).to.match /vile a/i
              expect(stdout).to.match /vile\.io/i
              expect(stdout).to
                .match /be sure to read up on your installed plugins/i
              done()
            , 200

        return

  describe "punish", ->
    describe "combining files", ->
      beforeEach -> process.chdir CMB_FILES_DIR

      MAP = "-x src.ts:lib.js,diff_folder:diff_folder_rename"

      it "combines files", (done) ->
        cli.exec "a -n -d -f json #{MAP}", (stdout) ->
          expect(JSON.parse(stdout)).to
            .eql issues_combined
          done()

      it "does not combine files when not set", (done) ->
        cli.exec "a -n -d -f json", (stdout) ->
          expect(JSON.parse(stdout)).to
            .eql issues_not_combined
          done()

    describe "log level", ->
      beforeEach -> process.chdir SYNC_DIR

      it "can set the log level to error", (done) ->
        cli.exec "a -n -l error", (stdout) ->
          expect(stdout).not.to.match /test\-sync\-plugin\:start/i
          expect(stdout).not.to.match /test\-sync\-plugin\:finish/i
          done()

      it "can set the log level to warn", (done) ->
        cli.exec "a -n -l warn", (stdout) ->
          expect(stdout).not.to.match /test\-sync\-plugin\:start/i
          expect(stdout).not.to.match /test\-sync\-plugin\:finish/i
          done()

      it "can set the log level to info", (done) ->
        cli.exec "a -n -l info", (stdout) ->
          expect(stdout).to.match /test\-sync\-plugin\:start/i
          expect(stdout).to.match /test\-sync\-plugin\:finish/i
          done()

    describe "sync plugins", ->
      beforeEach -> process.chdir SYNC_DIR

      it "seems to run the plugin successfully", (done) ->
        cli.exec "analyze", (stdout) ->
          expect(stdout).to.match /test\-sync\-plugin\:start/i
          expect(stdout).to.match /test\-sync\-plugin\:finish/i
          done()

      describe "with post processing", ->
        it "returns a list of issues", (done) ->
          cli.exec "a -n -f json", (stdout) ->
            issues = JSON.parse(stdout)
            expect(issues.length).to.eql 2
            expect(issues[0]).to.eql {
              type: "ok", path: ".vile.yml"
            }
            expect(issues[1]).to.eql {
              type: "warning",
              signature: "sync",
              plugin: "test-sync-plugin"
            }
            done()

      describe "without post processing", ->
        it "does not include any ok issues", (done) ->
          cli.exec "a -d -f json", (stdout) ->
            expect(stdout).to.eql JSON.stringify([
              {
                type: "warning",
                signature: "sync",
                plugin: "test-sync-plugin"
              }
            ])
            done()

    describe "async plugins", ->
      beforeEach -> process.chdir ASYNC_DIR

      it "seems to run the plugin successfully", (done) ->
        cli.exec "analyze", (stdout) ->
          expect(stdout).to.match /test\-async\-plugin\:start/i
          expect(stdout).to.match /test\-async\-plugin\:finish/i
          done()

      describe "with post processing", ->
        it "returns a list of issues", (done) ->
          cli.exec "a -n -f json", (stdout) ->
            issues = JSON.parse(stdout)
            expect(issues.length).to.eql 3
            expect(issues[0]).to.eql {
              type: "ok", path: ".vile.yml"
            }
            expect(issues[1]).to.eql {
              type: "warning",
              signature: "async",
              plugin: "test-async-plugin"
            }
            expect(issues[2]).to.eql {
              type: "test",
              signature: "async",
              plugin: "test-async-plugin"
            }
            done()

      describe "without post processing", ->
        it "does not include any ok issues", (done) ->
          cli.exec "a -n -d -f json", (stdout) ->
            expect(stdout).to.eql JSON.stringify([
              {
                type: "warning",
                signature: "async",
                plugin: "test-async-plugin"
              }
              {
                type: "test",
                signature: "async",
                plugin: "test-async-plugin"
              }
            ])
            done()

    describe "filtering and checking for installed plugins", ->
      beforeEach -> process.chdir PLUGIN_CHECK_DIR

      it "can run only one plugin", (done) ->
        cli.exec "a -p test-plugin-check-plugin-two -n -d -f json", (stdout) ->
          expect(stdout).to.eql JSON.stringify([
            {
              type: "warning",
              signature: "two",
              plugin: "test-plugin-check-plugin-two"
            }
          ])
          done()

      it "will exit and mention if a plugin is not installed", (done) ->
        cli.exec_err "a -p three", (stdout, stderr, code) ->
          expect(stderr).to.match /three is not installed/
          expect(code).to.eql 1
          done()

    describe "code snippets", ->
      beforeEach -> process.chdir SNIPPET_DIR

      describe "without any extra options", ->
        it "appends code snippets to code", (done) ->
          cli.exec "a -n -f json", (stdout) ->
            expect(JSON.parse(stdout)).to.eql issues_snippets
            done()

      describe "when --skipsnippets", ->
        it "does not include snippets", (done) ->
          cli.exec "a -n -s -f json", (stdout) ->
            expect(JSON.parse(stdout)).to.not.match /snippet/
            done()

      describe "when --dontpostprocess", ->
        it "does not include snippets", (done) ->
          cli.exec "a -n -d -f json", (stdout) ->
            expect(JSON.parse(stdout)).to.not.match /snippet/
            done()

      describe "logging to the terminal", ->
        describe "with color", ->
          # TODO: look into why this color output is lost?
          it "logs as expected", (done) ->
            cli.exec_err "a -t", (stdout, stderr, code) ->
              expect(code).to.eql 0
              expect(stderr)
                .to.eql "cli warn highlighting failed for lib/bar:\n"
              expect(stdout).to.match /24\:         start\: \{ line\: 4 \}\,/
              done()

        describe "without color", ->
          it "logs as expected", (done) ->
            cli.exec_err "a -t -n", (stdout, stderr, code) ->
              expect(code).to.eql 0
              expect(stderr).to.eql ""
              expect(stdout).to.eql SNIPPET_OUTPUT
              done()

    describe "filtering via ignore", ->
      beforeEach -> process.chdir FILTER_IGNORE_DIR

      it "returns a list of filtered issues", (done) ->
        cli.exec "a -n -d -f json", (stdout) ->
          expect(stdout).to.eql JSON.stringify([
            {
              type: "warning",
              path: "src/bar.js",
              plugin: "test-filtering-ignore-plugin"
            }
            {
              type: "warning",
              path: "src/foo.js",
              plugin: "test-filtering-ignore-plugin"
            }
            {
              type: "warning",
              path: "test.js",
              plugin: "test-filtering-ignore-plugin"
            }
          ])
          done()

    describe "filtering via allow", ->
      describe "via cli args", ->
        beforeEach -> process.chdir FILTER_ALLOW_DIR_VIA_CLI_ARGS

        it "returns a list of filtered issues", (done) ->
          cli.exec "a -n -d -f json src", (stdout) ->
            expect(stdout).to.eql JSON.stringify([
              {
                type: "error",
                path: "src/bar.js",
                plugin: "test-filtering-allow-via-cli-args-plugin"
              }
              {
                type: "error",
                path: "src/foo.js",
                plugin: "test-filtering-allow-via-cli-args-plugin"
              }
              {
                type: "error",
                path: "src/sub/bar.js",
                plugin: "test-filtering-allow-via-cli-args-plugin"
              }
            ])
            done()

      describe "via .vile.yml", ->
        beforeEach -> process.chdir FILTER_ALLOW_DIR

        it "returns a list of filtered issues", (done) ->
          cli.exec "a -n -d -f json", (stdout) ->
            expect(stdout).to.eql JSON.stringify([
              {
                type: "error",
                path: "src/bar.js",
                plugin: "test-filtering-allow-plugin"
              }
              {
                type: "error",
                path: "src/foo.js",
                plugin: "test-filtering-allow-plugin"
              }
              {
                type: "error",
                path: "src/sub/bar.js",
                plugin: "test-filtering-allow-plugin"
              }
            ])
            done()

      describe "when a list item is within a directory", ->
        beforeEach -> process.chdir FILTER_ALLOW_DIR_SINGLE_FILE

        it "returns a list of filtered issues", (done) ->
          cli.exec "a -n -d -f json src/sub/bar.js", (stdout) ->
            expect(stdout).to.eql JSON.stringify([
              {
                type: "error",
                path: "src/sub/bar.js",
                plugin: "test-filtering-allow-single-file-plugin"
              }
            ])
            done()

    describe "spawning a file that returns data", ->
      beforeEach -> process.chdir SPAWN_DIR

      it "returns a list of issues", (done) ->
        cli.exec "analyze -n -d -f json", (stdout) ->
          expect(stdout).to.eql JSON.stringify([
            {
              type: "error",
              path: "filename.rb",
              plugin: "test-spawn-plugin"
            }
          ])
          done()
        return

    describe "spawning a file that exits with non zero status", ->
      beforeEach -> process.chdir SPAWN_NON_ZERO_DIR

      it "finishes gracefully", (done) ->
        cli.exec_err "a -n -d", (stdout, stderr, code) ->
          expect(stderr).to.eql ""
          expect(code).to.eql 0
          expect(stdout).to.match /code is: 10/
          expect(stdout)
            .to.match new RegExp("test-spawn-non-zero-plugin:start")
          expect(stdout)
            .to.match new RegExp("test-spawn-non-zero-plugin:finish")
          done()
        return

    describe "spawning a file that logs to stderr", ->
      beforeEach -> process.chdir SPAWN_STDERR_DIR

      it "must manually log any stderr", (done) ->
        cli.exec_err "a -n -d", (stdout, stderr, code) ->
          expect(code).to.eql 0
          expect(stderr).to.match new RegExp("OH NO!")
          expect(stdout).to.match new RegExp("test-spawn-stderr-plugin:start")
          expect(stdout).to.match new RegExp("test-spawn-stderr-plugin:finish")
          done()

        return

    describe "when a plugin (worker) has unhandled rejection", ->
      beforeEach -> process.chdir PLUGIN_REJECT_DIR

      it "logs to stderr and exits (1) process", (done) ->
        cli.exec_err "a -n", (stdout, stderr, code) ->
          expect(stderr).to.match /unhandled Promise\.reject/ig
          expect(stderr).to.match /Error: huzzah!/ig
          expect(stderr).to
            .match new RegExp("vile-test-err-plugin-reject-plugin " +
            "worker exited", "ig")
          expect(code).to.eql 1
          done()

    describe "when a plugin throws a synchronous error", ->
      beforeEach -> process.chdir PLUGIN_EXCEPTION_DIR

      it "logs to stderr and exits (1) process", (done) ->
        cli.exec_err "a -n", (stdout, stderr, code) ->
          expect(stderr).to.match /Error: huzzah!/ig
          expect(stderr).to.match /at Object\.punish/ig
          expect(stderr).to
            .match new RegExp("vile-test-err-plugin-exception-plugin " +
            "worker exited", "ig")
          expect(code).to.eql 1
          done()

    describe "when a plugin has an invalid api", ->
      beforeEach -> process.chdir PLUGIN_BAD_API_DIR

      it "logs to stderr and exits (1) process", (done) ->
        cli.exec_err "a -n", (stdout, stderr, code) ->
          expect(stderr).to.match /invalid plugin API/ig
          expect(stderr).to
            .match new RegExp("vile-test-err-plugin-bad-api-plugin " +
            "worker exited", "ig")
          expect(code).to.eql 1
          done()

    describe "when a plugin returns bad data", ->
      beforeEach -> process.chdir PLUGIN_INVALID_DATA_DIR

      it "logs an empty array of issues", (done) ->
        cli.exec_err "a -n -d -f json", (stdout, stderr, code) ->
          expect(stdout).to.eql "[]"
          done()

      it "logs to stderr and exits (0) process", (done) ->
        cli.exec_err "a -n", (stdout, stderr, code) ->
          expect(_.trim(stderr))
            .to.eql "plugin warn test-err-plugin-invalid-data-" +
                    "plugin plugin did not return [] or Promise<[]>"
          expect(stdout).to
            .match new RegExp("test-err-plugin-invalid-data-plugin:start")
          expect(stdout).to
            .match new RegExp("test-err-plugin-invalid-data-plugin:finish")
          expect(code).to.eql 0
          done()

    describe "logging real issues", ->
      beforeEach -> process.chdir LOGGING_DIR

      it "logs the output to console as syntastic output", (done) ->
        cli.exec "a -n -d -f syntastic", (stdout) ->
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: W: a title header => warning msg", "gi"))
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: W: maintainability msg", "gi"))
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: W: undefined", "gi"))
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: W: undefined", "gi"))
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: E: error msg", "gi"))
          expect(stdout).to.match(
            new RegExp("a.ext:1:1: E: sec msg => undefined", "gi"))
          done()
        return

      it "logs the output to console", (done) ->
        cli.exec "analyze -n -d", (stdout) ->
          expect(stdout).to.match(
            new RegExp("plugin info test-logging-plugin:start", "gi"))
          expect(stdout).to.match(
            new RegExp("warning warn a.ext: line 1-2, a " +
              "title header => warning msg", "gi"))
          expect(stdout).to.match(new RegExp(
            "maintainability warn a.ext: line 1-2, col 1, maintainability msg",
            "gi"
          ))
          expect(stdout).to.match(
            new RegExp("complexity info a.ext: 100", "gi"))
          expect(stdout).to.match new RegExp("churn info a.ext: 50", "gi")
          expect(stdout).to.match(
            new RegExp("duplicate warn a.ext: Similar code in a.ext", "gi"))
          expect(stdout).to.match(
            new RegExp(
              "dependency warn New release for dep: 0.0.1 < 0.1.0",
              "gi"
            ))
          expect(stdout).to.match(
            new RegExp("error error a.ext: error msg", "gi"))
          expect(stdout).to.match(
            new RegExp("security error a.ext: sec msg => undefined", "gi"))
          expect(stdout).to.match(
            new RegExp(
              "0\.097KB.*100 lines\, 80 loc\, 3 comments",
              "gi"
            ))
          expect(stdout).to.match new RegExp("lang info a.ext: ruby", "gi")
          expect(stdout).to.match new RegExp("scm info sha: commit_date", "gi")
          expect(stdout).to.match(
            new RegExp("cov info a.ext: 90% lines covered", "gi"))
          expect(stdout).to.match new RegExp("ok info b.ext", "gi")
          expect(stdout).to.match(
            new RegExp("plugin info test-logging-plugin:finish", "gi"))
          done()
        return
