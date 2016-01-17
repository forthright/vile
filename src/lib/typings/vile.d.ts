/// <reference path="bluebird.d.ts" />

declare module Vile {
  // TODO: add all types of issues to this spec
  export interface Issue {
    type   : string;
    file   : string;
    msg    : string;
    where  : IssueLocation;
    data?  : any;
  }

  export type IssueList = Issue[]

  export type Result = IssueList | bluebird.Promise<IssueList>

  export interface IssueLocation {
    start : IssueLine;
    end?  : IssueLine;
  }

  export interface IssueLine {
    line      : number;
    character : number;
  }
  export interface Plugin {
    punish : (config? : PluginConfig) => Result;
  }

  export interface PluginConfig {
    config?  : any;
    ignore?  : IgnoreList;
  }

  export interface Config {
    plugins : PluginList;
    ignore  : IgnoreList;
  }

  export interface PluginList extends Array<string> {}

  export interface IgnoreList extends Array<string> {}

  export interface YMLConfig extends Object {}

  export module Lib {
    export interface Config {
      load      : (f : string) => any;
      load_auth : (f : string) => any;
      get       : () => any;
      get_auth  : () => any;
    }

    export interface AuthConfig {
      email   : string;
      token   : string;
      project : string;
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
        auth_config : AuthConfig
      ) => bluebird.Promise<any>;
    }
  }
}
