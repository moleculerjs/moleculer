"use strict";

const memwatch = require("@icebob/node-memwatch");

jest.setTimeout(3 * 60 * 1000); // 3mins

describe("leak detector", function () {
	// let leakCB = jest.fn();
	// memwatch.on("leak", leakCB);

	it("should detect a basic leak", done => {
		const hd = new memwatch.HeapDiff();
		let iterations = 0;
		const leaks = [];
		const interval = setInterval(() => {
			if (iterations >= 10) {
				memwatch.gc();
				const diff = hd.end();
				console.log(diff); // eslint-disable-line no-console
				expect(diff.change.size_bytes).toBeGreaterThan(50 * 1024 * 1024);
				clearInterval(interval);
				return done();
			}
			iterations++;
			for (let i = 0; i < 1000000; i++) {
				const str = "leaky string";
				leaks.push(str);
			}
		}, 10);
	});
});
