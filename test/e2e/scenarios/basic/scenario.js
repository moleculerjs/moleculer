/* eslint-disable no-console */
const _ = require("lodash");
const kleur = require("kleur");
const { assert, createNode } = require("../../utils");

const broker = createNode("supervisor");

async function scenario() {
	await broker.start();
	await broker.waitForServices("echo", 10 * 1000);

	// --- STEP 1 ---
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
}


scenario().then(() => {
	console.log(kleur.green().bold("SCENARIO: OK"));
	broker.broadcast("$shutdown", { error: false });
}).catch(err => {
	console.error(kleur.green().bold("SCENARIO: ERROR"));
	console.error(err);
	broker.broadcast("$shutdown", { error: true });
});

