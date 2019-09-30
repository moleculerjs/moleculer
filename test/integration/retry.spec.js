"use strict";

const Promise = require("bluebird");
const _ = require("lodash");
const H = require("./helpers");
const { MoleculerRetryableError } = require("../../src/errors");

describe("Test Retry middleware", () => {
	describe("Test with local actions", () => {

		const FLOW = [];

		const COMMON_SETTINGS = {
			logger: false,
			namespace: "retry-1",
			transporter: "Fake",
			retryPolicy: {
				enabled: true,
				retries: 3
			}
		};

		const TestService = {
			name: "test",
			actions: {
				retry: {
					async handler(ctx) {
						FLOW.push(`CALL-${this.broker.nodeID}-FROM-${ctx.nodeID}`);
						return Promise.reject(new MoleculerRetryableError("Something happened"));
					}
				}
			}
		};

		const broker0 = H.createNode(_.defaultsDeep({ nodeID: "caller" }, COMMON_SETTINGS), [TestService]);
		//const broker1 = H.createNode(_.defaultsDeep({ nodeID: "broker-1" }, COMMON_SETTINGS), [TestService]);

		beforeAll(() => Promise.all([
			broker0.start(),
		]));

		afterAll(() => Promise.all([
			broker0.stop(),
		]));

		it("should retry local calls 3 times", async () => {
			try {
				await broker0.call("test.retry");
				throw new Error("Should throw error");
			} catch(err) {
				expect(err).toBeInstanceOf(MoleculerRetryableError);
				expect(err.name).toBe("MoleculerRetryableError");
				expect(err.message).toBe("Something happened");
				expect(FLOW).toEqual([
					"CALL-caller-FROM-caller",
					"CALL-caller-FROM-caller",
					"CALL-caller-FROM-caller",
					"CALL-caller-FROM-caller",
				]);
			}
		});
	});

	describe("Test with remote actions", () => {

		const FLOW = [];

		const COMMON_SETTINGS = {
			logger: false,
			namespace: "retry-1",
			transporter: "Fake",
			retryPolicy: {
				enabled: true,
				retries: 3
			}
		};

		const TestService = {
			name: "test",
			actions: {
				retry: {
					async handler(ctx) {
						FLOW.push(`CALL-${this.broker.nodeID}-FROM-${ctx.nodeID}`);
						return Promise.reject(new MoleculerRetryableError("Something happened"));
					}
				}
			}
		};

		const broker0 = H.createNode(_.defaultsDeep({ nodeID: "caller" }, COMMON_SETTINGS), []);
		const broker1 = H.createNode(_.defaultsDeep({ nodeID: "broker-1" }, COMMON_SETTINGS), [TestService]);
		const broker2 = H.createNode(_.defaultsDeep({ nodeID: "broker-2" }, COMMON_SETTINGS), [TestService]);

		beforeAll(() => Promise.all([
			broker0.start(),
			broker1.start(),
			broker2.start(),
		]));

		afterAll(() => Promise.all([
			broker0.stop(),
			broker1.stop(),
			broker2.stop(),
		]));

		it("should retry local calls 3 times", async () => {
			try {
				await broker0.call("test.retry");
				throw new Error("Should throw error");
			} catch(err) {
				expect(err).toBeInstanceOf(MoleculerRetryableError);
				expect(err.name).toBe("MoleculerRetryableError");
				expect(err.message).toBe("Something happened");
				expect(FLOW).toEqual([
					"CALL-broker-1-FROM-caller",
					"CALL-broker-2-FROM-caller",
					"CALL-broker-1-FROM-caller",
					"CALL-broker-2-FROM-caller",
				]);
			}
		});

	});

	describe("Test with remote actions and no preferLocal", () => {

		const FLOW = [];

		const COMMON_SETTINGS = {
			logger: false,
			namespace: "retry-1",
			transporter: "Fake",
			registry: {
				preferLocal: false
			},

			retryPolicy: {
				enabled: true,
				retries: 3
			}
		};

		const TestService = {
			name: "test",
			actions: {
				retry: {
					async handler(ctx) {
						FLOW.push(`CALL-${this.broker.nodeID}-FROM-${ctx.nodeID}`);
						return Promise.reject(new MoleculerRetryableError("Something happened"));
					}
				}
			}
		};

		const broker0 = H.createNode(_.defaultsDeep({ nodeID: "caller" }, COMMON_SETTINGS), [TestService]);
		const broker1 = H.createNode(_.defaultsDeep({ nodeID: "broker-1" }, COMMON_SETTINGS), [TestService]);
		const broker2 = H.createNode(_.defaultsDeep({ nodeID: "broker-2" }, COMMON_SETTINGS), [TestService]);

		beforeAll(() => Promise.all([
			broker0.start(),
			broker1.start(),
			broker2.start(),
		]));

		afterAll(() => Promise.all([
			broker0.stop(),
			broker1.stop(),
			broker2.stop(),
		]));

		it("should retry local calls 3 times", async () => {
			try {
				await broker0.call("test.retry");
				throw new Error("Should throw error");
			} catch(err) {
				expect(err).toBeInstanceOf(MoleculerRetryableError);
				expect(err.name).toBe("MoleculerRetryableError");
				expect(err.message).toBe("Something happened");
				expect(FLOW).toEqual([
					"CALL-caller-FROM-caller",
					"CALL-broker-1-FROM-caller",
					"CALL-broker-2-FROM-caller",
					"CALL-caller-FROM-caller",
				]);
			}
		});

	});

});

