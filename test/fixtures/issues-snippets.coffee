_ = require "lodash"

issues_snippets = [
  {
    "type": "ok",
    "path": ".vile.yml"
  },
  {
    "type": "ok",
    "path": "lib/foo.js"
  },
  {
    "message": "non-snippet issue"
    "path": "lib/index.js"
    "plugin": "test-snippet-plugin"
    "signature": "non-snippet-1"
    "type": "warning"
  },
  {
    "type": "warning",
    "path": "lib/bar",
    "message": "bar",
    "signature": "snippet-1",
    "where": {
      "start": {
        "line": 1,
        "character": 0
      },
      "end": {
        "line": 2,
        "character": 0
      }
    },
    "plugin": "test-snippet-plugin",
    "snippet": [
      {
        "line": 1,
        "text": "var s = \"possibly a text file\"",
        "ending": "\n"
      },
      {
        "line": 2,
        "text": "console.log(s)",
        "ending": "\n"
      }
    ]
  },
  {
    "type": "duplicate",
    "path": "lib/index.js",
    "signature": "snippet-2",
    "where": {
      "start": {
        "line": 4
      },
      "end": {
        "line": 6
      }
    },
    "duplicate": {
      "locations": [
        {
          "path": "lib/foo.js",
          "where": {
            "start": {
              "line": 10
            },
            "end": {
              "line": 12
            }
          },
          "snippet": [
            {
              "line": 8,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "line": 9,
              "text": "        start: {",
              "ending": "\n"
            },
            {
              "line": 10,
              "text": "          line: 1,",
              "ending": "\n"
            },
            {
              "line": 11,
              "text": "          character: 0",
              "ending": "\n"
            },
            {
              "line": 12,
              "text": "        },",
              "ending": "\n"
            },
            {
              "line": 13,
              "text": "        end: {",
              "ending": "\n"
            },
            {
              "line": 14,
              "text": "          line: 2,",
              "ending": "\n"
            }
          ]
        },
        {
          "path": "lib/index.js",
          "where": {
            "start": {
              "line": 20
            },
            "end": {
              "line": 25
            }
          },
          "snippet": [
            {
              "line": 18,
              "text": "    },",
              "ending": "\n"
            },
            {
              "line": 19,
              "text": "    {",
              "ending": "\n"
            },
            {
              "line": 20,
              "text": "      type: \"duplicate\",",
              "ending": "\n"
            },
            {
              "line": 21,
              "text": "      path: \"lib\/index.js\",",
              "ending": "\n"
            },
            {
              "line": 22,
              "text": "      signature: \"snippet-2\",",
              "ending": "\n"
            },
            {
              "line": 23,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "line": 24,
              "text": "        start: { line: 4 },",
              "ending": "\n"
            },
            {
              "line": 25,
              "text": "        end: { line: 6 }",
              "ending": "\n"
            },
            {
              "line": 26,
              "text": "      },",
              "ending": "\n"
            },
            {
              "line": 27,
              "text": "      duplicate: {",
              "ending": "\n"
            }
          ]
        }
      ]
    },
    "plugin": "test-snippet-plugin"
  }
]


issues_snippets = _.map issues_snippets, (issue) ->
  dupes = _.get(issue, "duplicate.locations", [])
  _.each dupes, (dupe) ->
    _.each dupe.snippet, (snippet) ->
      snippet.ending = '\n'
  _.each issue.snippet, (snippet) ->
    snippet.ending = '\n'
    snippet

  issue

module.exports = issues_snippets
