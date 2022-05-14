"use strict";

const EventLegacyTraceExporter = require("../../../../src/tracing/exporters/event-legacy");
const ServiceBroker = require("../../../../src/service-broker");
const { MoleculerRetryableError } = require("../../../../src/errors");

const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });

describe("Test Event Legacy tracing exporter class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const exporter = new EventLegacyTraceExporter();

			expect(exporter.opts).toEqual({ safetyTags: false, excludes: null });
		});
	});

	describe("Test init method", () => {
		const fakeTracer = { broker, logger: broker.logger };

		it("should set broker timer", () => {
			const exporter = new EventLegacyTraceExporter({});
			exporter.flush = jest.fn();
			exporter.init(fakeTracer);

			expect(exporter.broker).toBe(broker);
		});
	});

	describe("Test spanStarted method", () => {
		const fakeTracer = { broker, logger: broker.logger };
		broker.emit = jest.fn();

		it("should push spans to the queue", () => {
			broker.emit.mockClear();
			const exporter = new EventLegacyTraceExporter({});
			exporter.generateMetricPayload = jest.fn(() => ({ converted: true }));
			exporter.init(fakeTracer);

			const span1 = { tags: {} };

			exporter.spanStarted(span1);

			expect(exporter.generateMetricPayload).toHaveBeenCalledTimes(1);
			expect(exporter.generateMetricPayload).toHaveBeenCalledWith(span1);

			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				converted: true
			});
		});

		it("should skip tracing events", () => {
			broker.emit.mockClear();
			const exporter = new EventLegacyTraceExporter({});
			exporter.generateMetricPayload = jest.fn(() => ({ converted: true }));
			exporter.init(fakeTracer);

			const span1 = { tags: { eventName: "metrics.trace.span.start" } };
			const span2 = { tags: { eventName: "metrics.trace.span.finish" } };

			exporter.spanStarted(span1);
			exporter.spanStarted(span2);

			expect(exporter.generateMetricPayload).toHaveBeenCalledTimes(0);
			expect(broker.emit).toHaveBeenCalledTimes(0);
		});
	});

	describe("Test spanFinished method", () => {
		const fakeTracer = { broker, logger: broker.logger };
		broker.emit = jest.fn();

		it("should push spans to the queue", () => {
			broker.emit.mockClear();
			const exporter = new EventLegacyTraceExporter({});
			exporter.generateMetricPayload = jest.fn(() => ({ converted: true }));
			exporter.init(fakeTracer);

			const span1 = { tags: {} };

			exporter.spanFinished(span1);

			expect(exporter.generateMetricPayload).toHaveBeenCalledTimes(1);
			expect(exporter.generateMetricPayload).toHaveBeenCalledWith(span1);

			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				converted: true
			});
		});

		it("should skip tracing events", () => {
			broker.emit.mockClear();
			const exporter = new EventLegacyTraceExporter({});
			exporter.generateMetricPayload = jest.fn(() => ({ converted: true }));
			exporter.init(fakeTracer);

			const span1 = { tags: { eventName: "metrics.trace.span.start" } };
			const span2 = { tags: { eventName: "metrics.trace.span.finish" } };

			exporter.spanFinished(span1);
			exporter.spanFinished(span2);

			expect(exporter.generateMetricPayload).toHaveBeenCalledTimes(0);
			expect(broker.emit).toHaveBeenCalledTimes(0);
		});
	});

	describe("Test generateMetricPayload", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			opts: { errorFields: ["name", "message", "code"] }
		};
		const exporter = new EventLegacyTraceExporter();
		exporter.init(fakeTracer);
		exporter.processExtraMetrics = jest.fn();

		it("should convert normal span to legacy payload", () => {
			const span = {
				name: "Test Span",
				id: "span-id-123",
				traceID: "trace-id-123",
				parentID: "parent-id-123",

				service: {
					name: "posts",
					version: 1,
					fullName: "v1.posts"
				},

				startTime: 1000,
				finishTime: 1050,
				duration: 50,

				tags: {
					a: 5,
					b: "John",

					callingLevel: 5,
					remoteCall: true,
					action: {
						name: "posts.find",
						rawName: "find"
					},
					callerNodeID: "other-node",
					fromCache: true
				},

				opts: {}
			};

			expect(exporter.generateMetricPayload(span)).toMatchSnapshot();

			expect(exporter.processExtraMetrics).toHaveBeenCalledTimes(0);
		});

		it("should convert errored span to legacy payload", () => {
			const err = new MoleculerRetryableError("Something happened", 512, "SOMETHING", {
				a: 5
			});

			const span = {
				name: "Test Span",
				id: "span-id-123",
				traceID: "trace-id-123",
				parentID: "parent-id-123",

				service: {
					name: "posts",
					version: 1,
					fullName: "v1.posts"
				},

				startTime: 1000,
				finishTime: 1050,
				duration: 50,

				tags: {
					a: 5,
					b: "John",

					callingLevel: 5,
					remoteCall: true,
					action: {
						name: "posts.find",
						rawName: "find"
					},
					callerNodeID: "other-node",
					fromCache: true
				},

				opts: {},

				error: err
			};

			expect(exporter.generateMetricPayload(span)).toMatchSnapshot();

			expect(exporter.processExtraMetrics).toHaveBeenCalledTimes(0);
		});

		it("should call processExtraMetrics", () => {
			exporter.processExtraMetrics = jest.fn();
			const ctx = { a: 5 };

			const span = {
				name: "Test Span",
				id: "span-id-123",
				traceID: "trace-id-123",
				parentID: "parent-id-123",

				service: {
					name: "posts",
					version: 1,
					fullName: "v1.posts"
				},

				startTime: 1000,
				finishTime: 1050,
				duration: 50,

				tags: {
					a: 5,
					b: "John",

					callingLevel: 5,
					remoteCall: true,
					action: {
						name: "posts.find",
						rawName: "find"
					},
					callerNodeID: "other-node",
					fromCache: true
				},

				opts: {
					ctx
				}
			};

			const payload = exporter.generateMetricPayload(span);

			expect(exporter.processExtraMetrics).toHaveBeenCalledTimes(1);
			expect(exporter.processExtraMetrics).toHaveBeenCalledWith(ctx, payload);
		});
	});

	describe("Test processExtraMetrics", () => {
		const fakeTracer = { broker, logger: broker.logger };
		const exporter = new EventLegacyTraceExporter();
		exporter.init(fakeTracer);
		exporter.assignExtraMetrics = jest.fn();

		it("should not call assignExtraMetrics", () => {
			const ctx = {
				action: {}
			};

			const payload = {};

			exporter.processExtraMetrics(ctx, payload);

			expect(exporter.assignExtraMetrics).toHaveBeenCalledTimes(0);
		});

		it("should call assignExtraMetrics", () => {
			const ctx = {
				action: {
					metrics: {}
				}
			};

			const payload = {};

			exporter.processExtraMetrics(ctx, payload);

			expect(exporter.assignExtraMetrics).toHaveBeenCalledTimes(2);
			expect(exporter.assignExtraMetrics).toHaveBeenNthCalledWith(1, ctx, "params", payload);
			expect(exporter.assignExtraMetrics).toHaveBeenNthCalledWith(2, ctx, "meta", payload);
		});
	});

	describe("Test assignExtraMetrics", () => {
		const fakeTracer = { broker, logger: broker.logger };
		const exporter = new EventLegacyTraceExporter();
		exporter.init(fakeTracer);

		it("should add all ctx.params to payload", () => {
			const ctx = {
				action: {
					metrics: {
						params: true
					}
				},
				params: {
					a: 5,
					b: "John",
					c: true
				}
			};

			const payload = {};

			exporter.assignExtraMetrics(ctx, "params", payload);

			expect(payload).toEqual({
				params: {
					a: 5,
					b: "John",
					c: true
				}
			});
		});

		it("should add some ctx.params to payload", () => {
			const ctx = {
				action: {
					metrics: {
						params: ["a", "c"]
					}
				},
				params: {
					a: 5,
					b: "John",
					c: true
				}
			};

			const payload = {};

			exporter.assignExtraMetrics(ctx, "params", payload);

			expect(payload).toEqual({
				params: {
					a: 5,
					c: true
				}
			});
		});

		it("should call custom function", () => {
			const ctx = {
				action: {
					metrics: {
						params: obj => ({ a: 6, b: "Jane", c: obj.c })
					}
				},
				params: {
					a: 5,
					b: "John",
					c: true
				}
			};

			const payload = {};

			exporter.assignExtraMetrics(ctx, "params", payload);

			expect(payload).toEqual({
				params: {
					a: 6,
					b: "Jane",
					c: true
				}
			});
		});
	});
});
