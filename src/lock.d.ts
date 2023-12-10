declare class Lock {
    locked: Map<string, any[]>;

    acquire(key: string, ttl: number): Promise<any>;
    isLocked(key: string): boolean;
    release(key: string): Promise<void>;
}

export = Lock;
