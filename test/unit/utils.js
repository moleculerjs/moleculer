/*eslint-disable no-console */
"use strict";

module.exports = {
	protectReject(err) {
		if (err && err.stack) {
			console.error(err);
			console.error(err.stack);
		}
		expect(err).toBe(true);
	}
};
