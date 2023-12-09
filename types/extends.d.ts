import type Context = require("../src/context");

declare global {
	interface Promise<T> {
		delay<T>(ms: number): Promise<T>;
		timeout<T>(ms: number, message: String): Promise<T>;
		ctx: Context;
	}

	interface PromiseConstructor {
		delay<T>(ms: number): Promise<T>;
		method(fn: Function): Function;
		mapSeries<T>(arr: Array<any>, fn: Function): Promise<T>;
	}

	namespace NodeJS {
		interface Process {
			getActiveResourcesInfo(): string[];
		}
	}

}


declare module "net" {
	interface Socket {
		nodeID: string;
		lastUsed: number;
	}
}
declare module "dgram" {

	interface Socket {
		destinations: string[];
	}
}
