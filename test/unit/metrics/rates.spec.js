"use strict";

const lolex = require("@sinonjs/fake-timers");
const MetricRate = require("../../../src/metrics/rates");

const fakeMetric = {
	changed: jest.fn()
};

const fakeMetricItem = {
	value: "value",
	labels: { a: 5 }
};

describe("Test MetricRate class", () => {

	let rate, clock;

	beforeAll(() => clock = lolex.install({ now: 1234567899990 }));
	afterAll(() => clock.uninstall());

	it("should create MetricRate", () => {
		rate = new MetricRate(fakeMetric, fakeMetricItem, 1);

		expect(rate.metric).toBe(fakeMetric);
		expect(rate.item).toBe(fakeMetricItem);
		expect(rate.min).toBe(1);

		expect(rate.rate).toBe(0);

		expect(rate.lastValue).toBe(0);
		expect(rate.lastTickTime).toBe(1234567899990);
		expect(rate.value).toBeNull();

		expect(rate.timer).toBeDefined();
	});

	it("should set value", () => {
		expect(rate.value).toBeNull();
		rate.update(111);
		expect(rate.value).toBe(111);
	});

	it("should call tick method", () => {
		rate.tick = jest.fn();

		clock.tick(3000);
		expect(rate.tick).toBeCalledTimes(0);

		clock.tick(2000);
		expect(rate.tick).toBeCalledTimes(1);

		clock.tick(5000);
		expect(rate.tick).toBeCalledTimes(2);
	});

	it("should reset values", () => {
		rate.lastValue = 5;
		rate.value = 10;
		rate.rate = 12.5;

		rate.reset();

		expect(rate.lastValue).toBe(0);
		expect(rate.value).toBeNull();
		expect(rate.rate).toBe(0);
	});

});

describe("Test rate calculation", () => {

	let clock, rate;
	beforeAll(() => {
		clock = lolex.install({ now: 1234567899990 });
		rate = new MetricRate(fakeMetric, fakeMetricItem, 1);
	});
	afterAll(() => clock.uninstall());

	it("should first calculate rate", () => {
		fakeMetric.changed.mockClear();

		rate.update(100);
		clock.tick(5000);

		expect(rate.lastTickTime).toBe(1234567904990);
		expect(rate.lastValue).toBe(100);
		expect(rate.value).toBe(100);
		expect(rate.rate).toBe(600);

		expect(fakeMetric.changed).toBeCalledTimes(1);
		expect(fakeMetric.changed).toBeCalledWith("value", { a: 5 }, 1234567904990);
	});

	it("should calculate rate again #2", () => {
		fakeMetric.changed.mockClear();

		rate.update(120);
		clock.tick(5000);

		expect(rate.lastTickTime).toBe(1234567909990);
		expect(rate.lastValue).toBe(120);
		expect(rate.value).toBe(120);
		expect(rate.rate).toBe(420);

		expect(fakeMetric.changed).toBeCalledTimes(1);
		expect(fakeMetric.changed).toBeCalledWith("value", { a: 5 }, 1234567909990);
	});

	it("should calculate rate again without value update", () => {
		fakeMetric.changed.mockClear();

		clock.tick(5000);

		expect(rate.lastTickTime).toBe(1234567914990);
		expect(rate.lastValue).toBe(120);
		expect(rate.value).toBe(120);
		expect(rate.rate).toBe(210);

		expect(fakeMetric.changed).toBeCalledTimes(1);
		expect(fakeMetric.changed).toBeCalledWith("value", { a: 5 }, 1234567914990);
	});

	it("should rate goes zero", () => {
		fakeMetric.changed.mockClear();

		clock.tick(100000);

		expect(rate.lastTickTime).toBe(1234568014990);
		expect(rate.lastValue).toBe(120);
		expect(rate.value).toBe(120);
		expect(rate.rate).toBe(0);

		expect(fakeMetric.changed).toBeCalledTimes(13);
	});

});

