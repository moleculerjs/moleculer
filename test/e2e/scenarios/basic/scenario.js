const { assert, createNode, executeScenarios, addScenario } = require("../../utils");

const broker = createNode("supervisor");
const RECEIVED_EVENTS = [];
broker.createService({
	name: "event-listener",

	events: {
		"sample.event.received"(ctx) {
			RECEIVED_EVENTS.push(ctx);
		}
	}
});

addScenario("call action", async () => {
	const params = {
		a: "Hello",
		b: 1000,
		c: true,
		d: {
			e: 123.45,
			f: null
		}
	};

	const meta = {
		a: "Hi",
		b: 2222,
		c: false,
		d: {
			e: 56.78,
			f: null
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
				f: null
			}
		},
		meta: {
			a: "Hi",
			b: 2222,
			c: false,
			d: {
				e: 56.78,
				f: null
			}
		},
		response: {
			a: "Hey",
			b: 3333,
			c: true,
			d: {
				e: 122.34,
				f: null
			}
		}
	});
});

addScenario("emit event", async () => {
	RECEIVED_EVENTS.length = 0;

	const params = {
		a: "Hello",
		b: 1000,
		c: true,
		d: {
			e: 123.45,
			f: null
		}
	};

	const meta = {
		a: "Hi",
		b: 2222,
		c: false,
		d: {
			e: 56.78,
			f: null
		}
	};

	broker.emit("sample.event", params, { meta });
	await broker.Promise.delay(1000);

	assert(RECEIVED_EVENTS.length, 1);
	assert(RECEIVED_EVENTS[0].params, {
		params: {
			a: "Hello",
			b: 1000,
			c: true,
			d: {
				e: 123.45,
				f: null
			}
		},
		meta: {
			a: "Hi",
			b: 2222,
			c: false,
			d: {
				e: 56.78,
				f: null
			}
		},
		response: {
			a: "Hey",
			b: 3333,
			c: true,
			d: {
				e: 122.34,
				f: null
			}
		}
	});
});

executeScenarios(broker, ["echo"]);
