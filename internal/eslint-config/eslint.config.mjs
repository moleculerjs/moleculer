import tseslint from "typescript-eslint";
import nodejsConfig from "./nodejs.mjs";

export default tseslint.config(...nodejsConfig);
