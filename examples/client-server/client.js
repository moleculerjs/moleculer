/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let kleur = require("kleur");

let ServiceBroker = require("../../src/service-broker");

const { randomInt } = require("../../src/utils");

let transporter = process.env.TRANSPORTER || "TCP";

// Create broker
let broker = new ServiceBroker({
	namespace: "multi",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter,
	//serializer: "ProtoBuf",
	requestTimeout: 1000,

	circuitBreaker: {
		enabled: false,
		maxFailures: 3
	},
	logger: console,
	logLevel: process.env.LOGLEVEL
});

broker.createService({
	name: "event-handler",
	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(
				kleur.yellow().bold(`---  Circuit breaker opened on '${payload.node.id}'!`)
			);
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(
				kleur.green(`---  Circuit breaker half-opened on '${payload.node.id}'!`)
			);
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(
				kleur.green().bold(`---  Circuit breaker closed on '${payload.node.id}'!`)
			);
		}
	},

	started() {
		this.counter = 1;

		setInterval(() => {
			broker.logger.info(`>> Send echo event. Counter: ${this.counter}.`);
			broker.emit("echo.event", { counter: this.counter++ });
		}, 5000);
	}
});

let reqCount = 0;
let pendingReqs = [];

broker
	.start()
	.then(() => broker.repl())
	/*.then(() => {
		setInterval(() => {
			const fs = require("fs");
			const list = broker.registry.nodes.toArray().map(node => _.pick(node, ["id", "seq", "offlineSince", "available", "hostname", "port", "ipList", "udpAddress"]));
			fs.writeFileSync("./" + broker.nodeID + "-nodes.json", JSON.stringify(list, null, 2));
		}, 1000);
	})*/
	.then(() => broker.waitForServices("math"))
	.then(() => {
		setInterval(() => {
			let pendingInfo = "";
			if (pendingReqs.length > 10) {
				pendingInfo = ` [${pendingReqs.slice(0, 10).join(",")}] + ${
					pendingReqs.length - 10
				}`;
			} else if (pendingReqs.length > 0) {
				pendingInfo = ` [${pendingReqs.join(",")}]`;
			}

			let payload = { a: randomInt(0, 100), b: randomInt(0, 100), count: ++reqCount };
			pendingReqs.push(reqCount);
			let p = broker.call("math.add", payload);
			if (p.ctx) {
				broker.logger.info(
					kleur.grey(
						`${reqCount}. Send request (${payload.a} + ${payload.b}) to ${
							p.ctx.nodeID ? p.ctx.nodeID : "some node"
						} (queue: ${broker.transit.pendingRequests.size})...`
					),
					kleur.yellow().bold(pendingInfo)
				);
			}
			p.then(({ count, res }) => {
				broker.logger.info(
					_.padEnd(`${count}. ${payload.a} + ${payload.b} = ${res}`, 20),
					`(from: ${p.ctx.nodeID})`
				);

				// Remove from pending
				if (pendingReqs.indexOf(count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != count);
				else broker.logger.warn(kleur.red().bold("Invalid coming request count: ", count));
			}).catch(err => {
				broker.logger.warn(
					kleur
						.red()
						.bold(
							_.padEnd(
								`${payload.count}. ${payload.a} + ${payload.b} = ERROR! ${err.message}`
							)
						)
				);
				if (pendingReqs.indexOf(payload.count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != payload.count);
			});
		}, 1000);
	});
