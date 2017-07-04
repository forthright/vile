// vile.d.ts
// The go to definition for Vile data

/// <reference types="node" />
/// <reference types="bluebird" />

import * as Bluebird from "bluebird";
import * as commander from "commander";
import * as http from "http";

// Enable things like this:
// > const vile = require("vile")
// > let i : vile.Issue = vile.issue({ path: "foo", type: vile.ERR })
declare var vile : vile.Module.Index
export = vile;
export as namespace vile;

declare namespace vile {
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
  // TODO: don't pluralize
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
    language? : string;
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

  export type IgnoreList = string[] | string

  export type AllowList = string[] | string

  // TODO: try to flush out while supporting any key values?
  export type YMLConfig = any

  // -------------------------------------------------
  // Anything library/module related
  //
  // const vile : vile.Lib = require("vile")
  //

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

  export interface LoggerInstance {
    error : (...l : any[]) => void;
    error_issue : (...l : any[]) => void;
    info : (...l : any[]) => void;
    info_issue : (...l : any[]) => void;
    warn : (...l : any[]) => void;
    warn_issue :  (...l : any[]) => void;
  }

  export interface PluginWorkerData {
    plugins : PluginList;
    config : YMLConfig;
  }

  export interface PluginExecOptions {
    spinner?           : boolean;
    format?            : string;
    combine?           : string;
    dont_post_process? : boolean;
    skip_snippets?     : boolean;
    plugins?           : PluginList;
  }

  export interface CLIApp {
    combine?          : string;
    config?           : string;
    decorations       : boolean;
    dontPostProcess?  : boolean
    format?           : string;
    gitDiff           : string;
    issueLog          : string;
    log?              : string;
    plugins           : PluginList;
    quiet?            : boolean;
    skipSnippets?     : boolean;
    spinner?          : boolean;
    terminalSnippets? : boolean;
    upload?           : string;
  }

  export interface CLIModule {
    create : (commander : commander.CommanderStatic) => void
  }

  export module Service {
    export interface HTTPResponse {
      error?     : NodeJS.ErrnoException
      body?      : JSONResponse
      response?  : http.IncomingMessage
    }

    export interface JSONResponse {
      message : string;
      data?   : CommitStatus | any;
    }

    export interface CommitStatus {
      score? : number;
      files? : CommitStatusFile[];
      time?  : number;
      url?   : string;
    }

    export interface CommitStatusFile {
      path?  : string;
      score? : number;
    }
  }

  export module Module {
    export interface Index extends Module.Plugin, Module.UtilMethods, Module.UtilKeyTypes {
      logger : Module.Logger;
      config : Module.Config;
    }

    export interface Config {
      load      : (f : string) => YMLConfig;
      get       : () => YMLConfig;
      get_auth  : () => Auth;
    }

    export interface Plugin {
      exec : (
        config : YMLConfig,
        opts?  : PluginExecOptions
      ) => Bluebird<IssueList>;

      exec_plugin : (
        name : string,
        config? : YMLConfig
      ) => Bluebird<IssueList>;
    }

    type PromiseEachParsedData = any;

    type RawIssueData = { [k : string]: any; }

    interface UtilKeyTypes {
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
      COV   :  IssueType.Cov;
    }

    interface UtilObjects {
      displayable_issues: IssueType.All[];
      warnings: IssueType.Warnings[];
      errors:   IssueType.Errors[];
      infos:    IssueType.Infos[];
    }

    interface UtilMethods {
      promise_each : (
        d : string,
        a : (f_or_d : string, i_d: boolean) => boolean,
        p : (p : string, data? : string) => PromiseEachParsedData,
        opts? : PromiseEachFileOptions
      ) => Bluebird<PromiseEachParsedData[]>;

      filter : (i : IgnoreList, a : AllowList) => (p : string) => boolean;

      issue        : (d : RawIssueData) => Issue;

      ignored      : (f : string, i : IgnoreList) => boolean;
      allowed      : (f : string, a : AllowList) => boolean;

      spawn        : (b : string, o? : SpawnOptions) => Bluebird<SpawnData>;
    }

    export interface Util extends UtilMethods, UtilObjects, UtilKeyTypes {}

    export interface Logger {
      create  : (p : string) => LoggerInstance;
      enable  : (c : boolean) => void;
      disable : () => void;
      level   : (l : string) => void;
    }
  }
}
