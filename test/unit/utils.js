"use strict";

module.exports = {
	protectReject(err) {
		if (err && err.stack) {
			console.error(err);
			console.error(err.stack);
		} else {
			console.error(new Error("Protect reject called with: " + err));
		}

		expect(err).toBe(true);
	},

	extendExpect(expect) {
		expect.extend({
			toBeAnyOf(received, expected) {
				let pass = false;
				for (const item of expected) {
					if (received === item) {
						pass = true;
						break;
					}
				}

				let list = expected.map(item => item.toString()).join(", ");
				let message = `Expected ${received.toString()} to be any of [${list}]`;

				return {
					actual: received,
					message: () => message,
					pass
				};
			}
		});
	}
};
