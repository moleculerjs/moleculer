"use strict";

jest.mock("jaeger-client");
jest.mock("jaeger-client/dist/src/samplers/const_sampler");
jest.mock("jaeger-client/dist/src/samplers/guaranteed_throughput_sampler");
jest.mock("jaeger-client/dist/src/samplers/remote_sampler");
jest.mock("jaeger-client/dist/src/reporters/udp_sender");
jest.mock("jaeger-client/dist/src/reporters/http_sender");

const Jaeger						= require("jaeger-client");
const GuaranteedThroughputSampler	= require("jaeger-client/dist/src/samplers/guaranteed_throughput_sampler").default;
const RemoteControlledSampler		= require("jaeger-client/dist/src/samplers/remote_sampler").default;
const UDPSender						= require("jaeger-client/dist/src/reporters/udp_sender").default;
const HTTPSender					= require("jaeger-client/dist/src/reporters/http_sender").default;

const fakeRemoteReporter = {};
const fakeUDPSender = {};
const fakeHTTPSender = {};
const fakeRateLimitingSampler = {};
const fakeProbabilisticSampler = {};
const fakeGuaranteedThroughputSampler = {};
const fakeRemoteControlledSampler = {};
const fakeConstSampler = {};
const fakeJaegerTracer = {};

Jaeger.Tracer = jest.fn().mockImplementation(() => fakeJaegerTracer);
Jaeger.RemoteReporter = jest.fn().mockImplementation(() => fakeRemoteReporter);
UDPSender.mockImplementation(() => fakeUDPSender);
HTTPSender.mockImplementation(() => fakeHTTPSender);

Jaeger.ConstSampler = jest.fn().mockImplementation(() => fakeConstSampler);
Jaeger.RateLimitingSampler = jest.fn().mockImplementation(() => fakeRateLimitingSampler);
Jaeger.ProbabilisticSampler = jest.fn().mockImplementation(() => fakeProbabilisticSampler);
GuaranteedThroughputSampler.mockImplementation(() => fakeGuaranteedThroughputSampler);
RemoteControlledSampler.mockImplementation(() => fakeRemoteControlledSampler);

const JaegerTraceExporter = require("../../../../src/tracing/exporters/jaeger");
const ServiceBroker = require("../../../../src/service-broker");
const { MoleculerRetryableError } = require("../../../../src/errors");

const broker = new ServiceBroker({ logger: false });

