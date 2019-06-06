"use strict";

const Exporters = require("../../../src/tracing/exporters");
const fakeExporter = {
	init: jest.fn(),
	someMethod: jest.fn()
};

Exporters.resolve = jest.fn(() => fakeExporter);

const fakeSpan = {
	id: "span-123",
	start: jest.fn()
};
jest.mock("../../../src/tracing/span", () => {
	return jest.fn().mockImplementation(() => fakeSpan);
});

/*
const utils = require("../../../src/utils");
utils.generateToken = () => "12345678-abcdef";

jest.mock("../../../src/tracing/now", () => {
	return jest.fn().mockImplementation(() => 10203040);
});
const now = require("../../../src/tracing/now");*/

const lolex = require("lolex");
const ServiceBroker = require("../../../src/service-broker");
const Tracer = require("../../../src/tracing/tracer");
const Span = require("../../../src/tracing/span");

describe("Test Tracer", () => {
	const broker = new ServiceBroker({ logger: false });

	describe("Test Constructor", () => {

		it("should create with default options", () => {

			const tracer = new Tracer(broker);

			expect(tracer.broker).toBe(broker);
			expect(tracer.logger).toBeDefined();
			expect(tracer.opts).toEqual({
				enabled: true,

				exporters: null,

				sampling: {
					rate: 1.0,
					minPriority: null
				},

				actions: true,
				methods: false,
				events: false,

				errorFields: ["name", "message", "code", "type", "data"],
				stackTrace: false,

				defaultTags: null,
			});

			expect(tracer.sampleCounter).toBe(0);
			expect(tracer.scope).toBeDefined();
		});

		it("should use options", () => {
			const tracer = new Tracer(broker, {
				sampling: {
					rate: 0.5
				},

				methods: true,

				stackTrace: true,

				defaultTags: {
					a: 5
				}
			});

			expect(tracer.broker).toBe(broker);
			expect(tracer.logger).toBeDefined();
			expect(tracer.opts).toEqual({
				enabled: true,

				exporters: null,

				sampling: {
					rate: 0.5,
					minPriority: null
				},

				actions: true,
				methods: true,
				events: false,

				errorFields: ["name", "message", "code", "type", "data", "stack"],
				stackTrace: true,

				defaultTags: {
					a: 5
				},
			});

			expect(tracer.sampleCounter).toBe(0);
			expect(tracer.scope).toBeDefined();
		});

		it("should enable if options is TRUE", () => {
			const tracer = new Tracer(broker, true);

			expect(tracer.opts.enabled).toBe(true);
		});

		it("should disable if options is FALSE", () => {
			const tracer = new Tracer(broker, false);

			expect(tracer.opts.enabled).toBe(false);
		});
	});

	describe("Test init", () => {
		it("should not initialize exporter if disabled", () => {
			Exporters.resolve.mockClear();
			fakeExporter.init.mockClear();

			const tracer = new Tracer(broker, {
				enabled: false,
				exporter: "Exporter1"
			});

			tracer.init();

			expect(tracer.exporter).toBeUndefined();
			expect(Exporters.resolve).toBeCalledTimes(0);
			expect(fakeExporter.init).toBeCalledTimes(0);
		});

		it("should initialize one exporter", () => {
			Exporters.resolve.mockClear();
			fakeExporter.init.mockClear();

			const tracer = new Tracer(broker, {
				enabled: true,
				exporter: "Exporter1"
			});

			tracer.init();

			expect(tracer.exporter.length).toBe(1);
			expect(Exporters.resolve).toBeCalledTimes(1);
			expect(Exporters.resolve).toHaveBeenNthCalledWith(1, "Exporter1");
			expect(fakeExporter.init).toBeCalledTimes(1);
			expect(fakeExporter.init).toHaveBeenNthCalledWith(1, tracer);
		});

		it("should initialize exporters", () => {
			Exporters.resolve.mockClear();
			fakeExporter.init.mockClear();

			const tracer = new Tracer(broker, {
				exporter: ["Exporter1", {
					type: "Datadog",
					options: {
						a: 5
					}
				}]
			});

			tracer.init();

			expect(tracer.exporter.length).toBe(2);
			expect(Exporters.resolve).toBeCalledTimes(2);
			expect(Exporters.resolve).toHaveBeenNthCalledWith(1, "Exporter1");
			expect(Exporters.resolve).toHaveBeenNthCalledWith(2, {
				type: "Datadog",
				options: {
					a: 5
				}
			});

			expect(fakeExporter.init).toBeCalledTimes(2);
			expect(fakeExporter.init).toHaveBeenNthCalledWith(1, tracer);
			expect(fakeExporter.init).toHaveBeenNthCalledWith(2, tracer);
		});

	});

	describe("Test isEnabled", () => {

		it("should return false if disabled", () => {
			const tracer = new Tracer(broker, {
				enabled: false
			});

			tracer.init();

			expect(tracer.isEnabled()).toBe(false);
		});

		it("should return true if disabled", () => {
			const tracer = new Tracer(broker, {
				enabled: true
			});

			tracer.init();

			expect(tracer.isEnabled()).toBe(true);
		});

	});

	describe("Test shouldSample", () => {

		it("should check the span priority", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				sampling: {
					minPriority: 3,
					rate: 1
				}
			});

			tracer.init();

			expect(tracer.shouldSample({ priority: 1 })).toBe(false);
			expect(tracer.shouldSample({ priority: 2 })).toBe(false);
			expect(tracer.shouldSample({ priority: 3 })).toBe(true);
			expect(tracer.shouldSample({ priority: 4 })).toBe(true);
			expect(tracer.shouldSample({ priority: 5 })).toBe(true);
		});

		it("should check the sampling rate (1.0)", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				sampling: {
					rate: 1
				}
			});

			tracer.init();

			expect(tracer.shouldSample({ priority: 1 })).toBe(true);
			expect(tracer.shouldSample({ priority: 2 })).toBe(true);
			expect(tracer.shouldSample({ priority: 3 })).toBe(true);
			expect(tracer.shouldSample({ priority: 4 })).toBe(true);
			expect(tracer.shouldSample({ priority: 5 })).toBe(true);
		});

		it("should check the sampling rate (0.5)", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				sampling: {
					rate: 0.5
				}
			});

			tracer.init();

			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(true);
			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(true);
			expect(tracer.shouldSample()).toBe(false);
		});

		it("should check the sampling rate (0)", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				sampling: {
					rate: 0
				}
			});

			tracer.init();

			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(false);
			expect(tracer.shouldSample()).toBe(false);
		});

	});

	describe("Test startSpan", () => {

		it("should create a new span", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				defaultTags: {
					def: "ault"
				}
			});

			tracer.init();

			tracer.getCurrentSpan = jest.fn();
			tracer.setCurrentSpan = jest.fn();

			const span = tracer.startSpan("new-span", { tags: { a: 5 } });

			expect(span).toBe(fakeSpan);

			expect(tracer.getCurrentSpan).toHaveBeenCalledTimes(1);

			expect(Span).toHaveBeenCalledTimes(1);
			expect(Span).toHaveBeenCalledWith(tracer, "new-span", {
				type: "custom",
				defaultTags: {
					"def": "ault"
				},
				parentID: null,
				tags: { "a": 5 },
			});

			expect(tracer.setCurrentSpan).toHaveBeenCalledTimes(1);
			expect(tracer.setCurrentSpan).toHaveBeenCalledWith(span);

			expect(fakeSpan.start).toHaveBeenCalledTimes(1);
		});

		it("should create a new span with parent", () => {
			Span.mockClear();
			fakeSpan.start.mockClear();

			const tracer = new Tracer(broker, {
				enabled: true,
				defaultTags: {
					def: "ault"
				}
			});

			tracer.init();

			tracer.getCurrentSpan = jest.fn(() => ({ id: "parent-123" }));
			tracer.setCurrentSpan = jest.fn();

			const span = tracer.startSpan("new-span", { tags: { a: 5 } });

			expect(span).toBe(fakeSpan);

			expect(tracer.getCurrentSpan).toHaveBeenCalledTimes(1);

			expect(Span).toHaveBeenCalledTimes(1);
			expect(Span).toHaveBeenCalledWith(tracer, "new-span", {
				type: "custom",
				defaultTags: {
					"def": "ault"
				},
				parentID: "parent-123",
				tags: { "a": 5 },
			});

			expect(tracer.setCurrentSpan).toHaveBeenCalledTimes(1);
			expect(tracer.setCurrentSpan).toHaveBeenCalledWith(span);

			expect(fakeSpan.start).toHaveBeenCalledTimes(1);
		});

	});

	describe("Test invokeExporter", () => {

		it("should do nothing if no exporter", () => {
			Exporters.resolve.mockClear();
			fakeExporter.init.mockClear();

			const tracer = new Tracer(broker, {
				enabled: true
			});

			tracer.init();

			tracer.invokeExporter("someMethod", [5, "John"]);

			expect(fakeExporter.someMethod).toBeCalledTimes(0);
		});

		it("should call a method in exporters", () => {
			Exporters.resolve.mockClear();
			fakeExporter.init.mockClear();

			const tracer = new Tracer(broker, {
				enabled: true,
				exporter: ["Exporter1", "Exporter2"]
			});

			tracer.init();

			tracer.invokeExporter("someMethod", [5, "John"]);

			expect(fakeExporter.someMethod).toBeCalledTimes(2);
			expect(fakeExporter.someMethod).toHaveBeenNthCalledWith(1, 5, "John");
			expect(fakeExporter.someMethod).toHaveBeenNthCalledWith(2, 5, "John");
		});

	});

	describe("Test spanFinished", () => {

		it("should call removeCurrentSpan & invokeExporter", () => {
			const tracer = new Tracer(broker, {
				enabled: true,
				exporter: ["Exporter1", "Exporter2"]
			});

			tracer.init();

			tracer.removeCurrentSpan = jest.fn();
			tracer.invokeExporter = jest.fn();

			const span = { id: "span-111" };
			tracer.spanFinished(span);

			expect(tracer.removeCurrentSpan).toBeCalledTimes(1);
			expect(tracer.removeCurrentSpan).toHaveBeenCalledWith(span);

			expect(tracer.invokeExporter).toBeCalledTimes(1);
			expect(tracer.invokeExporter).toHaveBeenCalledWith("finishSpan", [span]);
		});

	});

	describe("Test current span handling", () => {

		const tracer = new Tracer(broker, true);
		tracer.init();

		tracer.scope.getSessionData = jest.fn(() => null);
		tracer.scope.setSessionData = jest.fn();

		const span1 = { id: "span-1", meta: {} };
		const span2 = { id: "span-2", meta: {} };

		it("should create a new state", () => {
			tracer.setCurrentSpan(span1);

			expect(span1.meta.state).toEqual({ spans: [ span1 ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(1);

			expect(tracer.scope.setSessionData).toHaveBeenCalledTimes(1);
			expect(tracer.scope.setSessionData).toHaveBeenCalledWith({ spans: [ span1 ] });
		});

		it("should store new span into existing state", () => {
			tracer.scope.setSessionData.mockClear();

			const state = { spans: [ span1 ] };
			tracer.scope.getSessionData = jest.fn(() => state);

			tracer.setCurrentSpan(span2);

			expect(span1.meta.state).toEqual({ spans: [ span1 ] });
			expect(span2.meta.state).toEqual({ spans: [ span1, span2 ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(1);

			expect(tracer.scope.setSessionData).toHaveBeenCalledTimes(1);
			expect(tracer.scope.setSessionData).toHaveBeenCalledWith({ spans: [ span1, span2 ] });
		});

		it("should get the last span", () => {
			const state = { spans: [ span1, span2 ] };
			tracer.scope.getSessionData = jest.fn(() => state);

			const res = tracer.getCurrentSpan();

			expect(res).toBe(span2);
		});

		it("should not get any span", () => {
			tracer.scope.getSessionData = jest.fn(() => null);

			const res = tracer.getCurrentSpan();

			expect(res).toBe(null);
		});

		it("should remove itself from state", () => {
			tracer.scope.getSessionData.mockClear();

			tracer.removeCurrentSpan(span2);
			expect(span2.meta.state).toEqual({ spans: [ span1 ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(0);

			tracer.removeCurrentSpan(span1);
			expect(span1.meta.state).toEqual({ spans: [ ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(0);

			tracer.removeCurrentSpan(span1);
			expect(span1.meta.state).toEqual({ spans: [ ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(0);

		});

		it("should remove itself from a coming state", () => {
			span2.meta.state = null;
			const state = { spans: [ span2, span1 ] };
			tracer.scope.getSessionData = jest.fn(() => state);

			tracer.removeCurrentSpan(span2);

			expect(state).toEqual({ spans: [ span1 ] });

			expect(tracer.scope.getSessionData).toBeCalledTimes(1);
		});

		it("should return null if not state", () => {
			tracer.scope.getSessionData = jest.fn(() => null);

			const res = tracer.getCurrentSpan();
			expect(res).toBe(null);

			expect(tracer.scope.getSessionData).toBeCalledTimes(1);
		});

		it("should return the last span", () => {
			const state = { spans: [ span1, span2 ] };
			tracer.scope.getSessionData = jest.fn(() => state);

			const res = tracer.getCurrentSpan();
			expect(res).toBe(span2);

			expect(tracer.scope.getSessionData).toBeCalledTimes(1);
		});

	});

	describe("Test getCurrentTraceID & getActiveSpanID", () => {

		it("should return IDs", () => {
			const tracer = new Tracer(broker, true);
			tracer.init();

			tracer.getCurrentSpan = jest.fn(() => ({ id: "span-123", traceID: "trace-123" }));

			expect(tracer.getCurrentTraceID()).toBe("trace-123");
			expect(tracer.getCurrentSpan).toBeCalledTimes(1);

			tracer.getCurrentSpan.mockClear();
			expect(tracer.getActiveSpanID()).toBe("span-123");
			expect(tracer.getCurrentSpan).toBeCalledTimes(1);
		});

		it("should not return IDs", () => {
			const tracer = new Tracer(broker, true);
			tracer.init();

			tracer.getCurrentSpan = jest.fn(() => null);

			expect(tracer.getCurrentTraceID()).toBe(null);
			expect(tracer.getCurrentSpan).toBeCalledTimes(1);

			tracer.getCurrentSpan.mockClear();
			expect(tracer.getActiveSpanID()).toBe(null);
			expect(tracer.getCurrentSpan).toBeCalledTimes(1);
		});

	});
});

