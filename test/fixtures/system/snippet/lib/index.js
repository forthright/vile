function punish(config) {
  return [
    {
      type: "warning",
      path: "lib/index.js",
      message: "foo",
      signature: "snippet-1",
      where: {
        start: {
          line: 1,
          character: 0
        },
        end: {
          line: 2,
          character: 4
        }
      }
    },
    {
      type: "duplicate",
      path: "lib/index.js",
      signature: "snippet-2",
      where: {
        start: { line: 4 },
        end: { line: 6 }
      },
      duplicate: {
        locations: [
          {
            path: "lib/index.js",
            where: {
              start: { line: 10 },
              end: { line: 12 }
            }
          }
        ]
      }
    }
  ]
}

module.exports = {
  punish: punish
}