describe("Test Jaeger tracing exporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const exporter = new JaegerTraceExporter();

			expect(exporter.opts).toEqual({
				endpoint: null,
				host: "127.0.0.1",
				port: 6832,
				sampler: {
					type: "Const",
					options: {}
				},
				tracerOptions: {},
				defaultTags: null
			});

			expect(exporter.tracers).toEqual({});
		});

		it("should create with custom options", () => {
			const exporter = new JaegerTraceExporter({
				endpoint: "http://jaeger:9411",
				sampler: {
					type: "Const",
					options: {
						a: 5
					}
				},
				tracerOptions: {
					b: 10
				},

				defaultTags: {
					c: 15
				}
			});

			expect(exporter.opts).toEqual({
				endpoint: "http://jaeger:9411",
				host: "127.0.0.1",
				port: 6832,
				sampler: {
					type: "Const",
					options: {
						a: 5
					}
				},
				tracerOptions: {
					b: 10
				},
				defaultTags: {
					c: 15
				}
			});
		});

	});

	describe("Test init method", () => {
		const fakeTracer = { logger: broker.logger };

		it("should flatten default tags", () => {
			const exporter = new JaegerTraceExporter({ defaultTags: { a: { b: "c" } } });
			jest.spyOn(exporter, "flattenTags");
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				"a.b": "c"
			});

			expect(exporter.flattenTags).toHaveBeenCalledTimes(2);
			expect(exporter.flattenTags).toHaveBeenNthCalledWith(1, { a: { b: "c" } });
			expect(exporter.flattenTags).toHaveBeenNthCalledWith(2, { b: "c" }, false, "a");
		});

		it("should call defaultTags function", () => {
			const fn = jest.fn(() => ({ a: { b: 5 } }));
			const exporter = new JaegerTraceExporter({ defaultTags: fn });
			exporter.init(fakeTracer);

			expect(exporter.defaultTags).toEqual({
				"a.b": 5
			});

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenNthCalledWith(1, fakeTracer);
		});

	});

	describe("Test getReporter method", () => {
		const fakeTracer = { logger: broker.logger };

		it("should create an UDP sender", () => {
			const exporter = new JaegerTraceExporter({
				host: "jaeger-host",
				port: 4567
			});
			exporter.init(fakeTracer);

			const res = exporter.getReporter();

			expect(res).toBe(fakeRemoteReporter);
			expect(UDPSender).toHaveBeenCalledTimes(1);
			expect(UDPSender).toHaveBeenCalledWith({ host: "jaeger-host", port: 4567 });

			expect(HTTPSender).toHaveBeenCalledTimes(0);

			expect(Jaeger.RemoteReporter).toHaveBeenCalledTimes(1);
			expect(Jaeger.RemoteReporter).toHaveBeenCalledWith(fakeHTTPSender);
		});

		it("should create an HTTP sender", () => {
			UDPSender.mockClear();
			Jaeger.RemoteReporter.mockClear();

			const exporter = new JaegerTraceExporter({
				endpoint: "http://jaeger-host:9411"
			});
			exporter.init(fakeTracer);

			const res = exporter.getReporter();

			expect(res).toBe(fakeRemoteReporter);
			expect(HTTPSender).toHaveBeenCalledTimes(1);
			expect(HTTPSender).toHaveBeenCalledWith({ endpoint: "http://jaeger-host:9411" });

			expect(UDPSender).toHaveBeenCalledTimes(0);

			expect(Jaeger.RemoteReporter).toHaveBeenCalledTimes(1);
			expect(Jaeger.RemoteReporter).toHaveBeenCalledWith(fakeHTTPSender);
		});

	});

	describe("Test getSampler method", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new JaegerTraceExporter();
		exporter.init(fakeTracer);

		it("should create a ConstSampler", () => {
			const res = exporter.getSampler();

			expect(res).toBe(fakeConstSampler);
			expect(Jaeger.ConstSampler).toHaveBeenCalledTimes(1);
			expect(Jaeger.ConstSampler).toHaveBeenCalledWith(1);
		});

		it("should create a ConstSampler with custom decision", () => {
			Jaeger.ConstSampler.mockClear();

			exporter.opts.sampler.options.decision = 0.6;
			const res = exporter.getSampler();

			expect(res).toBe(fakeConstSampler);
			expect(Jaeger.ConstSampler).toHaveBeenCalledTimes(1);
			expect(Jaeger.ConstSampler).toHaveBeenCalledWith(0.6);
		});

		it("should create a RateLimitingSampler", () => {
			Jaeger.RateLimitingSampler.mockClear();
			exporter.opts.sampler = {
				type: "RateLimiting",
				options: {
					maxTracesPerSecond: 5,
					initBalance: 3
				}
			};

			const res = exporter.getSampler();

			expect(res).toBe(fakeRateLimitingSampler);
			expect(Jaeger.RateLimitingSampler).toHaveBeenCalledTimes(1);
			expect(Jaeger.RateLimitingSampler).toHaveBeenCalledWith(5, 3);
		});

		it("should create a ProbabilisticSampler", () => {
			Jaeger.ProbabilisticSampler.mockClear();
			exporter.opts.sampler = {
				type: "Probabilistic",
				options: {
					samplingRate: 0.75
				}
			};

			const res = exporter.getSampler();

			expect(res).toBe(fakeProbabilisticSampler);
			expect(Jaeger.ProbabilisticSampler).toHaveBeenCalledTimes(1);
			expect(Jaeger.ProbabilisticSampler).toHaveBeenCalledWith(0.75);
		});

		it("should create a GuaranteedThroughputSampler", () => {
			GuaranteedThroughputSampler.mockClear();
			exporter.opts.sampler = {
				type: "GuaranteedThroughput",
				options: {
					samplingRate: 0.75,
					lowerBound: 5
				}
			};

			const res = exporter.getSampler();

			expect(res).toBe(fakeGuaranteedThroughputSampler);
			expect(GuaranteedThroughputSampler).toHaveBeenCalledTimes(1);
			expect(GuaranteedThroughputSampler).toHaveBeenCalledWith(5, 0.75);
		});

		it("should create a RemoteControlledSampler", () => {
			RemoteControlledSampler.mockClear();
			exporter.opts.sampler = {
				type: "RemoteControlled",
				options: {
					a: 5
				}
			};

			const res = exporter.getSampler("posts");

			expect(res).toBe(fakeRemoteControlledSampler);
			expect(RemoteControlledSampler).toHaveBeenCalledTimes(1);
			expect(RemoteControlledSampler).toHaveBeenCalledWith("posts", { a: 5 });
		});


		it("should return custom function", () => {
			Jaeger.ConstSampler.mockClear();

			const mySampler = jest.fn();
			exporter.opts.sampler = mySampler;

			const res = exporter.getSampler();

			expect(res).toBe(mySampler);
			expect(Jaeger.ConstSampler).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test getTracer method", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new JaegerTraceExporter({
			tracerOptions: {
				b: "John"
			}
		});
		exporter.init(fakeTracer);

		const fakeSampler = {};
		const fakeReporter = {};
		exporter.getSampler = jest.fn(() => fakeSampler);
		exporter.getReporter = jest.fn(() => fakeReporter);

		it("should create a new tracer", () => {
			expect(exporter.tracers).toEqual({});

			const res = exporter.getTracer("posts");

			expect(res).toBe(fakeJaegerTracer);

			expect(exporter.tracers).toEqual({
				posts: fakeJaegerTracer
			});

			expect(exporter.getSampler).toHaveBeenCalledTimes(1);
			expect(exporter.getSampler).toHaveBeenCalledWith("posts");

			expect(exporter.getReporter).toHaveBeenCalledTimes(1);

			expect(Jaeger.Tracer).toHaveBeenCalledTimes(1);
			expect(Jaeger.Tracer).toHaveBeenCalledWith("posts", fakeReporter, fakeSampler, { b: "John" });
		});

		it("should return an existing tracer", () => {
			exporter.getSampler.mockClear();
			exporter.getReporter.mockClear();
			Jaeger.Tracer.mockClear();

			const res = exporter.getTracer("posts");

			expect(res).toBe(fakeJaegerTracer);

			expect(exporter.tracers).toEqual({
				posts: fakeJaegerTracer
			});

			expect(exporter.getSampler).toHaveBeenCalledTimes(0);
			expect(exporter.getReporter).toHaveBeenCalledTimes(0);
			expect(Jaeger.Tracer).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test spanFinished method", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new JaegerTraceExporter({});
		exporter.init(fakeTracer);
		exporter.generateJaegerSpan = jest.fn();

		it("should push spans to the queue", () => {
			const span1 = { id: "span-1" };
			exporter.spanFinished(span1);

			expect(exporter.generateJaegerSpan).toHaveBeenCalledTimes(1);
			expect(exporter.generateJaegerSpan).toHaveBeenCalledWith(span1);
		});

	});

	describe("Test addLogs method", () => {
		const fakeTracer = {
			logger: broker.logger
		};

		const exporter = new JaegerTraceExporter();
		exporter.init(fakeTracer);

		it("should call span.log method", () => {
			const jaegerSpan = {
				log: jest.fn()
			};

			exporter.addLogs(jaegerSpan, [
				{ name: "log1", time: 100, fields: { a: 5 } },
				{ name: "log2", time: 200, fields: { b: "John" } },
			]);

			expect(jaegerSpan.log).toHaveBeenCalledTimes(2);
			expect(jaegerSpan.log).toHaveBeenNthCalledWith(1, { event: "log1", payload: { a: 5 } }, 100);
			expect(jaegerSpan.log).toHaveBeenNthCalledWith(2, { event: "log2", payload: { b: "John" } }, 200);
		});

	});

	describe("Test addTags method", () => {
		const fakeTracer = {
			logger: broker.logger
		};

		const exporter = new JaegerTraceExporter();
		exporter.init(fakeTracer);

		const jaegerSpan = {
			setTag: jest.fn()
		};

		it("should call span.setTag method with a numeric value", () => {
			jaegerSpan.setTag.mockClear();

			exporter.addTags(jaegerSpan, "a", 5);

			expect(jaegerSpan.setTag).toHaveBeenCalledTimes(1);
			expect(jaegerSpan.setTag).toHaveBeenCalledWith("a", 5);
		});

		it("should call span.setTag method with a string value", () => {
			jaegerSpan.setTag.mockClear();

			exporter.addTags(jaegerSpan, "b", "John");

			expect(jaegerSpan.setTag).toHaveBeenCalledTimes(1);
			expect(jaegerSpan.setTag).toHaveBeenCalledWith("b", "John");
		});

		it("should call span.setTag method with null", () => {
			jaegerSpan.setTag.mockClear();

			exporter.addTags(jaegerSpan, "c", null);

			expect(jaegerSpan.setTag).toHaveBeenCalledTimes(1);
			expect(jaegerSpan.setTag).toHaveBeenCalledWith("c", null);
		});

		it("should not call span.setTag method with undefined", () => {
			jaegerSpan.setTag.mockClear();

			exporter.addTags(jaegerSpan, "c", undefined);

			expect(jaegerSpan.setTag).toHaveBeenCalledTimes(0);
		});

		it("should call span.setTag method with object", () => {
			jaegerSpan.setTag.mockClear();

			exporter.addTags(jaegerSpan, "user", {
				id: 1,
				name: "John",
				address: {
					country: "Australia",
					city: "Sydney"
				}
			});

			expect(jaegerSpan.setTag).toHaveBeenCalledTimes(4);
			expect(jaegerSpan.setTag).toHaveBeenNthCalledWith(1, "user.id", 1);
			expect(jaegerSpan.setTag).toHaveBeenNthCalledWith(2, "user.name", "John");
			expect(jaegerSpan.setTag).toHaveBeenNthCalledWith(3, "user.address.country", "Australia");
			expect(jaegerSpan.setTag).toHaveBeenNthCalledWith(4, "user.address.city", "Sydney");
		});

	});

	describe("Test convertID method", () => {
		const fakeTracer = { logger: broker.logger };
		const exporter = new JaegerTraceExporter({});
		exporter.init(fakeTracer);

		it("should truncate ID", () => {
			expect(exporter.convertID()).toBeNull();
			expect(exporter.convertID("")).toBeNull();
			expect(exporter.convertID("12345678")).toEqual(Buffer.from([18, 52, 86, 120]));
			expect(exporter.convertID("123456789-0123456")).toEqual(Buffer.from([18, 52, 86, 120, 144, 18, 52, 86]));
			expect(exporter.convertID("123456789-0123456789-abcdef")).toEqual(Buffer.from([18, 52, 86, 120, 144, 18, 52, 86]));
			expect(exporter.convertID("abcdef")).toEqual(Buffer.from([171, 205, 239]));
		});

	});

	describe("Test generateJaegerSpan", () => {
		const fakeTracer = {
			logger: broker.logger,
			opts: {
				errorFields: ["name", "message", "retryable", "data", "code"]
			}
		};
		const exporter = new JaegerTraceExporter({
			defaultTags: {
				"def": "ault"
			}
		});
		exporter.init(fakeTracer);

		const fakeSpanContext = {};
		const fakeParentSpanContext = {};
		const fakeJaegerSpan = {
			log: jest.fn(),
			setTag: jest.fn(),
			context: jest.fn(() => fakeSpanContext),
			finish: jest.fn()
		};
		const fakeJaegerTracer = {
			startSpan: jest.fn(() => fakeJaegerSpan)
		};

		exporter.getTracer = jest.fn(() => fakeJaegerTracer);
		Jaeger.SpanContext = jest.fn(() => fakeParentSpanContext);

		it("should convert normal span to Jaeger payload without parentID", () => {
			const span = {
				name: "Test Span",
				type: "action",
				id: "abc-12345678901234567890",
				traceID: "cde-12345678901234567890",
				//parentID: "def-12345678901234567890",

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

			const jaegerSpan = exporter.generateJaegerSpan(span);

			expect(jaegerSpan).toBe(fakeJaegerSpan);

			expect(exporter.getTracer).toHaveBeenCalledTimes(1);
			expect(exporter.getTracer).toHaveBeenCalledWith("v1.posts");

			expect(Jaeger.SpanContext).toHaveBeenCalledTimes(0);

			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledTimes(1);
			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledWith("Test Span", {
				startTime: 1000,
				childOf: undefined,
				tags: {
					a: 5,
					b: "John",
					c: true,
					d: null,
					def: "ault",
					"service.fullName": "v1.posts",
					"span.type": "action"
				}
			});

			expect(fakeJaegerSpan.log).toHaveBeenCalledTimes(0);

			expect(fakeJaegerSpan.setTag).toHaveBeenCalledTimes(2);
			expect(fakeJaegerSpan.setTag).toHaveBeenCalledWith("service", "v1.posts");
			expect(fakeJaegerSpan.setTag).toHaveBeenCalledWith("span.kind", "server");

			expect(fakeJaegerSpan.context).toHaveBeenCalledTimes(1);

			expect(fakeSpanContext.traceId).toEqual(Buffer.from([205, 225, 35, 69, 103, 137, 1, 35]));
			expect(fakeSpanContext.spanId).toEqual(Buffer.from([171, 193, 35, 69, 103, 137, 1, 35]));

			expect(fakeJaegerSpan.finish).toHaveBeenCalledTimes(1);
			expect(fakeJaegerSpan.finish).toHaveBeenCalledWith(1050);

		});

		it("should convert normal span to Jaeger payload with parentID & logs", () => {
			exporter.getTracer.mockClear();
			Jaeger.SpanContext.mockClear();
			fakeJaegerTracer.startSpan.mockClear();
			fakeJaegerSpan.log.mockClear();
			fakeJaegerSpan.context.mockClear();
			fakeJaegerSpan.setTag.mockClear();
			fakeJaegerSpan.finish.mockClear();

			const span = {
				name: "Test Span",
				type: "custom",
				id: "aaa-12345678901234567890",
				traceID: "bbb-12345678901234567890",
				parentID: "ccc-12345678901234567890",

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

				logs: [
					{ name: "log1", time: 100, fields: { a: 5 } },
					{ name: "log2", time: 200, fields: { b: "John" } },
				]
			};

			const jaegerSpan = exporter.generateJaegerSpan(span);

			expect(jaegerSpan).toBe(fakeJaegerSpan);

			expect(exporter.getTracer).toHaveBeenCalledTimes(1);
			expect(exporter.getTracer).toHaveBeenCalledWith("v1.posts");

			expect(Jaeger.SpanContext).toHaveBeenCalledTimes(1);
			expect(Jaeger.SpanContext).toHaveBeenCalledWith(
				Buffer.from([187, 177, 35, 69, 103, 137, 1, 35]),
				Buffer.from([204, 193, 35, 69, 103, 137, 1, 35]),
				null,
				null,
				null,
				null,
				1,
				{},
				""
			);

			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledTimes(1);
			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledWith("Test Span", {
				startTime: 1000,
				childOf: fakeParentSpanContext,
				tags: {
					a: 5,
					b: "John",
					c: true,
					d: null,
					def: "ault",
					"service.fullName": "v1.posts",
					"span.type": "custom"
				}
			});

			expect(fakeJaegerSpan.log).toHaveBeenCalledTimes(2);
			expect(fakeJaegerSpan.log).toHaveBeenCalledWith({ event: "log1", payload: { a: 5 } }, 100);
			expect(fakeJaegerSpan.log).toHaveBeenCalledWith({ event: "log2", payload: { b : "John" } }, 200);

			expect(fakeJaegerSpan.setTag).toHaveBeenCalledTimes(2);
			expect(fakeJaegerSpan.setTag).toHaveBeenCalledWith("service", "v1.posts");
			expect(fakeJaegerSpan.setTag).toHaveBeenCalledWith("span.kind", "server");

			expect(fakeJaegerSpan.context).toHaveBeenCalledTimes(1);

			expect(fakeSpanContext.traceId).toEqual(Buffer.from([187, 177, 35, 69, 103, 137, 1, 35]));
			expect(fakeSpanContext.spanId).toEqual(Buffer.from([170, 161, 35, 69, 103, 137, 1, 35]));

			expect(fakeJaegerSpan.finish).toHaveBeenCalledTimes(1);
			expect(fakeJaegerSpan.finish).toHaveBeenCalledWith(1050);

		});

		it("should convert normal span to Jaeger payload with error", () => {
			exporter.getTracer.mockClear();
			Jaeger.SpanContext.mockClear();
			fakeJaegerTracer.startSpan.mockClear();
			fakeJaegerSpan.log.mockClear();
			fakeJaegerSpan.context.mockClear();
			fakeJaegerSpan.setTag.mockClear();
			fakeJaegerSpan.finish.mockClear();

			const err = new MoleculerRetryableError("Something happened", 512, "SOMETHING", { a: 5 });

			const span = {
				name: "Test Span",
				type: "action",
				id: "abc-12345678901234567890",
				traceID: "cde-12345678901234567890",
				//parentID: "def-12345678901234567890",

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

			const jaegerSpan = exporter.generateJaegerSpan(span);

			expect(jaegerSpan).toBe(fakeJaegerSpan);

			expect(exporter.getTracer).toHaveBeenCalledTimes(1);
			expect(exporter.getTracer).toHaveBeenCalledWith("v1.posts");

			expect(Jaeger.SpanContext).toHaveBeenCalledTimes(0);

			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledTimes(1);
			expect(fakeJaegerTracer.startSpan).toHaveBeenCalledWith("Test Span", {
				startTime: 1000,
				childOf: undefined,
				tags: {
					a: 5,
					b: "John",
					c: true,
					d: null,
					def: "ault",
					"service.fullName": "v1.posts",
					"span.type": "action"
				}
			});

			expect(fakeJaegerSpan.log).toHaveBeenCalledTimes(0);

			expect(fakeJaegerSpan.setTag).toHaveBeenCalledTimes(8);
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(1, "service", "v1.posts");
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(2, "span.kind", "server");
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(3, "error", true);
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(4, "error.name", "MoleculerRetryableError");
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(5, "error.message", "Something happened");
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(6, "error.retryable", true);
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(7, "error.data.a", 5);
			expect(fakeJaegerSpan.setTag).toHaveBeenNthCalledWith(8, "error.code", 512);

			expect(fakeJaegerSpan.context).toHaveBeenCalledTimes(1);

			expect(fakeSpanContext.traceId).toEqual(Buffer.from([205, 225, 35, 69, 103, 137, 1, 35]));
			expect(fakeSpanContext.spanId).toEqual(Buffer.from([171, 193, 35, 69, 103, 137, 1, 35]));

			expect(fakeJaegerSpan.finish).toHaveBeenCalledTimes(1);
			expect(fakeJaegerSpan.finish).toHaveBeenCalledWith(1050);

		});

	});

});
