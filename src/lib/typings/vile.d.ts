/// <reference path="bluebird.d.ts" />

// vile.d.ts
// The go to definition for Vile data

declare module Vile {

  // -------------------------------------------------
  // Issue
  //
  // Type defs for vile issue object creation
  //
  export interface Issue {
    type        : string;
    path        : string;
    message     : string;
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
    complexity? : string;
    churn?      : string;
    where?      : IssueLocation;
  }

  export interface IssueLocation {
    start? : IssueLine;
    end?  : IssueLine;
  }

  export interface IssueLine {
    line       : number;
    character? : number;
  }

  export type IssueList = Issue[]

  export interface Snippet {
    line     : number;
    offset?  : number;
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
      config? : PluginConfig
    ) => IssueList | bluebird.Promise<IssueList>;
  }

  export interface PluginConfig {
    config?  : any;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  interface VileConfig {
    plugins? : PluginList;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  export type PluginList = string[]

  export type IgnoreList = string[]

  export type AllowList = string[]

  export type YMLConfig = any

  // -------------------------------------------------
  // Library API
  //
  // let vile    : Vile.Lib.Index   = require("vile")
  //
  // or...
  //
  // let vile    : Vile.Lib.Index   = require("./index")
  // let service : Vile.Lib.Service = require("./service")
  // let config  : Vile.Lib.Config  = require("./config")
  //

  export module Lib {
    export interface JsonApiResponse {
      message : string;
      data? : any;
    }

    export interface Config {
      load      : (f : string) => any;
      get       : () => any;
      get_auth  : () => any;
    }

    export interface Package {
      version : string;
    }

    export interface Index {
      exec   : (
        p : PluginList,
        config : YMLConfig,
        opts : any
      ) => bluebird.Promise<IssueList>;
    }

    export interface Logger {
      quiet   : () => any;
      level   : () => any;
      create  : (m ? : string) => any;
      verbose : (s : boolean) => void;
    }

    export interface Service {
      commit : (
        issues : IssueList,
        cli_time : number,
        auth : any
      ) => bluebird.Promise<any>;

      commit_status : (
        commit_id : number,
        auth : any
      ) => bluebird.Promise<any>;

      log : (
        post_json : any,
        verbose : boolean
      ) => void;
    }
  }
}
