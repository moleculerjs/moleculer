interface Promise<T> {
	delay<T>(ms: number): Promise<T>;
	method<T>(fn: Function): Function;
	timeout<T>(ms: number, message: String): Promise<T>;
	mapSeries<T>(arr: Array<any>, fn: Function): Promise<T>;
}

interface PromiseConstructor {
	delay<T>(ms: number): Promise<T>;
	method<T>(fn: Function): Function;
	timeout<T>(ms: number, message: String): Promise<T>;
	mapSeries<T>(arr: Array<any>, fn: Function): Promise<T>;
}
