/* jshint esnext: true, node: true */
"use strict";

const ok = require("./lib/ok/oK");

let env = ok.baseEnv();
const runK = (src) => {
  return ok.format(ok.run(ok.parse(src), env));
};

if (process.argv[2] !== undefined && process.argv[3] !== undefined) {
  let result;
  env.d = JSON.parse(process.argv[3]);
  try {
    result = runK(process.argv[2]);
  } catch (err) {
    result = `ERROR: ${err.message}`;
  }
  console.log(JSON.stringify({
    output: result + "\n",
    environment: env.d
  }));
}
