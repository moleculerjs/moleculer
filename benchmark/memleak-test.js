"use strict";

const kleur = require("kleur");
const memwatch = require("memwatch-next");
const ServiceBroker = require("../src/service-broker");

const broker1 = new ServiceBroker({
	namespace: "memleak",
	nodeID: "node-1",
	transporter: "Fake",
	serializer: "JSON"
});

const broker2 = new ServiceBroker({
	namespace: "memleak",
	nodeID: "node-2",
	transporter: "Fake",
	serializer: "JSON"
});

broker2.createService({
	name: "echo",
	actions: {
		reply(ctx) {
			return ctx.params;
		}
	}
});

Promise.all([broker1.start(), broker2.start()]).then(() => {
	let count = 0;
	function doRequest() {
		count++;
		return broker1
			.call("echo.reply", { a: count })
			.then(res => {
				setImmediate(() => doRequest());
				return res;
			})
			.catch(err => {
				throw err;
			});
	}

	let startTime = Date.now();

	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("hu-HU", { maximumFractionDigits: 0 }), "req/s");
		count = 0;
		startTime = Date.now();
	}, 1000);

	broker1.waitForServices(["echo"]).then(() => doRequest());

	let hd = null;
	memwatch.on("leak", function (info) {
		if (!hd) {
			hd = new memwatch.HeapDiff();
		} else {
			const diff = hd.end();
			//broker1.logger.warn('Heap diff:', util.inspect(diff, false, 8, true));
			broker1.logger.warn("===========================================");
			broker1.logger.warn(
				kleur.red().bold(`MEMORY LEAK DETECTED! Diff: ${diff.change.size}`)
			);
			broker1.logger.warn(kleur.red().bold(`REASON: ${info.reason}`));
			const details = diff.change.details;
			details.sort((a, b) => b.size_bytes - a.size_bytes);
			details
				.filter(o => o.size_bytes > 10 * 1024)
				.forEach(o => {
					broker1.logger.info(
						kleur
							.yellow()
							.bold(
								`Leak info: Type: ${o.what}, Size: ${o.size}, +:${o["+"]}, -:${o["-"]}`
							)
					);
				});
			broker1.logger.warn("===========================================\n");

			hd = null;
		}
	});

	memwatch.on("stats", stats => {
		if (stats.usage_trend > 0) {
			broker1.logger.warn(kleur.cyan().bold("MEMWATCH STAT:"), stats);
		}
	});
});
