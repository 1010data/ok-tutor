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

const SESSION_MAP = {};

function newSession(nick) {
  return {nick, problemIndex: 0, testIndex: 0};
}

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

const config = JSON.parse(fs.readFileSync("./config.json"));
const problems = JSON.parse(fs.readFileSync("problems.json"));
const client = new irc.Client(config.server, config.nickname, {
  channels: config.channels
});

client.addListener("message", (from, to, msg) => {
  let session = SESSION_MAP[from] || null;
  let currentTest = session && problems[session.problemIndex].tests[session.testIndex];

  function reply(msg) {
    client.say(to, `${from}: ${msg}`);
  }

  function nextTest() {
    session.testIndex++;

    console.log("test index:", session.testIndex)

    if(session.testIndex >= problems[session.problemIndex].tests.length) {
      session.problemIndex++;

      console.log("problem index:", session.problemIndex)

      if(session.problemIndex >= problems.length || problems[session.problemIndex].tests.length === 0) {
        reply("You've finished all of the problems. Congratulations!");
        SESSION_MAP[from] = undefined;
        return null;
      }
      else
        session.testIndex = 0;
    }

    console.log("test / problem index:", session.testIndex, session.problemIndex);

    return problems[session.problemIndex].tests[session.testIndex];
  }

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
    const cmd = s[0], args = s.slice(1);

    if(cmd === "\\q")
      process.exit();
    else if(cmd === "\\start") {
      reply(`Welcome. You will be given a set of problem descriptions. Use '\\s <answer>' to submit your answer.`);
      reply(`Please review the oK manual at < https://github.com/JohnEarnest/ok/blob/gh-pages/docs/Manual.md >.`);

      if(!session)
        SESSION_MAP[from] = session = newSession(from);
      else
        reply("You already have a session running. Nice try.");

      reply(problems[session.problemIndex].tests[session.testIndex].prompt);
    }
    else if(cmd === "\\s") { // submit
      runK(args.join(" ")).then((result) => {
        result = result.trim();
        console.log(`User ${from} submits '${result}'`);

        if(result === currentTest.wants) {
          console.log(`User ${from} finished problem ${currentTest.name}.`);

          currentTest = nextTest();

          if(currentTest)
            reply(currentTest.prompt);
        }
        else {
          let hasHint = false;
          for(const hintInput in currentTest.hints) {
            console.log(`Hint: ${hintInput}`);
            if(result === hintInput) {
              console.log(`Dispensed hint to user ${from}.`);
              reply(currentTest.hints[hintInput]);
              hasHint = true;
              break;
            }
          }

          if(!hasHint)
            reply("Not the correct answer. Experiment and try again!");
        }
      }).catch((err) => {
        console.trace();
        reply(`ERROR: ${err}`);
      });
    }
  }
});
