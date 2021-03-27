"use strict";

const utils = require("../../../src/utils");
utils.generateToken = () => "12345678-abcdef";

const dateNow = jest.spyOn(Date, "now").mockReturnValue(10203040);
const now = jest.fn().mockReturnValue(0);
jest.mock("perf_hooks", () => ({
	performance: {
		now
	}
}));

const ServiceBroker = require("../../../src/service-broker");
const Span = require("../../../src/tracing/span");

describe("Test Tracing Span", () => {
	const broker = new ServiceBroker({ logger: false });

	describe("Test Constructor", () => {
		const tracer = {
			broker,
			logger: {},
			shouldSample: jest.fn(() => true)
		};

		it("should create with default options", () => {

			const span = new Span(tracer, "test-123");

			expect(span.tracer).toBe(tracer);
			expect(span.logger).toBe(tracer.logger);
			expect(span.opts).toEqual({});
			expect(span.meta).toEqual({});

			expect(span.name).toBe("test-123");
			expect(span.type).toBe("custom");
			expect(span.id).toBe("12345678-abcdef");
			expect(span.traceID).toBe(span.id);
			expect(span.parentID).toBeUndefined();
			expect(span.service).toBeUndefined();

			expect(span.priority).toBe(5);
			expect(span.sampled).toBe(true);

			expect(span.startTime).toBeNull();
			expect(span.finishTime).toBeNull();
			expect(span.duration).toBeNull();
			expect(span.error).toBeNull();

			expect(span.logs).toEqual([]);
			expect(span.tags).toEqual({});

			expect(tracer.shouldSample).toBeCalledTimes(1);
			expect(tracer.shouldSample).toBeCalledWith(span);
		});

		it("should use options", () => {
			tracer.shouldSample.mockClear();

			const opts = {
				id: "my-id",
				type: "web",
				parentID: "parent-id",
				service: {
					name: "posts",
					version: 2,
					fullName: "v2.posts"
				},
				priority: 4,
				sampled: false,
				defaultTags: {
					a: 5,
					b: "John",
				},
				tags: {
					b: "Jane",
					c: 1000
				}
			};
			const span = new Span(tracer, "test-234", opts);

			expect(span.tracer).toBe(tracer);
			expect(span.logger).toBe(tracer.logger);
			expect(span.opts).toEqual(opts);
			expect(span.meta).toEqual({});

			expect(span.name).toBe("test-234");
			expect(span.type).toBe("web");
			expect(span.id).toBe("my-id");
			expect(span.traceID).toBe(span.id);
			expect(span.parentID).toBe("parent-id");
			expect(span.service).toEqual(opts.service);

			expect(span.priority).toBe(4);
			expect(span.sampled).toBe(false);

			expect(span.startTime).toBeNull();
			expect(span.finishTime).toBeNull();
			expect(span.duration).toBeNull();
			expect(span.error).toBeNull();

			expect(span.logs).toEqual([]);
			expect(span.tags).toEqual({
				a: 5,
				b: "Jane",
				c: 1000
			});

			expect(tracer.shouldSample).toBeCalledTimes(0);
		});

		it("should use options and service as string", () => {
			tracer.shouldSample.mockClear();

			const opts = {
				id: "my-id",
				type: "web",
				parentID: "parent-id",
				service: "v2.posts",
				priority: 4,
				sampled: false,
				defaultTags: {
					a: 5,
					b: "John",
				},
				tags: {
					b: "Jane",
					c: 1000
				}
			};
			const span = new Span(tracer, "test-234", opts);

			expect(span.tracer).toBe(tracer);
			expect(span.logger).toBe(tracer.logger);
			expect(span.opts).toEqual(opts);
			expect(span.meta).toEqual({});

			expect(span.name).toBe("test-234");
			expect(span.type).toBe("web");
			expect(span.id).toBe("my-id");
			expect(span.traceID).toBe(span.id);
			expect(span.parentID).toBe("parent-id");
			expect(span.service).toEqual({
				name: "v2.posts",
				fullName: "v2.posts",
			});

			expect(span.priority).toBe(4);
			expect(span.sampled).toBe(false);

			expect(span.startTime).toBeNull();
			expect(span.finishTime).toBeNull();
			expect(span.duration).toBeNull();
			expect(span.error).toBeNull();

			expect(span.logs).toEqual([]);
			expect(span.tags).toEqual({
				a: 5,
				b: "Jane",
				c: 1000
			});

			expect(tracer.shouldSample).toBeCalledTimes(0);
		});

	});

	describe("Test span starting", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn()
		};

		it("should set current time as startTime", () => {
			dateNow.mockClear();
			now.mockClear();
			const span = new Span(fakeTracer, "start-1");
			span.start();

			expect(span.startTime).toBe(10203040);

			expect(dateNow).toBeCalledTimes(1);
			expect(now).toBeCalledTimes(1);
			expect(fakeTracer.spanStarted).toBeCalledTimes(1);
			expect(fakeTracer.spanStarted).toBeCalledWith(span);
		});

		it("should set the given time as startTime", () => {
			dateNow.mockClear();
			now.mockClear();
			fakeTracer.spanStarted.mockClear();

			const span = new Span(fakeTracer, "start-2");
			span.start(55555555);

			expect(span.startTime).toBe(55555555);

			expect(dateNow).toBeCalledTimes(0);
			expect(now).toBeCalledTimes(1);
			expect(fakeTracer.spanStarted).toBeCalledTimes(1);
			expect(fakeTracer.spanStarted).toBeCalledWith(span);
		});

	});

	describe("Test span addTags", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn()
		};

		const span = new Span(fakeTracer, "start-3", {
			tags: {
				a: 5
			}
		});
		span.start();

		it("should store tags", () => {
			span.addTags({
				a: 10,
				b: "John",
				c: {
					d: true,
					e: "string"
				}
			});

			expect(span.tags).toEqual({
				a: 10,
				b: "John",
				c: {
					d: true,
					e: "string"
				}
			});
		});

		it("should append new tags", () => {
			span.addTags({
				a: 25,
				c: {
					f: "ffff"
				}
			});

			expect(span.tags).toEqual({
				a: 25,
				b: "John",
				c: {
					f: "ffff"
				}
			});
		});

	});

	describe("Test log method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn()
		};

		const span = new Span(fakeTracer, "start-4");
		span.start(10203020);

		it("should store log item without time", () => {
			now.mockReturnValueOnce(20);
			span.log("first-log", {
				a: 10,
				b: "John",
				c: {
					d: true,
					e: "string"
				}
			});

			expect(span.logs).toEqual([{
				name: "first-log",
				time: 10203040,
				elapsed: 20,
				fields: {
					a: 10,
					b: "John",
					c: {
						d: true,
						e: "string"
					}
				}
			}]);
		});

		it("should store log with time", () => {
			now.mockReturnValueOnce(20);
			span.log("second-log", {
				a: 100
			}, 10203030);

			expect(span.logs).toEqual([{
				name: "first-log",
				time: 10203040,
				elapsed: 20,
				fields: {
					a: 10,
					b: "John",
					c: {
						d: true,
						e: "string"
					}
				}
			},{
				name: "second-log",
				time: 10203030,
				elapsed: 10,
				fields: {
					a: 100
				}
			}]);
		});

	});

	describe("Test isActive method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn(),
			spanFinished: jest.fn()
		};

		const span = new Span(fakeTracer, "start-5");
		span.start();

		it("should return true", () => {
			expect(span.isActive()).toBe(true);
		});

		it("should return false", () => {
			span.finish();
			expect(span.isActive()).toBe(false);
		});

	});

	describe("Test setError method", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn()
		};

		const span = new Span(fakeTracer, "start-5");
		span.start();

		it("should set error property", () => {
			expect(span.error).toBeNull();

			const err = new Error();

			span.setError(err);

			expect(span.error).toBe(err);
		});

	});

	describe("Test span finishing", () => {
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn(),
			spanFinished: jest.fn()
		};

		it("should set current time as finishTime", () => {
			now.mockClear();
			const span = new Span(fakeTracer, "start-6");
			span.start(10203000);
			now.mockReturnValueOnce(40);
			span.finish();

			expect(span.finishTime).toBe(10203040);
			expect(span.duration).toBe(40);

			expect(now).toBeCalledTimes(2);
			expect(fakeTracer.spanFinished).toBeCalledTimes(1);
			expect(fakeTracer.spanFinished).toBeCalledWith(span);
		});

		it("should set the given time as finishTime", () => {
			now.mockClear();
			fakeTracer.spanStarted.mockClear();
			fakeTracer.spanFinished.mockClear();

			const span = new Span(fakeTracer, "start-7");
			span.start(10203000);
			span.finish(10203030);

			expect(span.finishTime).toBe(10203030);
			expect(span.duration).toBe(30);

			expect(now).toBeCalledTimes(1);
			expect(fakeTracer.spanFinished).toBeCalledTimes(1);
			expect(fakeTracer.spanFinished).toBeCalledWith(span);
		});

	});

	describe("Test span create sub-span", () => {
		let subSpan;
		const fakeTracer = {
			broker,
			logger: broker.logger,
			shouldSample: jest.fn(() => true),
			spanStarted: jest.fn(),
			spanFinished: jest.fn(),
			startSpan: jest.fn(() => subSpan)
		};

		subSpan = new Span(fakeTracer, "sub-span");

		const span = new Span(fakeTracer, "start-8");
		span.start(10203000);

		it("should call tracer startSpan without opts", () => {
			const res = span.startSpan("child-span");

			expect(res).toBe(subSpan);
			expect(fakeTracer.startSpan).toBeCalledTimes(1);
			expect(fakeTracer.startSpan).toBeCalledWith("child-span", {
				traceID: "12345678-abcdef",
				parentID: "12345678-abcdef",
				sampled: true,
			});
		});

		it("should call tracer startSpan with opts", () => {
			fakeTracer.startSpan.mockClear();

			const res = span.startSpan("child-span", {
				sampled: false,
				tags: {
					a: 5
				}
			});

			expect(res).toBe(subSpan);
			expect(fakeTracer.startSpan).toBeCalledTimes(1);
			expect(fakeTracer.startSpan).toBeCalledWith("child-span", {
				traceID: "12345678-abcdef",
				parentID: "12345678-abcdef",
				sampled: false,
				tags: {
					a: 5
				}
			});
		});

	});
});

