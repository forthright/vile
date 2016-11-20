declare module "cli-spinner" {
  interface Spinner {
    setSpinnerDelay(d : number) : void;
    stop(clear : boolean) : void;
    start() : void;
  }

  export function Spinner(prefix : string) : void;
}
