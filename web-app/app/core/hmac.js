const crypto = require("crypto");
const bufferEq = require("buffer-equal-constant-time");

module.exports = imports => {
	const ALGORITHM = imports.algorithm || "sha256";
	const SHARED_KEY = imports.key;

	const generateHmacAuth = (timestamp, eventId) => crypto.createHmac(ALGORITHM, SHARED_KEY).update(`"${timestamp}":"${eventId}"`).digest("hex");

	const verifyHmacAuth = (timestamp, eventId, givenHmacSignature) => {
		let hmacTest = crypto.createHmac(ALGORITHM, SHARED_KEY);
		hmacTest.write(`"${timestamp}":"${eventId}"`);
		hmacTest.end();
		let testSignature = hmacTest.read();

		return bufferEq(Buffer.from(testSignature.toString("base64")), Buffer.from(givenHmacSignature));
	};

	return {
		generateHmacAuth,
		verifyHmacAuth
	};
};