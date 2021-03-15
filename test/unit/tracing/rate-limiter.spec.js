"use strict";

const lolex = require("@sinonjs/fake-timers");


const RateLimiter = require("../../../src/tracing/rate-limiter");

describe("Test Tracing Rate Limiter", () => {

	describe("Test Constructor", () => {
		let clock;

		beforeAll(() => clock = lolex.install({ now: 12345678000 }));
		afterAll(() => clock.uninstall());

		it("should create with default options", () => {

			const rate = new RateLimiter();

			expect(rate.opts).toEqual({
				tracesPerSecond: 1
			});

			expect(rate.lastTime).toBe(12345678000);
			expect(rate.balance).toBe(0);
			expect(rate.maxBalance).toBe(1);
		});

		it("should create with custom options", () => {

			const rate = new RateLimiter({ tracesPerSecond: 5 });

			expect(rate.opts).toEqual({
				tracesPerSecond: 5
			});

			expect(rate.lastTime).toBe(12345678000);
			expect(rate.balance).toBe(0);
			expect(rate.maxBalance).toBe(5);
		});

		it("should create with custom options", () => {

			const rate = new RateLimiter({ tracesPerSecond: 0.5 });

			expect(rate.opts).toEqual({
				tracesPerSecond: 0.5
			});

			expect(rate.lastTime).toBe(12345678000);
			expect(rate.balance).toBe(0);
			expect(rate.maxBalance).toBe(1);
		});

	});

	describe("Test check method", () => {
		let clock;

		beforeAll(() => clock = lolex.install({ now: 12345678000 }));
		afterAll(() => clock.uninstall());

		it("should return once per seconds", () => {

			const rate = new RateLimiter();

			expect(rate.check()).toBe(false);
			expect(rate.check()).toBe(false);

			clock.tick(300);
			expect(rate.check()).toBe(false);

			clock.tick(300);
			expect(rate.check()).toBe(false);

			clock.tick(300);
			expect(rate.check()).toBe(false);

			clock.tick(300);
			expect(rate.check()).toBe(true);

			clock.tick(500);
			expect(rate.check()).toBe(false);

			clock.tick(400);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(true);

			// Long times

			clock.tick(3000);
			expect(rate.check()).toBe(true);

			clock.tick(5000);
			expect(rate.check()).toBe(true);

			// Short times after long time

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(800);
			expect(rate.check()).toBe(true);
		});

		it("should return once per 5 seconds", () => {

			const rate = new RateLimiter({ tracesPerSecond: 0.2 });

			expect(rate.check()).toBe(false);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(true);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(false);

			clock.tick(1000);
			expect(rate.check()).toBe(true);
		});

		it("should return 3 times per seconds", () => {

			const rate = new RateLimiter({ tracesPerSecond: 3 });

			expect(rate.check()).toBe(false);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(true);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(true);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(false);

			clock.tick(100);
			expect(rate.check()).toBe(true);
		});

		it("should return 2 times per seconds", () => {

			const rate = new RateLimiter({ tracesPerSecond: 3 });

			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(true);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(2)).toBe(false);

			clock.tick(100);
			expect(rate.check(1)).toBe(true);
		});
	});


});
