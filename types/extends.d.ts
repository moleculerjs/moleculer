import { ExtendableError } from "../src/errors";
import type Context = require("../src/context");

interface Promise<T> {
	delay<T>(ms: number): Promise<T>;
	method(fn: Function): Function;
	timeout<T>(ms: number, message: String): Promise<T>;
	mapSeries<T>(arr: Array<any>, fn: Function): Promise<T>;
	TimeoutError: ExtendableError;
	ctx: Context;
}

interface PromiseConstructor {
	delay<T>(ms: number): Promise<T>;
	method(fn: Function): Function;
	timeout<T>(ms: number, message: String): Promise<T>;
	mapSeries<T>(arr: Array<any>, fn: Function): Promise<T>;
	TimeoutError: ExtendableError;
}
