declare module "npm-run-path" {
  type PATH = string;

  interface PathConfig {
    cwd : string;
    path : string;
  }

  function npm_run_path(c : PathConfig) : PATH;

  export = npm_run_path
}
