const Promise = require("bluebird");
const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");
const { MoleculerError } = require("../../src/errors");
const { protectReject } = require("../unit/utils");

const lolex = require("lolex");

describe("Test circuit breaker", () => {
	let clock;

	const master1 = new ServiceBroker({
		logger: true,
		transporter: new FakeTransporter(),
		nodeID: "master-1",
		circuitBreaker: {
			enabled: true,
			threshold: 0.5,
			minRequestCount: 5,
			windowTime: 30,
			halfOpenTime: 5 * 1000,
			failureOnReject: true
		}
	});

	const cbOpenedHandler = jest.fn();
	master1.localBus.on("$circuit-breaker.opened", cbOpenedHandler);

	const slave1 = new ServiceBroker({
		logger: true,
		transporter: new FakeTransporter(),
		nodeID: "slave-1",
	});

	slave1.createService({
		name: "cb",
		actions: {
			happy() {
				return "OK";
			},

			angry(ctx) {
				if (ctx.params.please != true)
					return Promise.reject(new MoleculerError("Don't call me!", 555));
				else
					return "Just for you!";
			},

			tired() {
				return Promise.delay(2000).then(() => "OOOKKK");
			}
		}
	});

	beforeAll(() => {
		return master1.start()
			.then(() => slave1.start())
			.delay(100)
			.then(() => clock = lolex.install());
	});

	afterAll(() => {
		return master1.stop()
			.then(() => slave1.stop())
			.then(() => clock.uninstall());
	});

	it("should call 'happy' x5 without problem", () => {
		debugger;
		return master1.call("cb.happy")
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(res => expect(res).toBe("OK"))
			.catch(protectReject);
	});

	it("should call 'angry' and throw MoleculerError", () => {
		return master1.call("cb.angry")
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry", { please: true }))
			.then(res => expect(res).toBe("Just for you!"))
			.catch(protectReject)

			.then(() => master1.call("cb.angry", { please: true }))
			.then(res => expect(res).toBe("Just for you!"))
			.catch(protectReject)

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => {
				expect(err.name).toBe("ServiceNotAvailableError");
				expect(cbOpenedHandler).toHaveBeenCalledTimes(1);
				expect(cbOpenedHandler).toHaveBeenCalledWith({
					nodeID: "slave-1",
					action: "cb.angry",
					failures: 3,
					count: 5,
					rate: 0.6
				});
			});
	});

	it("should switched to half-open and again open", () => {
		cbOpenedHandler.mockClear();
		clock.tick(6000);
		return master1.call("cb.angry")
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry", { please: true }))
			.then(protectReject)
			.catch(err => {
				expect(err.name).toBe("ServiceNotAvailableError");
				expect(cbOpenedHandler).toHaveBeenCalledTimes(1);
				expect(cbOpenedHandler).toHaveBeenCalledWith({
					nodeID: "slave-1",
					action: "cb.angry",
					failures: 4,
					count: 6,
					rate: 0.6666666666666666
				});
			});
	});

	it("should switched to half-open and close", () => {
		clock.tick(6000);
		return master1.call("cb.angry", { please: true })
			.then(res => expect(res).toBe("Just for you!"))
			.catch(protectReject)

			.then(() => master1.call("cb.angry", { please: true }))
			.then(res => expect(res).toBe("Just for you!"))
			.catch(protectReject);
	});

	/*
		TODO: Not working because timer created before lolex install.

	it("should reset values by window timer", () => {
		return master1.call("cb.angry")
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			// Reset
			.then(() => clock.tick(35 * 1000))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => expect(err.name).toBe("MoleculerError"))

			.then(() => master1.call("cb.angry"))
			.then(protectReject)
			.catch(err => {
				expect(err.message).toBe("ServiceNotAvailableError");
				expect(cbOpenedHandler).toHaveBeenCalledTimes(1);
				expect(cbOpenedHandler).toHaveBeenCalledWith({
					node: jasmine.any(Object),
					action: jasmine.any(Object),
					failures: 4,
					passes: 2,
				});
			});
	});

*/
});

