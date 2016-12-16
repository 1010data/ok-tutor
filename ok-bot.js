/* jshint esnext: true, node: true */
// An IRC bot for the k6 programming language,
// using oK from : https://github.com/JohnEarnest/ok
"use strict";

const child_process = require("child_process");
const fs = require("fs");
const irc = require("irc");
const ok = require("./lib/ok/oK");

let env = ok.baseEnv();

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
  const json_data = JSON.parse(raw_data);
  const client = new irc.Client(json_data.server, json_data.nickname, {
    channels: json_data.channels
  });

  client.addListener("message", (from, to, msg) => {
    if (to.startsWith("#") && msg.startsWith("k) ")) {
      runK(msg.substring(2)).then((result) => {
        const lines = result.split("\n").slice(0, -1);
        const line_amount = Math.min(lines.length, MAX_OUTPUT_LINES);
        for (let i = 0; i < line_amount; ++i) {
          client.say(to, `${from}: ${lines[i]}`);
        }
        if (lines.length > MAX_OUTPUT_LINES) client.say(to, `${from}: ...`);
      }).catch((err) => {
        client.say(to, `${from}: ERROR: ${err}`);
      });
    }
  });
});
