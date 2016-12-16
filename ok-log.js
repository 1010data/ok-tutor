//
// logging system for progress-tracking in the irc bot. 
//
const sqlite3 = require("sqlite3").verbose();

function OkLog(db_path) {
  this.db = new sqlite3.Database(db_path || ":memory:");
}

OkLog.prototype.start_session = function(user) {
}

OkLog.prototype.start_session = function(user, qid, answer, score, notes) {
}

OkLog.query = function(user, qid, query) {
}
  
OkLog.close = function() {
  this.db.close();
}

exports.OkLog = OkLog;

