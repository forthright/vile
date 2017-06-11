/// <reference types="node" />

declare module "cross-spawn" {
  interface SpawnOptions {
    cwd?   : string;
    env?   : any;
    stdio? : any;
  }

  interface ChildProcess extends NodeJS.EventEmitter {
    stdout : NodeJS.EventEmitter;
    stderr : NodeJS.EventEmitter;
  }

  function cross_spawn(
    bin     : string,
    args?   : string[],
    config? : SpawnOptions
  ) : ChildProcess;

  export = cross_spawn
}
