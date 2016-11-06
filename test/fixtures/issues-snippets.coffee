os = require "os"
_ = require "lodash"
on_win = !!os.platform().match(/win/i)

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
    "type": "warning",
    "path": "lib/index.js",
    "message": "foo",
    "signature": "snippet-1",
    "where": {
      "start": {
        "line": 1,
        "character": 0
      },
      "end": {
        "line": 2,
        "character": 4
      }
    },
    "plugin": "test-snippet-plugin",
    "snippet": [
      {
        "offset": if on_win then 0 else 0,
        "line": 1,
        "text": "function punish(config) {",
        "ending": "\n"
      },
      {
        "offset": if on_win then 27 else 26,
        "line": 2,
        "text": "  return [",
        "ending": "\n"
      },
      {
        "offset": if on_win then 39 else 37,
        "line": 3,
        "text": "    {",
        "ending": "\n"
      },
      {
        "offset": if on_win then 46 else 43,
        "line": 4,
        "text": "      type: \"warning\",",
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
              "offset": if on_win then 153 else 146,
              "line": 8,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "offset": if on_win then 169 else 161,
              "line": 9,
              "text": "        start: {",
              "ending": "\n"
            },
            {
              "offset": if on_win then 187 else 178,
              "line": 10,
              "text": "          line: 1,",
              "ending": "\n"
            },
            {
              "offset": if on_win then 207 else 197,
              "line": 11,
              "text": "          character: 0",
              "ending": "\n"
            },
            {
              "offset": if on_win then 231 else 220,
              "line": 12,
              "text": "        },",
              "ending": "\n"
            },
            {
              "offset": if on_win then 243 else 231,
              "line": 13,
              "text": "        end: {",
              "ending": "\n"
            },
            {
              "offset": if on_win then 259 else 246,
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
              "offset": if on_win then 323 else 306,
              "line": 18,
              "text": "    },",
              "ending": "\n"
            },
            {
              "offset": if on_win then 331 else 313,
              "line": 19,
              "text": "    {",
              "ending": "\n"
            },
            {
              "offset": if on_win then 338 else 319,
              "line": 20,
              "text": "      type: \"duplicate\",",
              "ending": "\n"
            },
            {
              "offset": if on_win then 364 else 344,
              "line": 21,
              "text": "      path: \"lib\/index.js\",",
              "ending": "\n"
            },
            {
              "offset": if on_win then 393 else 372,
              "line": 22,
              "text": "      signature: \"snippet-2\",",
              "ending": "\n"
            },
            {
              "offset": if on_win then 424 else 402,
              "line": 23,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "offset": if on_win then 440 else 417,
              "line": 24,
              "text": "        start: { line: 4 },",
              "ending": "\n"
            },
            {
              "offset": if on_win then 469 else 445,
              "line": 25,
              "text": "        end: { line: 6 }",
              "ending": "\n"
            },
            {
              "offset": if on_win then 495 else 470,
              "line": 26,
              "text": "      },",
              "ending": "\n"
            },
            {
              "offset": if on_win then 505 else 479,
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
      snippet.ending = if on_win then '\r\n' else '\n'
  _.each issue.snippet, (snippet) ->
    snippet.ending = if on_win then '\r\n' else '\n'
    snippet

  issue

module.exports = issues_snippets
