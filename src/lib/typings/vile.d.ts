// vile.d.ts
// The go to definition for Vile data

// TODO: split up better (in this file)
declare module Vile {
  export interface Issue {
    type        : string;
    path        : string;
    message     : string;
    title?      : string;
    name?       : string;
    signature?  : string;
    commit?     : Commit;
    dependency? : Dependency;
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

  export interface Commit {
    sha?          : string;
    branch?       : string;
    message?      : string;
    committer?    : string;
    commit_date?  : string;
    author?       : string;
    author_date   : string;
  }

  export interface Dependency {
    name     : string;
    current? : string;
    latest?  : string;
  }

  export interface Security {
    package     : string;
    version?    : number;
    advisory?   : string;
    patched?    : string[];
    vulnerable? : string[];
    unaffected? : string[];
  }

  export interface DuplicateLocations {
    path      : string;
    snippet?  : Snippet[];
    where?    : IssueLocation;
  }

  export interface Duplicate {
    locations: DuplicateLocations[]
  }

  export interface Stat {
    size?     : number;
    loc?      : number;
    lines?    : number;
    comments? : number;
  }

  export type IssueList = Issue[]

  export type Result = IssueList | Promise<IssueList>

  export interface Snippet {
    line     : number;
    offset?  : number;
    text     : string;
    ending?  : string;
  }

  export interface Coverage {
    total : number;
  }

  export interface IssueLocation {
    start? : IssueLine;
    end?  : IssueLine;
  }

  export interface IssueLine {
    line       : number;
    character? : number;
  }

  export interface Plugin {
    punish : (config? : PluginConfig) => Result;
  }

  export interface PluginConfig {
    config?  : any;
    ignore?  : IgnoreList;
    allow?   : AllowList;
  }

  export interface Config {
    plugins : PluginList;
    ignore  : IgnoreList;
    allow?   : AllowList;
  }

  export interface PluginList extends Array<string> {}

  export interface IgnoreList extends Array<string> {}

  export interface AllowList extends Array<string> {}

  export interface YMLConfig extends Object {}

  export module Lib {
    export interface Config {
      load      : (f : string) => any;
      load_auth : () => any;
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

      log : (
        post_json : any,
        verbose : boolean
      ) => void;
    }
  }
}
