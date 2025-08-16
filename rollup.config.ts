import { defineConfig } from "rollup";
//import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import nodeExternals from "rollup-plugin-node-externals";
import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";
const plugins = [
  nodeExternals({
    deps: false,
    peerDeps: true,
  }),
  resolve({ preferBuiltins: true }),
  commonjs(),
  json(),
  typescript({
    tsconfigOverride: {
      include: ["src/**/*.ts"],
    },
  }),
  // typescript({
  //   tsconfig: "./tsconfig.json",
  // }),
  terser({
    format: {
      comments: false,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  }),
];
const baseConfig = {
  input: "src/index.ts",
  plugins: [...plugins],
};
export default defineConfig([
  {
    ...baseConfig,
    output: {
      dir: "dist/esm",
      format: "esm",
      sourcemap: "inline",
      // preserveModules: true,
      // preserveModulesRoot: "src",
    },
  },
  {
    ...baseConfig,
    output: {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: "inline",
    },
  },
  {
    input: "src/index.ts",
    output: [
      {
        dir: "dist/types",
        format: "esm",
        preserveModules: true,
        preserveModulesRoot: "src",
      },
    ],
    plugins: [dts()],
  },
]);
