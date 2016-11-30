// vile.d.ts
// The go to definition for Vile data

declare namespace vile {
  // HACK: this should be bluebird, minilog, etc
  // ...trying to get compiler to work right..
  type Bluebird<T> = any

  // -------------------------------------------------
  // Issue
  //
  // Type defs for vile issue object creation
  //
  export interface Issue {
    type        : string;
    message?    : string;
    path?       : string;
    title?      : string;
    name?       : string;
    signature?  : string;
    commit?     : Commit;
    dependency? : Dependency;
    duplicate?  : Duplicate;
    security?   : Security;
    stat?       : Stat;
    coverage?   : Coverage;
    plugin?     : string;
    snippet?    : Snippet[];
    language?   : string;
    complexity? : Complexity;
    churn?      : Churn;
    where?      : IssueLocation;
  }

  export interface IssueLocation {
    start? : IssueLine;
    end?  : IssueLine;
  }

  export interface IssueLine {
    line?      : number;
    character? : number;
  }

  export type IssueList = Issue[]

  export type Complexity = number

  export type Churn = number

  export interface Snippet {
    line     : number;
    text     : string;
    ending?  : string;
  }

  // -------------------------------------------------
  // Commit
  //
  // Any sort of source control infomation (GIT, SVN, etc)
  //
  export interface Commit {
    sha?          : string;
    branch?       : string;
    message?      : string;
    committer?    : string;
    commit_date?  : string;
    author?       : string;
    author_date?  : string;
  }

  // -------------------------------------------------
  // Dependency
  //
  // Anything related to project dependencies
  //
  export interface Dependency {
    name     : string;
    current? : string;
    latest?  : string;
  }

  // -------------------------------------------------
  // Security
  //
  // Anything security related
  //
  export interface Security {
    package     : string;
    version?    : number;
    advisory?   : string;
    patched?    : string[];
    vulnerable? : string[];
    unaffected? : string[];
  }

  // -------------------------------------------------
  // Duplicate
  //
  // Anything related to duplicate/similar code
  //
  export interface Duplicate {
    locations: DuplicateLocations[]
  }

  export interface DuplicateLocations {
    path      : string;
    snippet?  : Snippet[];
    where?    : IssueLocation;
  }

  // -------------------------------------------------
  // Stat
  //
  // Anything related to file statistics
  //
  export interface Stat {
    size?     : number;
    loc?      : number;
    lines?    : number;
    comments? : number;
  }

  // -------------------------------------------------
  // Coverage
  //
  // Anything related to file test code coverage
  //
  export interface Coverage {
    total : number;
  }

  // -------------------------------------------------
  // Config
  //
  // Anything related to .vile.yml or plugin creation
  //

  export interface Plugin {
    punish : (
      config : PluginConfig
    ) => IssueList | Bluebird<IssueList>;
  }

  export interface PluginConfig {
    config?  : any;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  export interface PluginExecOptions {
    spinner? : boolean;
    format?  : string;
    combine? : string;
    dontpostprocess? : boolean;
    snippets? : boolean;
    scores? : boolean;
  }

  interface VileConfig {
    plugins? : PluginList;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  interface Auth {
    token : AuthToken;
    project : string;
  }

  export type AuthToken = string

  export type PluginList = string[]

  export type IgnoreList = string[]

  export type AllowList = string[]

  export type YMLConfig = any

  // -------------------------------------------------
  // Library API
  //
  // # in src/module_name.ts
  // module.exports = <Vile.Lib.ModuleName>{...}
  //

  export module API {
    export interface HTTPResponse {
      error?     : NodeJS.ErrnoException
      body?      : JSONResponse
      response?  : any
    }

    export interface JSONResponse {
      message : string;
      data?   : any;
    }
  }

  // TODO: remove Lib namespace
  export module Lib {
    export type PluginMap = {
      frameworks? : {
        [k : string] : string[] | string;
      }
      peer? : {
        [k : string] : {
          [pkg_manager : string] : string[] | string;
        }
      }
      langs? : {
        [k : string] : string[] | string;
      }
    }

    export interface PromiseEachFileOptions {
      read_data? : boolean;
    }

    export interface SpawnOptions {
      args? : string[];
      stdio? : string[];
    }

    export interface SpawnData {
      code   : number;
      stdout : string;
      stderr : string;
    }

    export interface PluginWorkerData {
      plugins : PluginList;
      config : YMLConfig;
    }

    export interface Config {
      load      : (f : string) => any;
      get       : () => any;
      get_auth  : () => Auth;
    }

    export interface Package {
      version : string;
    }

    export interface Plugin {
      exec : (
        p : PluginList,
        config : YMLConfig,
        opts : any
      ) => Bluebird<IssueList>;

      exec_plugin : (
        name : string,
        config : YMLConfig
      ) => Bluebird<any>;
    }

    export interface Index {
      exec   : (
        p : PluginList,
        config : YMLConfig,
        opts : any
      ) => Bluebird<IssueList>;
    }

    export interface Logger {
      quiet   : () => any;
      level   : (l : string) => any;
      create  : (l : string) => Minilog;
      default : () => any;
    }

    // TODO:mix app options
    export type CLIApp = any

    export interface CLIModule {
      create : (commander : any) => void
    }

    export interface Service {
      commit : (
        issues : IssueList,
        cli_time : number,
        auth : Auth
      ) => Bluebird<any>;

      commit_status : (
        commit_id : number,
        auth : Auth
      ) => Bluebird<any>;

      log : (
        post_json : any,
        verbose : boolean
      ) => void;
    }
  }
}
