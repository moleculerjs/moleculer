"use strict";

const lolex = require("lolex");

jest.mock("node-fetch");
const fetch = require("node-fetch");
fetch.mockImplementation(() => Promise.resolve({ statusText: "" }));

const ZipkinTraceExporter = require("../../../../src/tracing/exporters/zipkin");
const ServiceBroker = require("../../../../src/service-broker");
const { MoleculerRetryableError } = require("../../../../src/errors");

const broker = new ServiceBroker({ logger: false });

describe("Test Zipkin tracing exporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const exporter = new ZipkinTraceExporter();

			expect(exporter.opts).toEqual({
				baseURL: "http://localhost:9411",
				defaultTags: null,
				interval: 5,
				payloadOptions: {
					debug: false,
					shared: false
				}
			});

			expect(exporter.queue).toBeInstanceOf(Array);
		});

		it("should create with custom options", () => {
			const exporter = new ZipkinTraceExporter({
				baseURL: "http://zipkin-server:9411",
				interval: 10,
				payloadOptions: {
					debug: true
				},

				defaultTags: {
					a: 5
				}
			});

			expect(exporter.opts).toEqual({
				baseURL: "http://zipkin-server:9411",
				interval: 10,
				payloadOptions: {
					debug: true,
					shared: false
				},

				defaultTags: {
					a: 5
				}
			});
		});

	});

	describe("Test init method", () => {
		const fakeTracer = { logger: broker.logger };

		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should create timer", () => {
			const exporter = new ZipkinTraceExporter({});
			exporter.flush = jest.fn();
			exporter.init(fakeTracer);

			expect(exporter.timer).toBeDefined();
			expect(exporter.flush).toBeCalledTimes(0);

			clock.tick(5500);

			expect(exporter.flush).toBeCalledTimes(1);
		});

		it("should not create timer", () => {
			const exporter = new ZipkinTraceExporter({ interval: 0 });
			exporter.init(fakeTracer);

			expect(exporter.timer).toBeUndefined();
		});

		it("should flatten default tags", () => {
			const exporter = new ZipkinTraceExporter({ defaultTags: { a: { b: "c" } } });
			jest.spyOn(exporter, "flattenTags");
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				"a.b": "c"
			});

			expect(exporter.flattenTags).toHaveBeenCalledTimes(2);
			expect(exporter.flattenTags).toHaveBeenNthCalledWith(2, { b: "c" }, true, "a");
			expect(exporter.flattenTags).toHaveBeenNthCalledWith(1, { a: { b: "c" } }, true);
		});

		it("should call defaultTags function", () => {
			const fn = jest.fn(() => ({ a: { b: 5 } }));
			const exporter = new ZipkinTraceExporter({ defaultTags: fn });
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				"a.b": "5"
			});

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenNthCalledWith(1, fakeTracer);
		});

	});

	describe("Test spanFinished method", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new ZipkinTraceExporter({});
		exporter.init(fakeTracer);

		it("should push spans to the queue", () => {
			expect(exporter.queue).toEqual([]);

			const span1 = {};
			const span2 = {};

			exporter.spanFinished(span1);
			exporter.spanFinished(span2);

			expect(exporter.queue).toEqual([span1, span2]);
		});

	});

	describe("Test flush method", () => {
		const fakeTracer = {
			logger: broker.logger
		};

		const exporter = new ZipkinTraceExporter({
			baseURL: "https://zipkin-server:9411"
		});
		exporter.init(fakeTracer);

		exporter.generateTracingData = jest.fn(() => ({ a: 5 }));

		it("should not generate data if queue is empty", () => {
			exporter.flush();

			expect(exporter.generateTracingData).toHaveBeenCalledTimes(0);
		});

		it("should generate & send data if queue is not empty", () => {
			exporter.spanFinished({});

			exporter.flush();

			expect(exporter.generateTracingData).toHaveBeenCalledTimes(1);
			expect(exporter.queue.length).toEqual(0);
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith("https://zipkin-server:9411/api/v2/spans", {
				method: "post",
				headers: { "Content-Type": "application/json" },
				body: "{\"a\":5}"
			});
		});

	});

	describe("Test generateTracingData method", () => {
		const fakeTracer = {
			logger: broker.logger
		};

		const exporter = new ZipkinTraceExporter({});
		exporter.init(fakeTracer);

		exporter.makePayload = jest.fn(span => span);

		it("should call makePayload", () => {
			exporter.spanFinished({ a: 5 });
			exporter.spanFinished({ b: 10 });

			const res = exporter.generateTracingData();

			expect(exporter.makePayload).toHaveBeenCalledTimes(2);
			expect(exporter.makePayload).toHaveBeenNthCalledWith(1, { a: 5 });
			expect(exporter.makePayload).toHaveBeenNthCalledWith(2, { b: 10 });

			expect(res).toEqual([
				{ a: 5 },
				{ b: 10 }
			]);
		});
	});

	describe("Test convertID & convertTime methods", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new ZipkinTraceExporter({});
		exporter.init(fakeTracer);

		it("should truncate ID", () => {
			expect(exporter.convertID()).toBeNull();
			expect(exporter.convertID("")).toBeNull();
			expect(exporter.convertID("12345678")).toBe("12345678");
			expect(exporter.convertID("123456789-0123456")).toBe("1234567890123456");
			expect(exporter.convertID("123456789-0123456789-0")).toBe("1234567890123456");
		});

		it("should convert time", () => {
			expect(exporter.convertTime()).toBeNull();
			expect(exporter.convertTime(0)).toBe(0);
			expect(exporter.convertTime(10)).toBe(10000);
			expect(exporter.convertTime(12345678)).toBe(12345678000);
		});
	});

	describe("Test makePayload", () => {
		const fakeTracer = {
			logger: broker.logger,
			opts: {
				errorFields: ["name", "message", "retryable", "data", "code"]
			}
		};
		const exporter = new ZipkinTraceExporter({
			defaultTags: {
				def: "ault"
			},
			payloadOptions: {
				shared: true
			}
		});
		exporter.init(fakeTracer);

		it("should convert normal span to zipkin payload", () => {
			const span = {
				name: "Test Span",
				type: "custom",
				id: "span-id-12345678901234567890",
				traceID: "trace-id-12345678901234567890",
				parentID: "parent-id-12345678901234567890",

				service: {
					fullName: "v1.posts"
				},

				startTime: 1000,
				finishTime: 1050,
				duration: 50,

				tags: {
					a: 5,
					b: "John",
					c: true,
					d: null
				}
			};

			expect(exporter.makePayload(span)).toMatchSnapshot();
		});

		it("should convert errored span to zipkin payload", () => {
			const err = new MoleculerRetryableError("Something happened", 512, "SOMETHING", { a: 5 });

			const span = {
				name: "Test Span",
				type: "action",
				id: "span-id-12345678901234567890",
				traceID: "trace-id-12345678901234567890",
				parentID: "parent-id-12345678901234567890",

				service: {
					fullName: "v1.posts"
				},

				startTime: 1000,
				finishTime: 1050,
				duration: 50,

				tags: {
					a: 5,
					b: "John",
					c: true,
					d: null
				},

				error: err
			};

			expect(exporter.makePayload(span)).toMatchSnapshot();
		});

	});

});
