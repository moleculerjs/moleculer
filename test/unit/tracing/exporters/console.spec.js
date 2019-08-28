"use strict";

const ConsoleTraceExporter = require("../../../../src/tracing/exporters/console");
const ServiceBroker = require("../../../../src/service-broker");

const broker = new ServiceBroker({ logger: false });

describe("Test Console tracing exporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const exporter = new ConsoleTraceExporter();

			expect(exporter.opts).toEqual({
				logger: null,
				colors: true,
				width: 100,
				gaugeWidth: 40
			});

			expect(exporter.spans).toEqual({});
		});

		it("should create with custom options", () => {
			const exporter = new ConsoleTraceExporter({
				logger: console,
				width: 120,
				gaugeWidth: 50
			});

			expect(exporter.opts).toEqual({
				logger: console,
				colors: true,
				width: 120,
				gaugeWidth: 50
			});
		});

	});

	describe("Test init method", () => {
		const fakeTracer = { broker, logger: broker.logger };

		it("should create timer", () => {
			const exporter = new ConsoleTraceExporter({});
			exporter.flush = jest.fn();
			exporter.init(fakeTracer);

			expect(exporter.tracer).toBe(fakeTracer);
		});

	});

	describe("Test startSpan method", () => {
		const fakeTracer = { broker, logger: broker.logger };
		const exporter = new ConsoleTraceExporter({});
		exporter.init(fakeTracer);

		const span1 = { id: "span1" };
		const span2 = { id: "span2" };
		const span3 = { id: "span3", parentID: "span1" };

		it("should push spans to the store", () => {
			expect(exporter.spans).toEqual({});

			exporter.startSpan(span1);
			exporter.startSpan(span2);

			expect(exporter.spans).toEqual({
				span1: {
					children: [],
					span: span1,
				},
				span2: {
					children: [],
					span: span2,
				}
			});
		});

		it("should set child for parent", () => {
			exporter.startSpan(span3);

			expect(exporter.spans).toEqual({
				span1: {
					children: [
						"span3"
					],
					span: span1,
				},
				span2: {
					children: [],
					span: span2,
				},
				span3: {
					children: [],
					span: span3,
				}
			});
		});

	});

	describe("Test finishSpan method", () => {
		const fakeTracer = { broker, logger: broker.logger };
		const exporter = new ConsoleTraceExporter({});
		exporter.init(fakeTracer);
		exporter.printRequest = jest.fn();
		exporter.removeSpanWithChildren = jest.fn();

		const span1 = { id: "span1", parentID: "span3" };
		exporter.startSpan(span1);

		it("should call printRequest if no parent span", () => {
			exporter.finishSpan(span1);

			expect(exporter.printRequest).toHaveBeenCalledTimes(1);
			expect(exporter.printRequest).toHaveBeenCalledWith("span1");

			expect(exporter.removeSpanWithChildren).toHaveBeenCalledTimes(1);
			expect(exporter.removeSpanWithChildren).toHaveBeenCalledWith("span1");
		});

		it("should not call printRequest if has parent span", () => {
			exporter.printRequest.mockClear();
			exporter.removeSpanWithChildren.mockClear();

			exporter.finishSpan({ id: "span2", parentID: "span1" });

			expect(exporter.printRequest).toHaveBeenCalledTimes(0);
			expect(exporter.removeSpanWithChildren).toHaveBeenCalledTimes(0);
		});
	});

	describe("Test removeSpanWithChildren method", () => {
		const fakeTracer = { broker, logger: broker.logger };
		const exporter = new ConsoleTraceExporter({});
		exporter.init(fakeTracer);

		it("should clear printed spans", () => {
			exporter.spans = {};

			const span1 = { id: "span1", parentID: null };
			const span2 = { id: "span2", parentID: "span1" };
			const span3 = { id: "span3", parentID: "span2" };
			const span4 = { id: "span4", parentID: "span3" };
			const span5 = { id: "span5", parentID: "span1" };
			const span6 = { id: "span6", parentID: null };

			exporter.startSpan(span1);
			exporter.startSpan(span2);
			exporter.startSpan(span3);
			exporter.startSpan(span4);
			exporter.startSpan(span5);
			exporter.startSpan(span6);

			expect(exporter.spans).toMatchSnapshot();

			exporter.removeSpanWithChildren("span1");

			expect(exporter.spans).toEqual({
				span6: {
					children: [],
					span: span6
				}
			});
		});

	});

	describe("Test spans printing", () => {
		const fakeTracer = { broker, logger: broker.logger };

		let LOG_STORE = [];
		const logger = jest.fn((...args) => LOG_STORE.push(args.join(" ")));

		const exporter = new ConsoleTraceExporter({
			colors: false,
			width: 80,
			logger,
		});
		exporter.init(fakeTracer);

		const span1 = {
			id: "span-1",
			name: "Span #1",
			startTime: 1000,
			finishTime: 1100,
			duration: 100,
			tags: {
				fromCache: false,
				remoteCall: false,
			},
			error: null
		};

		const span2 = {
			id: "span-2",
			parentID: "span-1",
			name: "Span #2",
			startTime: 1020,
			finishTime: 1070,
			duration: 50,
			tags: {
				fromCache: true,
				remoteCall: false,
			},
			error: null
		};

		const span22 = {
			id: "span-2-2",
			parentID: "span-2",
			name: "Span #22 (with long name)",
			startTime: 1025,
			finishTime: 1050,
			duration: 25,
			tags: {
				fromCache: false,
				remoteCall: true,
			},
			error: null
		};

		const span3 = {
			id: "span-3",
			parentID: "span-1",
			name: "Span #3",
			startTime: 1015,
			finishTime: 1090,
			duration: 75,
			tags: {
				fromCache: false,
				remoteCall: false,
			},
			error: null
		};

		it("should print full trace", () => {
			exporter.startSpan(span1);
			exporter.startSpan(span2);
			exporter.startSpan(span22);
			exporter.startSpan(span3);

			exporter.finishSpan(span3);
			exporter.finishSpan(span22);
			exporter.finishSpan(span2);
			exporter.finishSpan(span1);

			expect(LOG_STORE).toMatchSnapshot();
		});

		it("should print full trace with error", () => {
			LOG_STORE.length = 0;

			span22.name = "Span #22";
			span22.error = {
				name: "MoleculerError",
				message: "Something happened"
			};

			exporter.startSpan(span1);
			exporter.startSpan(span2);
			exporter.startSpan(span22);
			exporter.startSpan(span3);

			exporter.finishSpan(span3);
			exporter.finishSpan(span22);
			exporter.finishSpan(span2);
			exporter.finishSpan(span1);

			expect(LOG_STORE).toMatchSnapshot();
		});

		it("should print to the default logger", () => {
			LOG_STORE.length = 0;
			exporter.opts.logger = null;
			exporter.logger.info = logger;

			span22.name = "Span #22";
			span22.error = null;

			exporter.startSpan(span1);
			exporter.startSpan(span2);
			exporter.startSpan(span22);
			exporter.startSpan(span3);

			exporter.finishSpan(span3);
			exporter.finishSpan(span22);
			exporter.finishSpan(span2);
			exporter.finishSpan(span1);

			expect(LOG_STORE).toMatchSnapshot();
		});
	});

});
