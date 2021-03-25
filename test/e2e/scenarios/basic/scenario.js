const { assert, createNode, executeScenarios, addScenario, getFileSHA, getStreamSHA } = require("../../utils");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const broker = createNode("supervisor");
broker.loadService("../../services/scenario.service.js");

addScenario("call action", async () => {
	const params = {
		a: "Hello",
		b: 1000,
		c: true,
		d: {
			e: 123.45,
			f: [1,2,3],
			g: null
		}
	};

	const meta = {
		a: "Hi",
		b: 2222,
		c: false,
		d: {
			e: 56.78,
			f: [1,2,3],
			g: null
		}
	};

	const res = await broker.call("echo.reply", params, { meta });

	assert(res, {
		params: {
			a: "Hello",
			b: 1000,
			c: true,
			d: {
				e: 123.45,
				f: [1,2,3],
				g: null
			}
		},
		meta: {
			a: "Hi",
			b: 2222,
			c: false,
			d: {
				e: 56.78,
				f: [1,2,3],
				g: null
			}
		},
		response: {
			a: "Hey",
			b: 3333,
			c: true,
			d: {
				e: 122.34,
				f: [1,2,3],
				g: null
			}
		}
	});
});

addScenario("emit event", async () => {
	await broker.call("$scenario.clear");

	const params = {
		a: "Hello",
		b: 1000,
		c: true,
		d: {
			e: 123.45,
			f: [1,2,3],
			g: null
		}
	};

	const meta = {
		a: "Hi",
		b: 2222,
		c: false,
		d: {
			e: 56.78,
			f: [1,2,3],
			g: null
		}
	};

	broker.emit("sample.event", params, { meta });
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");
	assert(events.length, 1);
	assert(events[0], {
		nodeID: "node1",
		event: "sample.event",
		params: {
			a: "Hello",
			b: 1000,
			c: true,
			d: {
				e: 123.45,
				f: [1,2,3],
				g: null
			}
		},
		meta: {
			a: "Hi",
			b: 2222,
			c: false,
			d: {
				e: 56.78,
				f: [1,2,3],
				g: null
			}
		}
	});
});

addScenario("send & receive stream", async () => {
	const filename = path.join(__dirname, "/../../assets/banner.png");
	const originalSHA = await getFileSHA(filename);

	const s1 = fs.createReadStream(filename);
	const s2 = await broker.call("aes.encrypt", s1);
	const s3 = await broker.call("aes.decrypt", s2);

	const receivedSHA = await getStreamSHA(s3);

	//console.log(originalSHA, receivedSHA);
	assert(originalSHA, receivedSHA);
});

executeScenarios(broker, ["echo", "aes"]);
