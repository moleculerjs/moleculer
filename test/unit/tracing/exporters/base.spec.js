"use strict";

const BaseExporter = require("../../../../src/tracing/exporters/base");
const { MoleculerRetryableError } = require("../../../../src/errors");

describe("Test Base Reporter class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const exporter = new BaseExporter();

			expect(exporter.opts).toEqual({});
		});

		it("should create with custom options", () => {
			const exporter = new BaseExporter({
				some: "thing",
				a: 5
			});

			expect(exporter.opts).toEqual({
				some: "thing",
				a: 5
			});
		});
	});

	describe("Test init method", () => {
		it("should set tracer & logger", () => {
			const fakeTracer = {
				broker: { Promise },
				logger: {}
			};
			const exporter = new BaseExporter();
			exporter.init(fakeTracer);

			expect(exporter.tracer).toBe(fakeTracer);
			expect(exporter.logger).toBe(fakeTracer.logger);
		});
	});

	describe("Test flattenTags method", () => {
		const exporter = new BaseExporter();

		it("should not flattening a null", () => {
			expect(exporter.flattenTags()).toBeNull();
		});

		const obj = {
			a: 5,
			b: "John",
			c: {
				d: "d",
				e: {
					f: true,
					g: 100
				},
				h: null,
				i: undefined
			}
		};

		it("should flattening an object", () => {
			expect(exporter.flattenTags(obj)).toEqual({
				a: 5,
				b: "John",
				"c.d": "d",
				"c.e.f": true,
				"c.e.g": 100,
				"c.h": null
			});
		});

		it("should flattening & convert to string an object", () => {
			expect(exporter.flattenTags(obj, true)).toEqual({
				a: "5",
				b: "John",
				"c.d": "d",
				"c.e.f": "true",
				"c.e.g": "100",
				"c.h": "null"
			});
		});

		it("should flattening an object with path", () => {
			expect(exporter.flattenTags(obj, false, "myObj")).toEqual({
				"myObj.a": 5,
				"myObj.b": "John",
				"myObj.c.d": "d",
				"myObj.c.e.f": true,
				"myObj.c.e.g": 100,
				"myObj.c.h": null
			});
		});
	});

	describe("Test errorToObject method", () => {
		const fakeTracer = {
			broker: { Promise },
			logger: {},
			opts: {
				errorFields: ["name", "message"]
			}
		};

		const exporter = new BaseExporter();
		exporter.init(fakeTracer);

		it("should not convert a null", () => {
			expect(exporter.errorToObject()).toBeNull();
		});

		const err = new MoleculerRetryableError("Something happened", 512, "SOMETHING", { a: 5 });

		it("should convert error", () => {
			expect(exporter.errorToObject(err)).toEqual({
				message: "Something happened",
				name: "MoleculerRetryableError"
			});
		});

		it("should convert error with other fields", () => {
			fakeTracer.opts.errorFields.push("retryable", "data", "code");
			expect(exporter.errorToObject(err)).toEqual({
				message: "Something happened",
				name: "MoleculerRetryableError",
				code: 512,
				retryable: true,
				data: {
					a: 5
				}
			});
		});
	});
});
