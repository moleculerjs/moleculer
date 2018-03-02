"use strict";

const ServiceBroker = require("../src/service-broker");

/**
 * Proof-of-Concept middleware to convert context params
 * @param {Function} handler
 * @param {Action} action
 */
function paramConverterMiddleware(handler, action) {

	function convertProperties(obj, schema) {
		Object.keys(schema).forEach(key => {
			const s = schema[key];
			const val = obj[key];
			if (val == null)
				return;

			if (s.type == "string" && typeof val !== "string") {
				obj[key] = "" + val;
			} else if (s.type == "number" && typeof val !== "number") {
				obj[key] = Number(val);
			} else if (s.type == "boolean" && typeof val !== "boolean") {
				obj[key] = String(val).toLowerCase() === "true";
			} else if (s.type == "date" && !(val instanceof Date)) {
				obj[key] = new Date(val);
			} else if (s.type == "object")
				convertProperties(val, s.props);
		});
	}

	// Wrap a param validator
	if (action.params && typeof action.params === "object") {
		return function convertContextParams(ctx) {
			convertProperties(ctx.params, action.params);

			return handler(ctx);
		};
	}
	return handler;
}

// --- CREATE BROKER TO TEST ---

const broker = new ServiceBroker({
	logger: true,
	validation: true
});
broker.use(paramConverterMiddleware);

// --- CREATE A TEST SERVICE ---
broker.createService({
	name: "test",
	actions: {
		work: {
			params: {
				a: { type: "string" },
				b: { type: "number" },
				c: { type: "boolean" },
				d: { type: "object", props: {
					e: { type: "date" },
					f: { type: "date" },
				}}
			},
			handler(ctx) {
				return ctx.params;
			}
		}
	}
});

// --- START BROKER & CALL ACTION ---
(async function() {

	await broker.start();
	broker.repl();

	const p = {
		a: 5,
		b: "123",
		c: "false",
		d: {
			e: 1520023064213,
			f: "2018-03-02T20:37:44.213Z"
		}
	};

	broker.logger.info("Before:", p);
	try {
		const res = await broker.call("test.work", p);
		broker.logger.info("After:", res);
	} catch(err) {
		broker.logger.error(err);
	}
})();

/* Output

[2018-03-02T20:57:03.731Z] INFO  bobcsi-pc-508/BROKER: Before: {
  a: 5,
  b: '123',
  c: 'false',
  d: { e: 1520023064213, f: '2018-03-02T20:37:44.213Z' } }
[2018-03-02T20:57:03.733Z] INFO  bobcsi-pc-508/BROKER: After: {
  a: '5',
  b: 123,
  c: false,
  d: { e: 2018-03-02T20:37:44.213Z, f: 2018-03-02T20:37:44.213Z } }
*/
