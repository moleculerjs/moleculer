"use strict";

const lolex = require("lolex");

const EventTraceExporter = require("../../../../src/tracing/exporters/event");
const ServiceBroker = require("../../../../src/service-broker");

const broker = new ServiceBroker({ logger: false });

describe("Test Event tracing exporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const exporter = new EventTraceExporter();

			expect(exporter.opts).toEqual({
				eventName: "$tracing.spans",
				sendStartSpan: false,
				sendFinishSpan: true,
				broadcast: false,
				groups: null,
				interval: 5,
				spanConverter: null,
				defaultTags: null
			});

			expect(exporter.queue).toBeInstanceOf(Array);
		});

		it("should create with custom options", () => {
			const exporter = new EventTraceExporter({
				eventName: "my-tracing.spans",
				sendStartSpan: true,
				sendFinishSpan: true,
				broadcast: true,
				interval: 10,

				defaultTags: {
					a: 5
				}
			});

			expect(exporter.opts).toEqual({
				eventName: "my-tracing.spans",
				sendStartSpan: true,
				sendFinishSpan: true,
				broadcast: true,
				groups: null,
				interval: 10,

				spanConverter: null,
				defaultTags: {
					a: 5
				}
			});
		});

	});

	describe("Test init method", () => {
		const fakeTracer = { broker, logger: broker.logger };

		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should create timer", () => {
			const exporter = new EventTraceExporter({});
			exporter.flush = jest.fn();
			exporter.init(fakeTracer);

			expect(exporter.broker).toBe(broker);

			expect(exporter.timer).toBeDefined();
			expect(exporter.flush).toBeCalledTimes(0);

			clock.tick(5500);

			expect(exporter.flush).toBeCalledTimes(1);
		});

		it("should not create timer", () => {
			const exporter = new EventTraceExporter({ interval: 0 });
			exporter.init(fakeTracer);

			expect(exporter.timer).toBeUndefined();
		});

		it("should flatten default tags", () => {
			const exporter = new EventTraceExporter({ defaultTags: { a: { b: "c" } } });
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				a: {
					b: "c"
				}
			});
		});

		it("should call defaultTags function", () => {
			const fn = jest.fn(() => ({ a: { b: 5 } }));
			const exporter = new EventTraceExporter({ defaultTags: fn });
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				a: {
					b: 5
				}
			});

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenNthCalledWith(1, fakeTracer);
		});

	});

	describe("Test finishSpan method", () => {
		const fakeTracer = { broker, logger: broker.logger };

		it("should push spans to the queue", () => {
			const exporter = new EventTraceExporter({});
			exporter.init(fakeTracer);

			expect(exporter.queue).toEqual([]);

			const span1 = {};
			const span2 = {};

			exporter.finishSpan(span1);
			exporter.finishSpan(span2);

			expect(exporter.queue).toEqual([span1, span2]);
		});

		it("should not push spans to the queue", () => {
			const exporter = new EventTraceExporter({ sendFinishSpan: false });
			exporter.init(fakeTracer);

			expect(exporter.queue).toEqual([]);

			const span1 = {};
			const span2 = {};

			exporter.finishSpan(span1);
			exporter.finishSpan(span2);

			expect(exporter.queue.length).toBe(0);
		});

	});

	describe("Test flush method", () => {
		const fakeTracer = { broker, logger: broker.logger };

		broker.emit = jest.fn();
		broker.broadcast = jest.fn();

		const exporter = new EventTraceExporter({});
		exporter.init(fakeTracer);

		exporter.generateTracingData = jest.fn(() => ([{ a: 5 }]));

		it("should not generate data if queue is empty", () => {
			exporter.flush();

			expect(exporter.generateTracingData).toHaveBeenCalledTimes(0);
		});

		it("should generate & emit event", () => {
			exporter.finishSpan({});

			exporter.flush();

			expect(exporter.generateTracingData).toHaveBeenCalledTimes(1);
			expect(exporter.queue.length).toEqual(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("$tracing.spans", [{ a: 5 }], { groups: null });
		});

		it("should generate & broadcast event with groups", () => {
			exporter.generateTracingData.mockClear();
			broker.emit.mockClear();

			exporter.opts.broadcast = true;
			exporter.opts.groups = ["mail", "payment"];
			exporter.finishSpan({});

			exporter.flush();

			expect(exporter.generateTracingData).toHaveBeenCalledTimes(1);
			expect(exporter.queue.length).toEqual(0);
			expect(broker.emit).toHaveBeenCalledTimes(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$tracing.spans", [{ a: 5 }], { groups: ["mail", "payment"] });
		});

	});

	describe("Test generateTracingData method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger
		};

		it("should return with a new array", () => {
			const exporter = new EventTraceExporter({});
			exporter.init(fakeTracer);

			exporter.queue.push({ a: 5 }, { b: 10 });

			const res = exporter.generateTracingData();

			expect(res).toEqual([
				{ a: 5 },
				{ b: 10 }
			]);

			expect(res).not.toBe(exporter.queue);
		});

		it("should call spanConverter", () => {
			const spanConverter = jest.fn(span => Object.assign({ converted: true }, span));
			const exporter = new EventTraceExporter({ spanConverter });
			exporter.init(fakeTracer);

			exporter.queue.push({ a: 5 }, { b: 10 });

			const res = exporter.generateTracingData();

			expect(spanConverter).toHaveBeenCalledTimes(2);
			expect(spanConverter).toHaveBeenNthCalledWith(1, { a: 5 });
			expect(spanConverter).toHaveBeenNthCalledWith(2, { b: 10 });

			expect(res).toEqual([
				{ a: 5, converted: true },
				{ b: 10, converted: true }
			]);

			expect(res).not.toBe(exporter.queue);
		});
	});

	describe("Test startSpan & finishSpan method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger
		};

		it("should push into queue only finishSpan", () => {
			const exporter = new EventTraceExporter({});
			exporter.init(fakeTracer);

			exporter.startSpan({ a: 5 });
			exporter.finishSpan({ b: 10 });

			expect(exporter.queue).toEqual([
				{ b: 10 }
			]);
		});

		it("should push into queue only startSpan", () => {
			const exporter = new EventTraceExporter({ sendStartSpan: true, sendFinishSpan: false });
			exporter.init(fakeTracer);

			exporter.startSpan({ a: 5 });
			exporter.finishSpan({ b: 10 });

			expect(exporter.queue).toEqual([
				{ a: 5 }
			]);
		});

		it("should not push any span", () => {
			const exporter = new EventTraceExporter({ sendFinishSpan: false });
			exporter.init(fakeTracer);

			exporter.startSpan({ a: 5 });
			exporter.finishSpan({ b: 10 });

			expect(exporter.queue).toEqual([]);
		});

		it("should push all spans & call flush", () => {
			const exporter = new EventTraceExporter({ sendStartSpan: true, sendFinishSpan: true, interval: 0 });
			exporter.flush = jest.fn();
			exporter.init(fakeTracer);

			exporter.startSpan({ a: 5 });
			exporter.finishSpan({ b: 10 });

			expect(exporter.queue).toEqual([
				{ a: 5 },
				{ b: 10 },
			]);

			expect(exporter.flush).toHaveBeenCalledTimes(2);
		});

	});

	describe("Test generateTracingData method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger
		};

		it("should return with a new array", () => {
			const exporter = new EventTraceExporter({});
			exporter.init(fakeTracer);

			exporter.queue.push({ a: 5 }, { b: 10 });

			const res = exporter.generateTracingData();

			expect(res).toEqual([
				{ a: 5 },
				{ b: 10 }
			]);

			expect(res).not.toBe(exporter.queue);
		});

		it("should call spanConverter", () => {
			const spanConverter = jest.fn(span => Object.assign({ converted: true }, span));
			const exporter = new EventTraceExporter({ spanConverter });
			exporter.init(fakeTracer);

			exporter.queue.push({ a: 5 }, { b: 10 });

			const res = exporter.generateTracingData();

			expect(spanConverter).toHaveBeenCalledTimes(2);
			expect(spanConverter).toHaveBeenNthCalledWith(1, { a: 5 });
			expect(spanConverter).toHaveBeenNthCalledWith(2, { b: 10 });

			expect(res).toEqual([
				{ a: 5, converted: true },
				{ b: 10, converted: true }
			]);

			expect(res).not.toBe(exporter.queue);
		});
	});

});
