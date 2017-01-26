# TODO

## Common
- multi params for multi-call & return array
- features (?)
- transport actions with config in Node INFO:
	```js
	"posts.find": {
		cache: true,
		params: { ... },
		publish: false
	}
	```

- create d.ts file

- cli tool for generate project & Services
	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js

	- `ices init` - generate an ice-services based project
	- `ices add service` - generate an empty service
	- `ices add middleware` - generate an empty middleware
	- `ices add plugin` - generate an empty plugin
	https://github.com/tj/ngen 

- circuit breaker: https://github.com/awolden/brakes

## Services
- Validator Factory for service what is resolve the params schema. Built-in resolver is validatorjs (it is the fastest)

## Transporters
- Redis transporter
- websocket
- add gzip support

## Cachers
- add lru features to Memory and Redis

## Context
