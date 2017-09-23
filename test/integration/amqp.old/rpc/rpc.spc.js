/* eslint-disable no-console */

const path = require("path");
const Promise = require("bluebird");
const { exec, callIn } = require("../util");

const respondTo = "responding to";
const receive = "received";
const respond = "responded";

const findLines = (str, target) => str.split("\n").filter(a => a.includes(target));


describe("Test AMQPTransporter RPC", () => {

	beforeEach(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));
	afterAll(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));

	it("Only one node should receive any given request.", () => {
		const messageID = Date.now();
		return Promise.all([
			exec("node", [path.resolve(__dirname, "worker1.js")]),
			callIn(() => exec("node", [path.resolve(__dirname, "worker2.js")]), 1000),
			callIn(() => exec("node", [path.resolve(__dirname, "singleRequest.js"), messageID]), 1000),
		])
			.then((stdout) => {
				const responses = stdout
					.reduce((acc, string) => {
						const lines = findLines(string, respondTo);
						if (lines.length) {
							return acc.concat(lines);
						}
						return acc;
					}, []);

				expect(responses).toHaveLength(1);
				const oneOf = [
					`worker1 responding to request${messageID}`,
					`worker2 responding to request${messageID}`
				];
				expect(oneOf).toContain(responses[0]);
			});
	}, 15000);

	it("Nodes should only receive one request at a time by default.", () => {
		const messageID = Date.now();
		return Promise.all([
			exec("node", [path.resolve(__dirname, "timeStampedWorker.js")]),
			exec("node", [path.resolve(__dirname, "fiveRequests.js"), messageID]),
		])
			.then((stdout) => {
				const responses = stdout[0]
					.split("\n")
					.filter(a => a.indexOf(receive) !== -1 || a.indexOf(respond) !== -1);

				expect(responses).toHaveLength(10);

				const getType = a => a.split(" ")[0];
				const getTime = a => Number(a.split(" ")[1]);

				for (let i = 0; i < 10; i++) {
					expect(getType(responses[i])).toBe(i % 2 === 0 ? receive : respond);
				}

				for (let i = 0; i < 9; i++) {
					expect(getTime(responses[i])).toBeLessThan(getTime(responses[i + 1]));
				}
			});
	}, 15000);

	it("Should use availability-based load balancing", () => {
		const getResponses = str => str.split("\n").filter(a => a.includes(respondTo));
		return Promise.all([
			exec("node", [path.resolve(__dirname, "slowWorker.js")]),
			exec("node", [path.resolve(__dirname, "worker1.js")]),
			exec("node", [path.resolve(__dirname, "fiveRequests.js")]),
		])
			.then((stdout) => {
				const slowResponses = getResponses(stdout[0]);
				const fastResponses = getResponses(stdout[1]);
				expect(slowResponses).toHaveLength(1);
				expect(fastResponses).toHaveLength(4);
			});
	}, 15000);

	it("Multiple ndoes should be able to call a single action.", () => {
		return Promise.all([
			exec("node", [path.resolve(__dirname, "fiveRequests.js")]),
			exec("node", [path.resolve(__dirname, "singleRequest.js")]),
			exec("node", [path.resolve(__dirname, "worker1.js")]),
		])
			.then((stdout) => {
				const responses = findLines(stdout[2], respondTo);
				expect(responses).toHaveLength(6);
			});
	}, 15000);

	it("Should not have a request or response dequeued until it has been received", () => {
		return Promise.all([
			exec("node", [path.resolve(__dirname, "singleRequest.js")]),
			exec("node", [path.resolve(__dirname, "tooSlowWorker.js")]),
		])
			.then((stdout) => {
				const responses = findLines(stdout[1], "responded");
				expect(responses).toHaveLength(0);
				return exec("node", [path.resolve(__dirname, "timeStampedWorker.js")]);
			})
			.then(stdout => {
				const responses = findLines(stdout, "responded");
				expect(responses).toHaveLength(1);
				return exec("node", [path.resolve(__dirname, "timeStampedWorker.js")]);
			})
			.then(stdout => {
				const responses = findLines(stdout, "responded");
				expect(responses).toHaveLength(0);
			});
	}, 60000);

});
