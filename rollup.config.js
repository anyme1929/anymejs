import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'rollup-plugin-dts';
export default defineConfig([
    {
        input: 'src/index.ts',
        watch: {
            include: 'src/**/*',
            delay: 300, // 防抖延迟
            chokidar: {
                usePolling: true,       // 强制轮询
                interval: 100,          // 每 100ms 检查一次文件变化
            },
        },
        output:
        {
            dir: 'dist/esm',
            format: 'esm',
            sourcemap: true
        }
        ,
        plugins: [
            nodeExternals({
                deps: true,    // 处理 dependencies
                peerDeps: true,
            }),
            resolve({ preferBuiltins: true }),
            commonjs(),
            json(),
            typescript({
                tsconfig: './tsconfig.json'
            }),
            terser()
        ]
    },
    {
        input: 'src/index.ts',
        watch: {
            include: 'src/**/*',
            delay: 300, // 防抖延迟
            // 2. 强制使用轮询模式（解决 WSL/Docker/网络文件系统问题）
            chokidar: {
                usePolling: true,       // 强制轮询
                interval: 100,          // 每 100ms 检查一次文件变化
            },
        },
        output:
        {
            dir: 'dist/cjs',
            format: 'cjs',
            sourcemap: true,
            // preserveModules: true,
            // preserveModulesRoot: 'src'
        },
        plugins: [
            nodeExternals({
                deps: true,    // 处理 dependencies
                peerDeps: true
            }),
            resolve({ preferBuiltins: true }),
            commonjs(),
            json(),
            typescript({
                tsconfig: './tsconfig.json'
            }),
            terser()
        ]
    },
    // 生成声明文件
    {
        input: 'src/index.ts',
        output: [{
            dir: 'dist/types',
            format: 'esm',
            preserveModules: true,
            preserveModulesRoot: 'src'
        }],
        plugins: [dts()],
    }
])
