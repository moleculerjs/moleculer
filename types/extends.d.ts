interface Promise<T> {
	delay<T>(ms: number): Promise<T>;
}
