declare module Vile {
  // TODO: add all types of issues to this spec
  export interface Issue {
    type      : string;
    path      : string;
    message   : string;
    title?    : string;
    current?  : string;
    latest?   : string;
    name?     : string;
    commit?   : any;
    plugin?   : string;
    language? : string;
    complexity? : string;
    churn? : string;
    where?    : IssueLocation;
  }

  export type IssueList = Issue[]

  export type Result = IssueList | Promise<IssueList>

  export interface IssueLocation {
    start? : IssueLine;
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
      ) => Promise<IssueList>;
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
      ) => Promise<any>;
    }
  }
}
