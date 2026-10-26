"use strict";

const ServiceBroker = require("../../src/service-broker");

describe("Events for local service versions", () => {
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({ logger: false, transporter: null });
	});

	afterEach(() => broker.stop());

	it.each([
		[
			[1, 2],
			["v1.example", "v2.example"]
		],
		[
			[undefined, 1, "1", "beta"],
			["example", "v1.example", "1.example", "beta.example"]
		]
	])("delivers broker startup to every local version (%j)", async (versions, expected) => {
		const received = [];
		for (const version of versions) {
			broker.createService({
				name: "example",
				version,
				events: {
					"$broker.started"() {
						received.push(this.fullName);
					}
				}
			});
		}

		await broker.start();
		expect(received.sort()).toEqual(expected.sort());
	});

	it("broadcasts to each version without changing its default group", async () => {
		const received = [];
		for (const version of [1, 2]) {
			broker.createService({
				name: "example",
				version,
				events: {
					"version.changed"() {
						received.push(this.fullName);
					}
				}
			});
		}

		await broker.start();
		await broker.broadcastLocal("version.changed", null, { groups: ["example"] });
		expect(received.sort()).toEqual(["v1.example", "v2.example"]);
	});

	it("continues balancing emits once per group across local versions", async () => {
		const received = [];
		for (const version of [1, 2]) {
			broker.createService({
				name: "example",
				version,
				events: {
					"version.changed"(ctx) {
						received.push({ service: this.fullName, value: ctx.params });
					}
				}
			});
		}

		await broker.start();
		for (const value of ["first", "second", "third"]) {
			await broker.emit("version.changed", value);
		}
		expect(received.map(item => item.value)).toEqual(["first", "second", "third"]);
		expect(received.every(item => ["v1.example", "v2.example"].includes(item.service))).toBe(
			true
		);
	});

	it("keeps another version subscribed after destroying the first", async () => {
		const received = [];
		const services = [1, 2].map(version =>
			broker.createService({
				name: "example",
				version,
				events: {
					"version.changed"() {
						received.push(this.fullName);
					}
				}
			})
		);

		await broker.start();
		await broker.destroyService(services[0]);
		await broker.broadcastLocal("version.changed");
		expect(received).toEqual(["v2.example"]);
	});
});
