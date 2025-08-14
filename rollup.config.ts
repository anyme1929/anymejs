import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import nodeExternals from "rollup-plugin-node-externals";
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
    tsconfig: "./tsconfig.json",
    sourceMap: true,
    inlineSources: true,
  }),
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
export default defineConfig([
  // {
  //   input: "src/index.ts",
  //   watch: {
  //     include: "src/**/*",
  //     chokidar: {
  //       usePolling: true,
  //       interval: 100,
  //     },
  //   },
  // },
  {
    input: "src/index.ts",
    output: {
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
      // preserveModules: true,
      // preserveModulesRoot: 'src'
    },
    plugins,
  },
  {
    input: "src/index.ts",
    output: {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
    },
    plugins,
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
