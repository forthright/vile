module.exports = [
  {
    type: "error"
    signature: "ts-one"
    path: "src/foo.ts"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "error"
    signature: "js-one"
    path: "src/foo.ts"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "error"
    signature: "diff-folder"
    path: "diff_folder/foo.js"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "error"
    signature: "diff-folder-rename"
    path: "diff_folder/foo.js"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "lang"
    signature: "diff-folder-lang"
    path: "diff_folder/foo.js"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "stat"
    signature: "diff-folder-stat"
    path: "diff_folder/foo.js"
    plugin: "test-combine-files-plugin"
  }
  {
    type: "complexity"
    signature: "diff-folder-comp"
    path: "diff_folder/foo.js"
    plugin: "test-combine-files-plugin"
  }
]
