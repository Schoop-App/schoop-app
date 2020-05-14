const crypto = require("crypto");
const bufferEq = require("buffer-equal-constant-time");
const { generateFormattedTimestamp } = require("./email-auth-util");

// hmac implementation specific to email auth
module.exports = imports => {
	const ALGORITHM = imports.algorithm || "sha256";
	const SHARED_KEY = imports.key;

	// timestamp REMOVED from the function because it will be generated for a one-day use anyways (so we can use current date)
	const generateHmacAuth = (eventId, userId) => crypto.createHmac(ALGORITHM, SHARED_KEY).update(`"${generateFormattedTimestamp(new Date())}":"${eventId}":"${userId}"`).digest("hex");
	const verifyHmacAuth = (eventId, userId, givenHmacSignature) => bufferEq(Buffer.from(generateHmacAuth(eventId, userId)), Buffer.from(givenHmacSignature));

	return {
		generateHmacAuth,
		verifyHmacAuth
	};
};