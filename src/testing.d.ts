import ServiceBroker = require("./service-broker");
import type { ServiceSchema } from "./service";
type BrokerOptions = ServiceBroker.BrokerOptions;

export class MockBuilder {
  actionName: string;
  params: object | undefined;
  meta: object | undefined;
  returnValue: any;

  /**
   * Match only when called with specific params
   */
  withParams(params: object): this;

  /**
   * Match only when called with specific meta
   */
  withMeta(meta: object): this;

  /**
   * Set the return value (or Error to simulate rejection)
   */
  returns(value: any): this;
}

export interface EventCatcherTestMethods {
  /** Check if an event was emitted/broadcast */
  eventEmitted(eventName: string): boolean;

  /** Count how many times an event was emitted/broadcast */
  eventEmittedTimes(eventName: string): number;

  /** Check if an event was emitted with matching params */
  eventEmittedWithParams(eventName: string, params: object): boolean;

  /** Wait for an event to be emitted */
  waitForEvent(eventName: string, timeout?: number): Promise<any>;

  /** Clear all captured events and pending waiters */
  clearEvents(): void;
}

export interface MockingCallsTestMethods {
  /** Define a mock for an action */
  mockAction(actionName: string): MockBuilder;

  /** Check if an action was called */
  actionCalled(actionName: string): boolean;

  /** Count how many times an action was called */
  actionCalledTimes(actionName: string): number;

  /** Check if an action was called with matching params */
  actionCalledWithParams(actionName: string, params: object): boolean;

  /** Check if an action was called with matching meta */
  actionCalledWithMeta(actionName: string, meta: object): boolean;

  /** Check if an action was called with specific params AND meta */
  actionCalledWith(actionName: string, params?: object, meta?: object): boolean;

  /** Clear all recorded action calls */
  clearActions(): void;

  /** Get all recorded calls for an action */
  getCall(actionName: string): Array<{
    actionName: string;
    params?: object;
    opts?: object;
    time: number;
  }>;
}

export type BrokerWithTest = ServiceBroker & {
  test: EventCatcherTestMethods & MockingCallsTestMethods;
};

/**
 * Create a ServiceBroker configured for testing.
 * - Disables logging
 * - Sets `test: true` flag on the broker
 * - Registers EventCatcher and MockingCalls middlewares automatically
 * - Accepts optional mock service definitions
 */
export function createBroker(
  opts?: Partial<BrokerOptions> & { middlewares?: any[] },
  mockServices?: ServiceSchema[]
): BrokerWithTest;
