declare module "git-diff-tree" {
  interface Config {
    originalRev : string;
  }

  function git_diff_tree(
    repo_path : string,
    config : Config
  ) : NodeJS.ReadableStream;

  export = git_diff_tree
}
