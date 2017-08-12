const path = require("path");
const Promise = require("bluebird");
const { exec, callIn } = require("../util");

const commonString = " received the event.";

const findResponse = (arr) => arr
	.map(string => {
		const line = string
			.split("\n")
			.find(a => a.indexOf(commonString) > 0);
		return line ? line.slice(0, line.indexOf(commonString)) : false;
	})
	.filter(a => a);

xdescribe("Test AMQPTransporter events", () => {
	beforeEach(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));
	afterAll(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));

	it("Should send an event to all subscribed nodes.", () => {
		return Promise.all([
			exec("node", [path.resolve(__dirname,"pub.js")]),
			exec("node", [path.resolve(__dirname,"sub1.js")]),
			exec("node", [path.resolve(__dirname,"sub2.js")]),
			exec("node", [path.resolve(__dirname,"sub3.js")]),
		])
			.then((stdout) => {
				const expectedReceivers = [
					"Publisher",
					"Subscriber1",
					"Subscriber2",
					"Subscriber3",
				].sort();
				expect(findResponse(stdout).sort()).toEqual(expectedReceivers);
			});
	}, 15000);

	it( "Subscribed nodes should not receive events older than 5 seconds.", () => {
		return Promise.all([
			callIn(() => exec("node", [path.resolve(__dirname,"pub.js")]), 200),
			exec("node", [path.resolve(__dirname,"sub1.js")]),
			exec("node", [path.resolve(__dirname,"sub2.js")]),
			callIn(() => exec("node", [path.resolve(__dirname,"sub3.js")]), 6000),
		])
			.then((stdout) => {
				const expectedReceivers = [
					"Publisher",
					"Subscriber1",
					"Subscriber2",
				].sort();
				expect(findResponse(stdout).sort()).toEqual(expectedReceivers);
			});
	}, 20000);
});
