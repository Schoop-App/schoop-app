// Threw this together super fast. Real production
// would suit real logging, but I'm a bit pressed
// for time. Let's hope this does the trick.

// let shouldLog = process.env.NODE_ENV !== "production";
let shouldLog = true;

function log() {
	if (shouldLog) console.log(...arguments);
}

function error() {
	if (shouldLog) console.error(...arguments);
}

module.exports = { log, error };