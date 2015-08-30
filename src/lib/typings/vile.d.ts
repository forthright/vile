declare module Vile {
  export interface Issue {
    type   : string;
    file   : string;
    msg    : string;
    where  : IssueLocation;
    score? : number;
  }

  export interface Stats {
    total_issues  : number;
    total_files   : number;
    failed_files  : number;
    passed_files  : number;
    project_score : number;
    letter_score  : string;
    lowest_score  : number;
    highest_score : number;
    less_than_80  : number;
    less_than_60  : number;
  }

  export interface IssuesPerFile {
    [filepath : string] : IssueList;
  }

  export type IssueList = Issue[]

  export type Result = IssueList | Promise<IssueList>

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
      load : (f : string) => any;
      get  : () => any;
    }

    export interface Package {
      version : string;
    }

    export interface Index {
      report : (r : string, is : IssueList, s : Stats) => any;
      exec   : (p : PluginList, opts : any, format : string) => Promise<IssueList>;
    }

    export interface Logger {
      quiet   : () => any;
      level   : () => any;
      create  : (m ? : string) => any;
      verbose : (s : boolean) => void;
    }

    export interface Score {
      calculate_file : (i : IssueList) => number;
      calculate_all  : (i : IssueList) => IssuesPerFile;
      digest         : (i : IssuesPerFile) => Stats;
      log            : (
        i : IssueList,
        s : Stats,
        log_totals : boolean,
        show_grades : boolean
      ) => void;
    }
  }
}
