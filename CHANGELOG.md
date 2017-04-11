<a name="0.x.0"></a>
# 0.x.0 (2017-xx-xx)

# New
## Serializers for transporters #10
Implemented pluggable serializers.
Built-in serializers:
- JSON (default)
- [x] [Avro](https://github.com/mtth/avsc)
- [x] [MsgPack](https://github.com/mcollina/msgpack5)

## Typescript definition file #5
Created an index.d.ts file. I'm not familiar in Typescript, so if you found error please help me and open a PR with fix. Thank you!

**Usage**
```js
let JSONSerializer = require("moleculer").Serializers.JSON;

let broker = new ServiceBroker({
	serializer: new JSONSerializer(),
	transporter: new Transporter(),
	nodeID: "node-1"	
});
```

## Metrics rate option
Added `metricsRate` options to broker. This property sets the rate of sampled calls. 
- `1` means to metric all calls
- `0.5` means to metric 50% of calls
- `0.1` means to metric 10% of calls

**Usage**
```js
let broker = new ServiceBroker({
    metrics: true,
    metricsRate: 0.1
});
```

## Context meta data
Added `meta` prop to `Context`. The `meta` will be merged if has parent context.
In case of remote call the metadata will be transfered to target node.

**Usage**
```js
// Create new context with params & meta
let ctx = new Context({
    broker,
    action,
    params: {
        a: 5
    },
    meta: {
        user: "John"
    }
})
```

```js
// Broker call with meta data
broker.call("user.create", { name: "Adam", status: true}, {
    timeout: 1000,
    meta: {
        // Send logged in user data with request to the service
        loggedInUser: {
            userID: 45,
            roles: [ "admin" ]
        }
    }
})
```

# Changes

## Update benchmarkify
Benchmarkify updated & created continuous benchmarking with [bench-bot](https://github.com/icebob/bench-bot). 
Bench-bot is a benchmark runner. If a new Pull Request opened, bench-bot will run benchmarks against the `master` branch and it will post the results to the PR conversation.

## Timeout & fallback response handling in local calls too
- Can be use timeout & fallback response in local calls.
- Timeout handling move from `Transit` to `ServiceBroker`
- Remove `wrapContentAction`
- In case of call error, Node will be unavailable, if the error code >= `500`

## Context changes
- Removed `createSubContext`
- Removed `ctx.parent` and added `ctx.parentID`






<a name="0.6.0"></a>
# 0.6.0 (2017-03-31)

# New

## Validator library changed
The previous `validatorjs` validator removed and added own very fast [fastest-validator](https://github.com/icebob/fastest-validator) library. It can 3M validations/sec. Hereafter validation is not the bottle-neck. Only -7% slower with validation.

**Here is the new benchmark result:**
```
Suite: Call with param validator
√ No validator x 588,463 ops/sec ±1.11% (84 runs sampled)
√ With validator passes x 541,903 ops/sec ±1.41% (84 runs sampled)
√ With validator fail x 25,648 ops/sec ±1.62% (85 runs sampled)
   No validator              0.00%    (588,463 ops/sec)
   With validator passes    -7.91%    (541,903 ops/sec)
   With validator fail     -95.64%     (25,648 ops/sec)
```

**Example params definition:**
```js
mult: {
    params: {
        a: { type: "number" },
        b: { type: "number" }
    },
    handler(ctx) {
        return Number(ctx.params.a) * Number(ctx.params.b);
    }
}
```

**Validation error object:**
```js
[ { 
    type: 'number',
    field: 'b',
    message: 'The \'b\' field must be a number!' 
} ]
```

# Changes
## Added & removed log levels
* Added 2 new log levels (`fatal` and `trace`);
* Removed unused `log` level. Use `info` level instead.

**Available levels:**
```js
logger.trace("trace level");
logger.debug("debug level");
logger.info("info level");
logger.warn("warn level");
logger.error("error level");	
logger.fatal("fatal level");
```

**Logger fallback levels:**
* `trace` -> `debug` -> `info`
* `debug` -> `info`
* `info`: main level, no fallback
* `warn` -> `error` -> `info`
* `error` -> `info`
* `fatal` -> `error` -> `info`


<a name="0.5.0"></a>
# 0.5.0 (2017-02-26)

First release.
