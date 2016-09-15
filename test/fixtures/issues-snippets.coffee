module.exports = [
  {
    "type": "ok",
    "path": ".vile.yml"
  },
  {
    "type": "ok",
    "path": "lib\/foo.js"
  },
  {
    "type": "warning",
    "path": "lib\/index.js",
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
        "offset": 0,
        "line": 1,
        "text": "function punish(config) {",
        "ending": "\n"
      },
      {
        "offset": 26,
        "line": 2,
        "text": "  return [",
        "ending": "\n"
      },
      {
        "offset": 37,
        "line": 3,
        "text": "    {",
        "ending": "\n"
      },
      {
        "offset": 43,
        "line": 4,
        "text": "      type: \"warning\",",
        "ending": "\n"
      }
    ]
  },
  {
    "type": "duplicate",
    "path": "lib\/index.js",
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
          "path": "lib\/foo.js",
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
              "offset": 146,
              "line": 8,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "offset": 161,
              "line": 9,
              "text": "        start: {",
              "ending": "\n"
            },
            {
              "offset": 178,
              "line": 10,
              "text": "          line: 1,",
              "ending": "\n"
            },
            {
              "offset": 197,
              "line": 11,
              "text": "          character: 0",
              "ending": "\n"
            },
            {
              "offset": 220,
              "line": 12,
              "text": "        },",
              "ending": "\n"
            },
            {
              "offset": 231,
              "line": 13,
              "text": "        end: {",
              "ending": "\n"
            },
            {
              "offset": 246,
              "line": 14,
              "text": "          line: 2,",
              "ending": "\n"
            }
          ]
        },
        {
          "path": "lib\/index.js",
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
              "offset": 306,
              "line": 18,
              "text": "    },",
              "ending": "\n"
            },
            {
              "offset": 313,
              "line": 19,
              "text": "    {",
              "ending": "\n"
            },
            {
              "offset": 319,
              "line": 20,
              "text": "      type: \"duplicate\",",
              "ending": "\n"
            },
            {
              "offset": 344,
              "line": 21,
              "text": "      path: \"lib\/index.js\",",
              "ending": "\n"
            },
            {
              "offset": 372,
              "line": 22,
              "text": "      signature: \"snippet-2\",",
              "ending": "\n"
            },
            {
              "offset": 402,
              "line": 23,
              "text": "      where: {",
              "ending": "\n"
            },
            {
              "offset": 417,
              "line": 24,
              "text": "        start: { line: 4 },",
              "ending": "\n"
            },
            {
              "offset": 445,
              "line": 25,
              "text": "        end: { line: 6 }",
              "ending": "\n"
            },
            {
              "offset": 470,
              "line": 26,
              "text": "      },",
              "ending": "\n"
            },
            {
              "offset": 479,
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
