/* eslint-disable no-console */

const Promise 							= require("bluebird");
const _ 								= require("lodash");
//const { ServiceBroker } 				= require("../../../");
const { createBrokers } 				= require("../helper");
let { extendExpect, protectReject } 	= require("../../unit/utils");

extendExpect(expect);

const mathService = {
	name: "math",
	actions: {
		add(ctx) {
			return {
				node: this.broker.nodeID,
				result: Number(ctx.params.a) + Number(ctx.params.b)
			};
		}
	}
};

module.exports = function(transporter, serializer, meta)  {

	describe("Test normal calling", () => {

		// Creater brokers
		const [master, slaveA, slaveB, slaveC] = createBrokers(["master", "slaveA", "slaveB", "slaveC"], {
			namespace: "call",
			transporter,
			serializer
		});

		// Load services
		[slaveA, slaveB, slaveC].forEach(broker => broker.createService(mathService));

		// Start & Stop
		beforeAll(() => Promise.all([master.start(), slaveA.start(), slaveB.start()]));
		afterAll(() => Promise.all([master.stop(), slaveA.stop(), slaveB.stop()]));

		it("should call actions with balancing between 2 nodes", () => {
			return master.waitForServices("math")
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveA")).toHaveLength(3);
					expect(res.filter(o => o.node == "slaveB")).toHaveLength(3);
				});
		});

		it("start slaveC", () => {
			return slaveC.start().delay(500);
		});

		it("should call actions with balancing between 3 nodes", () => {
			return master.waitForServices("math")
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveA")).toHaveLength(2);
					expect(res.filter(o => o.node == "slaveB")).toHaveLength(2);
					expect(res.filter(o => o.node == "slaveC")).toHaveLength(2);
				});
		});

		it("stop slaveC", () => {
			return slaveC.stop().delay(500);
		});

		it("should call actions without slaveC node", () => {
			return master.waitForServices("math")
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveA")).toHaveLength(3);
					expect(res.filter(o => o.node == "slaveB")).toHaveLength(3);
					expect(res.filter(o => o.node == "slaveC")).toHaveLength(0);
				});
		});


		it("should direct call action on the specified node", () => {
			return master.waitForServices("math")
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }, { nodeID: "slaveB" }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveA")).toHaveLength(0);
					expect(res.filter(o => o.node == "slaveB")).toHaveLength(6);
				});
		});
	});

	describe("Test normal calling with versioned services", () => {

		// Creater brokers
		const [master, slaveA, slaveB, slaveC] = createBrokers(["master", "slaveA", "slaveB", "slaveC"], {
			namespace: "version-call",
			transporter,
			serializer
		});

		// Load services
		slaveA.createService(Object.assign({}, mathService, { version: 2 }));
		slaveB.createService(Object.assign({}, mathService, { version: "beta" }));
		slaveC.createService(mathService);

		// Start & Stop
		beforeAll(() => Promise.all([master.start(), slaveA.start(), slaveB.start(), slaveC.start()]));
		afterAll(() => Promise.all([master.stop(), slaveA.stop(), slaveB.stop(), slaveC.stop()]));

		it("should call numeric versioned service", () => {
			return master.waitForServices({ name: "math", version: 2 })
				.then(() => Promise.all(_.times(6, () => master.call("v2.math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveA")).toHaveLength(6);
				});
		});

		it("should call string versioned service", () => {
			return master.waitForServices({ name: "math", version: "beta" })
				.then(() => Promise.all(_.times(6, () => master.call("beta.math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveB")).toHaveLength(6);
				});
		});

		it("should call unversioned service", () => {
			return master.waitForServices({ name: "math" })
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "slaveC")).toHaveLength(6);
				});
		});


	});
};
