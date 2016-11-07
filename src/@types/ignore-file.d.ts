declare module "ignore-file" {
  export function sync(l : any) : (s : string) => boolean;
  export function compile(l : any) : (s : string) => boolean;
}
