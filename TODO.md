# TODO

## Common
- multi params for multi-call & return array
- features (?)

- create d.ts file

- cache: Meg lehessen adni hogy a cacheKey-hez mely paramétereket vegye figyelembe.
	Így pl egy get-nél csal elég megadni, hogy "id" és akkor nem kell meghívni
	a "drága" object-hash-et. Illetve, ha tovább van adva a user, akkor azt
	is hagyja ki belőle. 

Suite: Call with cachers
›› No cacher x 344,946 ops/sec ±0.22% (86 runs sampled)
›› Built-in cacher x 128,925 ops/sec ±0.39% (85 runs sampled)
›› Middleware cacher x 115,360 ops/sec ±1.06% (86 runs sampled)

   No cacher             0.00%    (344,946 ops/sec)
   Built-in cacher     -62.62%    (128,925 ops/sec)
   Middleware cacher   -66.56%    (115,360 ops/sec)
-----------------------------------------------------------------------
	

- Context-nél legyen egy ctx.user, amit a requester állít be. Pl Express
	Ez nem a params-ba megy, hogy cache-elést ne zavarja meg.	


- cli tool for generate project & Services
	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js

	- `ices init` - generate an servicer based project
	- `ices add service` - generate an empty service
	- `ices add middleware` - generate an empty middleware
	- `ices add plugin` - generate an empty plugin
	https://github.com/tj/ngen 

- circuit breaker: https://github.com/awolden/brakes
- https://github.com/aldeed/meteor-simple-schema

- Docs: https://github.com/segmentio/metalsmith

- Own fast validator
```js
	const v = require("...");
	get: {
		params: v.required().object({
			id: v.required().number().min(0).max(100),
			name: v.string().minLength(0).maxLength(128),
			settings: v.object({
				notify: v.boolean().object() // 2 accepted type: Boolean or Object
			}),
			roles: v.array().enum(["admin", "user"]),
			email: v.required().email(),
			homepage: v.regex(//gi)
		}
	}
```

```js
	const v = require("...");
	get: {
		params: v({
			id: { type: "number", req: true, min: 0, max: 100 },
			name: { type: "string", min: 0, max: 128 }
			settings: { type: "object", props: {
				notify: { type: ["boolean", "object" ] } // 2 accepted type: Boolean or Object
			}},
			roles: { type: "array", items: { type: "enum", enums: ["admin", "user"]),
			email: { type: "email", req: true },
			homepage: { type: "regex", pattern:/asd/gi }
		}
	}
```


## Broker
- handleExceptions: true option
	Catch unhandled exceptions and send an event with details. Can be catch in metrics, alert or logger services

## Services
- Validator Factory for service what is resolve the params schema. Built-in resolver is validatorjs (it is the fastest...yet)

## Transporters
- Redis transporter
- websocket
- add gzip support

## Cachers
- add lru features to Memory and Redis

## Context
