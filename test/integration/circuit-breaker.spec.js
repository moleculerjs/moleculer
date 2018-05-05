const Promise = require("bluebird");
const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");
const { MoleculerError, ServiceNotAvailable } = require("../../src/errors");

const lolex = require("lolex");

describe("Test circuit breaker", () => {
	let clock;

	const master1 = new ServiceBroker({
		logger: false,
		transporter: new FakeTransporter(),
		nodeID: "master-1",
		circuitBreaker: {
			enabled: true,
			maxFailures: 2,
			halfOpenTime: 5 * 1000,
			failureOnReject: true
		}
	});

	const slave1 = new ServiceBroker({
		logger: false,
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
		return master1.call("cb.happy")
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(() => master1.call("cb.happy"))
			.then(res => expect(res).toBe("OK"));
	});

	it("should return 'angry' with MoleculerError", () => {
		return master1.call("cb.angry")
			.catch(err => {
				expect(err.name).toBe("MoleculerError");
				return master1.call("cb.angry");
			})
			.catch(err => {
				expect(err.name).toBe("MoleculerError");
				return master1.call("cb.angry");
			})
			// Circuit-breaker opened
			.catch(err => {
				expect(err).toBeInstanceOf(ServiceNotAvailable);
				return "done";
			})
			.then(res => {
				expect(res).toBe("done");
			});
	});

	it("should switched to half-open and again open", () => {
		clock.tick(6000);
		return master1.call("cb.angry")
			.catch(err => {
				expect(err.name).toBe("MoleculerError");
				return "done";
			})
			.then(res => expect(res).toBe("done"))

			.then(() => master1.call("cb.angry", { please: true }))
			.catch(err => {
				expect(err).toBeInstanceOf(ServiceNotAvailable);
				return "done2";
			})
			.then(res => expect(res).toBe("done2"));
	});

	it("should switched to half-open and close", () => {
		clock.tick(6000);
		return master1.call("cb.angry", { please: true })
			.then(res => {
				expect(res).toBe("Just for you!");
			});
	});

});

