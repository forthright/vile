// ferret.d.ts
// The go to definition for Ferret data

/// <reference types="node" />
/// <reference types="bluebird" />

import * as Bluebird from "bluebird";
import * as commander from "commander";
import * as http from "http";

// Enable things like this:
// > const ferret = require("ferret")
// > let i : ferret.Data = ferret.data({ path: "foo", type: ferret.ERR })
declare var ferret : ferret.Module.Index
export = ferret;
export as namespace ferret;

declare namespace ferret {
  // -------------------------------------------------
  // Data
  //
  // Type defs for ferret data object creation
  //
  export interface Data {
    type        : DataType.All;
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
    where?      : DataLocation;
  }

  export interface DataLocation {
    start? : DataLine;
    end?  : DataLine;
  }

  export interface DataLine {
    line?      : number;
    character? : number;
  }

  export type DataList = Data[]

  export type Complexity = number

  export type Churn = number

  export interface Snippet {
    line     : number;
    text     : string;
    ending?  : string;
  }

  export type Context = ContextType.All[]

  export module ContextType {
    export type Ruby         = "ruby";
    export type TypeScript   = "typescript";
    export type JavaScript   = "javascript";
    export type CoffeeScript = "coffeescript";
    export type Haskell      = "haskell";
    export type Rails        = "rails";

    export type All = Ruby | TypeScript | JavaScript | CoffeeScript | Haskell | Rails
  }

  export module DataType {
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
    where?    : DataLocation;
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
  // Anything related to .ferret.yml or plugin creation
  //

  export interface Plugin {
    punish : (
      config : PluginConfig
    ) => DataList | Bluebird<DataList>;
  }

  export interface PluginConfig {
    config?  : any;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  interface FerretConfig {
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
  // const ferret : ferret.Module.Index = require("ferret")
  //

  export type PluginMap = {
    frameworks? : {
      [k : string] : string[] | string;
    }
    ignore? : IgnoreList;
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
    skip_core_plugins? : boolean
    skip_snippets?     : boolean;
    plugins?           : PluginList;
    additional_plugins? : PluginList;
  }

  export interface CLIApp {
    combine?            : string;
    config?             : string;
    decorations         : boolean;
    dontPostProcess?    : boolean;
    exitOnIssues        : boolean;
    format?             : string;
    gitDiff             : string;
    issueLog            : string;
    log?                : string;
    plugins             : string;
    additionalPlugins?  : string;
    quiet?              : boolean;
    skipSnippets?       : boolean;
    spinner?            : boolean;
    terminalSnippets?   : boolean;
    upload?             : string;
    withoutCorePlugins? : boolean
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
      ) => Bluebird<DataList>;

      exec_plugin : (
        name : string,
        config? : YMLConfig
      ) => Bluebird<DataList>;
    }

    type PromiseEachParsedData = any;

    type RawMetaData = { [k : string]: any; }

    interface UtilKeyTypes {
      OK    :  DataType.Ok;

      WARN  :  DataType.Warn;
      STYL  :  DataType.Styl;
      MAIN  :  DataType.Main;
      COMP  :  DataType.Comp;
      CHURN :  DataType.Churn;
      DUPE  :  DataType.Dupe;
      DEP   :  DataType.Dep;

      ERR   :  DataType.Err;
      SEC   :  DataType.Sec;

      STAT  :  DataType.Stat;
      SCM   :  DataType.Scm;
      COV   :  DataType.Cov;
    }

    interface UtilObjects {
      displayable_issues: DataType.All[];
      warnings: DataType.Warnings[];
      errors:   DataType.Errors[];
      infos:    DataType.Infos[];
    }

    interface UtilMethods {
      promise_each : (
        d : string,
        a : (f_or_d : string, i_d: boolean) => boolean,
        p : (p : string, data? : string) => PromiseEachParsedData,
        opts? : PromiseEachFileOptions
      ) => Bluebird<PromiseEachParsedData[]>;

      filter : (i : IgnoreList, a : AllowList) => (p : string) => boolean;

      issue        : (d : RawMetaData) => Data;

      ignored      : (f : string, i : IgnoreList) => boolean;
      allowed      : (f : string, a : AllowList) => boolean;

      spawn        : (b : string, o? : SpawnOptions) => Bluebird<SpawnData>;
    }

    export interface Util extends UtilMethods, UtilObjects, UtilKeyTypes {}

    export interface Logger {
      create  : (p : string) => LoggerInstance;
      enable  : (c? : boolean, l? : string[]) => void;
      disable : () => void;
      level   : (l : string) => void;
      start_spinner  : () => void;
      stop_spinner   : () => void;
      update_spinner : (t : string) => void;
    }
  }
}
