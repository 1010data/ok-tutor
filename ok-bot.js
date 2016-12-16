/* jshint esnext: true, node: true */
// An IRC bot for the k6 programming language,
// using oK from : https://github.com/JohnEarnest/ok
"use strict";

const child_process = require("child_process");
const fs = require("fs");
const irc = require("irc");
const ok = require("./lib/ok/oK");

let env = new ok.Environment(null);

const MAX_OUTPUT_LINES = 8;
const TIMEOUT_MS = 5 * 1000;

const runK = (src) => {
  return new Promise((resolve, reject) => {
    const result = child_process.spawnSync(process.execPath,
                                           ["eval-args.js", src, JSON.stringify(env.d)],
                                           {timeout: TIMEOUT_MS,
                                            encoding: "utf-8"});
    if (result.error) {
      if (result.error.code == "ETIMEDOUT") {
        reject(`Timed out after ${TIMEOUT_MS / 1000} seconds.`);
      } else {
        reject(result.error.code);
      }
    } else {
      const json_result = JSON.parse(result.stdout);
      env.d = json_result.environment;
      resolve(json_result.output);
    }
  });
};

fs.readFile("./config.json", (error, raw_data) => {
  if (error) throw error;
  const config = JSON.parse(raw_data);
  const client = new irc.Client(config.server, config.nickname, {
    channels: config.channels
  });

  client.addListener("message", (from, to, msg) => {
    if (to.startsWith("#") && msg.startsWith(config.prompt)) {
      runK(msg.substring(config.prompt.length)).then((result) => {
        const lines = result.split("\n").slice(0, -1);
        const line_amount = Math.min(lines.length, MAX_OUTPUT_LINES);
        for (let i = 0; i < line_amount; ++i) {
          client.say(to, `${from}: ${lines[i]}`);
        }
        if (lines.length > MAX_OUTPUT_LINES) client.say(to, `${from}: ...`);
      }).catch((err) => {
        console.trace();
        client.say(to, `${from}: ERROR: ${err}`);
      });
    }
    else if(msg[0] === "\\") { // command
      const s = msg.split(" ");
      const cmd = s[0]; args = s.slice(1);

      if(cmd === "\\q")
        process.exit();
    }
  });
});
