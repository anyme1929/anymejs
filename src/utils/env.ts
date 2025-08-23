import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
(function env(path: string) {
  const parse = (path: string) => {
    const envContent = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;
      // 分割键值对（只以第一个=为分隔点）
      const sepIndex = trimmedLine.indexOf("=");
      if (sepIndex === -1) continue;

      const key = line.slice(0, sepIndex).trim();
      if (!key) continue;
      // 处理值（包括引号）
      let value = trimmedLine.slice(sepIndex + 1).trim();

      // 移除行内注释（#后面的内容）
      const commentIndex = value.indexOf("#");
      if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        // 移除首尾引号
        const quoteChar = value[0];
        value = value.slice(1, -1);
        // 解析转义字符（支持 \" \' \\）
        if (quoteChar === '"') {
          value = value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        } else {
          value = value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        }
      }
      if (typeof process !== "undefined" && !(key in process.env))
        process.env[key] = value;
    }
  };
  const absolutePath = isAbsolute(path) ? path : resolve(path);
  if (!existsSync(absolutePath)) return;
  if (typeof process?.loadEnvFile === "function")
    process.loadEnvFile(absolutePath);
  else parse(absolutePath);
})(".env");
