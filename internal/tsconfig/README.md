# @moleculer/tsconfig

This package contains the standard TypeScript configurations for packages used by the Moleculer framework. It is intended for internal use only.

## Usage

### Installation

```sh
pnpm --filter <target_internal_package_name> add -D @moleculer/tsconfig@workspace:*
```

### Peer dependencies

The package relies on the following peer dependencies:

-   `typescript`

Since typescript is installed at the monorepo root, it is not necessary to install it as a peer dependency in an individual package.

### Configuration

#### Node 20 (CJS)

Add the following to your typescript configuration file (e.g. `tsconfig.json`):

```
{
  "extends": "@moleculer/tsconfig/node20/tsconfig.json",
}
```
