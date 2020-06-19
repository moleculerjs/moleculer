/* eslint-disable no-console */

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

module.exports = function(transporter, serializer)  {

	describe("Test normal calling", () => {

		// Creater brokers
		const [master, replicaA, replicaB, replicaC] = createBrokers(["master", "replicaA", "replicaB", "replicaC"], {
			namespace: "call",
			transporter,
			serializer
		});

		// Load services
		[replicaA, replicaB, replicaC].forEach(broker => broker.createService(mathService));

		// Start & Stop
		beforeAll(() => Promise.all([master.start(), replicaA.start(), replicaB.start()]));
		afterAll(() => Promise.all([master.stop(), replicaA.stop(), replicaB.stop()]));

		it("should call actions with balancing between 2 nodes", () => {
			return master.waitForServices("math")
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaA")).toHaveLength(3);
					expect(res.filter(o => o.node == "replicaB")).toHaveLength(3);
				});
		});

		it("start replicaC", () => {
			return replicaC.start().delay(500);
		});

		it("should call actions with balancing between 3 nodes", () => {
			return master.waitForServices("math")
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaA")).toHaveLength(2);
					expect(res.filter(o => o.node == "replicaB")).toHaveLength(2);
					expect(res.filter(o => o.node == "replicaC")).toHaveLength(2);
				});
		});

		it("stop replicaC", () => {
			return replicaC.stop().delay(500);
		});

		it("should call actions without replicaC node", () => {
			return master.waitForServices("math")
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaA")).toHaveLength(3);
					expect(res.filter(o => o.node == "replicaB")).toHaveLength(3);
					expect(res.filter(o => o.node == "replicaC")).toHaveLength(0);
				});
		});


		it("should direct call action on the specified node", () => {
			return master.waitForServices("math")
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 20, b: 30 }, { nodeID: "replicaB" }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 50)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaA")).toHaveLength(0);
					expect(res.filter(o => o.node == "replicaB")).toHaveLength(6);
				});
		});
	});

	describe("Test normal calling with versioned services", () => {

		// Creater brokers
		const [master, replicaA, replicaB, replicaC] = createBrokers(["master", "replicaA", "replicaB", "replicaC"], {
			namespace: "version-call",
			transporter,
			serializer
		});

		// Load services
		replicaA.createService(Object.assign({}, mathService, { version: 2 }));
		replicaB.createService(Object.assign({}, mathService, { version: "beta" }));
		replicaC.createService(mathService);

		// Start & Stop
		beforeAll(() => Promise.all([master.start(), replicaA.start(), replicaB.start(), replicaC.start()]));
		afterAll(() => Promise.all([master.stop(), replicaA.stop(), replicaB.stop(), replicaC.stop()]));

		it("should call numeric versioned service", () => {
			return master.waitForServices({ name: "math", version: 2 })
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("v2.math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaA")).toHaveLength(6);
				});
		});

		it("should call string versioned service", () => {
			return master.waitForServices({ name: "math", version: "beta" })
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("beta.math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaB")).toHaveLength(6);
				});
		});

		it("should call unversioned service", () => {
			return master.waitForServices({ name: "math" })
				.delay(500)
				.then(() => Promise.all(_.times(6, () => master.call("math.add", { a: 50, b: 13 }))))
				.catch(protectReject)
				.then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(res.filter(o => o.result == 63)).toHaveLength(6);
					expect(res.filter(o => o.node == "replicaC")).toHaveLength(6);
				});
		});


	});
};
