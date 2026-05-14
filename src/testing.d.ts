import type ServiceBroker = require("./service-broker");
import type { ServiceSchema, BrokerOptions } from "./service-broker";

export interface TestBrokerOptions extends BrokerOptions {
	/** Service schemas to load when the broker is created. */
	services?: ServiceSchema[];
}

export interface TestHelpers {
	/** Returns true if the named event was emitted at least once. */
	eventEmitted(name: string): boolean;
	/** Returns how many times the named event was emitted. */
	eventEmittedTimes(name: string): number;
	/**
	 * Returns true if the named event was emitted with params that include
	 * all key/value pairs in `expected` (deep partial match).
	 */
	eventEmittedWithParams(name: string, params: Record<string, unknown>): boolean;
	/** Clears all captured events. */
	clearEvents(): void;

	/** Register a static or factory mock response for an action. */
	mockAction(name: string, response: unknown | ((params: unknown) => unknown)): void;
	/** Returns true if the named action was called at least once. */
	actionCalled(name: string): boolean;
	/** Returns how many times the named action was called. */
	actionCalledTimes(name: string): number;
	/**
	 * Returns true if the named action was called with params that include
	 * all key/value pairs in `expected` (deep partial match).
	 */
	actionCalledWithParams(name: string, params: Record<string, unknown>): boolean;
	/** Clears all mocks and call history. */
	clearActions(): void;
}

export interface TestServiceBroker extends ServiceBroker {
	test: TestHelpers;
}

/**
 * Creates a ServiceBroker pre-configured for unit testing.
 * Logger is disabled by default. EventCatcher and MockingCalls middlewares are
 * installed automatically and exposed via broker.test.
 */
export declare function createBroker(options?: TestBrokerOptions): TestServiceBroker;

/** Middleware that captures emitted events for assertion in tests. */
export declare class EventCatcher {
	middleware(): object;
	emitted(name: string): boolean;
	emittedTimes(name: string): number;
	emittedWithParams(name: string, expected: Record<string, unknown>): boolean;
	clear(): void;
}

/** Middleware that intercepts broker.call() for mocking and assertion in tests. */
export declare class MockingCalls {
	middleware(): object;
	mock(name: string, response: unknown | ((params: unknown) => unknown)): void;
	called(name: string): boolean;
	calledTimes(name: string): number;
	calledWithParams(name: string, expected: Record<string, unknown>): boolean;
	clear(): void;
}
