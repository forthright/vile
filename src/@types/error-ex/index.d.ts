declare module "error-ex" {
  interface CustomError {
    message : string;
    name    : string;
    stack   : string;
  }

  // TODO: full types
  function error_ex(
    bin     : string,
  ) : any;

  export = error_ex
}
