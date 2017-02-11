// vile.d.ts
// The go to definition for Vile data

/// <reference types="node" />
/// <reference types="bluebird" />
/// <reference types="minilog" />

// Unlike Minilog, these need to be explicitly pulled in?
import * as Bluebird from "bluebird";
import * as commander from "commander";

// So can freely reference vile.Issue, etc (type shows as 'Vile')
declare var vile : vile.Vile

// So main module import will have a typed function/property signature
export = vile;
export as namespace vile;

declare namespace vile {
  // Alias index.ts exports signature for compiler readability
  interface Vile extends Lib.Index {}

  // -------------------------------------------------
  // Issue
  //
  // Type defs for vile issue object creation
  //
  export interface Issue {
    type        : IssueType.All;
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

  export module IssueType {
    export type Ok    = "ok";
    export type Warn  = "warning";
    export type Styl  = "style";
    export type Main  = "maintainability";
    export type Comp  = "complexity";
    export type Churn = "churn";
    export type Dupe  = "duplicate";
    export type Dep   = "dependency";
    export type Err   = "error";
    export type Sec   = "security";
    export type Stat  = "stat";
    export type Scm   = "scm";
    export type Lang  = "lang";
    export type Cov   = "cov";

    export type Warnings = Warn | Styl | Main | Comp | Churn | Dupe | Dep

    export type Errors = Err | Sec

    export type Infos = Stat | Scm | Lang | Cov

    export type All = Ok | Warnings | Errors | Infos
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

    export interface Index extends Util, Plugin {
      logger : Logger;
    }

    export interface UtilKeyTypes {
      OK    :  IssueType.Ok;

      WARN  :  IssueType.Warn;
      STYL  :  IssueType.Styl;
      MAIN  :  IssueType.Main;
      COMP  :  IssueType.Comp;
      CHURN :  IssueType.Churn;
      DUPE  :  IssueType.Dupe;
      DEP   :  IssueType.Dep;

      ERR   :  IssueType.Err;
      SEC   :  IssueType.Sec;

      STAT  :  IssueType.Stat;
      SCM   :  IssueType.Scm;
      LANG  :  IssueType.Lang;
      COV   :  IssueType.Cov;
    }

    export type Spec = any; // TODO

    export interface UtilObjects {
      API: Spec;

      displayable_issues: IssueType.All[]; // TODO enforce/make uniq

      warnings: IssueType.Warnings[];
      errors:   IssueType.Errors[];
      infos:    IssueType.Infos[];
    }

    // TODO: flush out util method sigs
    export interface Util extends UtilObjects, UtilKeyTypes {
      promise_each : any;
      filter       : any;
      issue        : any;
      ignored      : any;
      allowed      : any;
      spawn        : any;
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
      create : (commander : commander.ICommand) => void
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
