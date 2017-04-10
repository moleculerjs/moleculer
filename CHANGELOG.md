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

# Changes

## Update benchmarkify
Benchmarkify updated & created continuous benchmarking with [bench-bot](https://github.com/icebob/bench-bot). 
Bench-bot is a benchmark runner. If a new Pull Request opened, bench-bot will run benchmarks against the `master` branch and it will post the results to the PR conversation.





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
