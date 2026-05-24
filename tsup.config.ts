import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CLIENT_ENTRIES = ["components/index", "hooks/index", "presets/ballet"];

function addUseClientDirective() {
  for (const entry of CLIENT_ENTRIES) {
    for (const ext of [".js", ".mjs"]) {
      const filePath = resolve("dist", entry + ext);
      try {
        const content = readFileSync(filePath, "utf-8");
        if (!content.startsWith('"use client"')) {
          writeFileSync(filePath, `"use client";\n${content}`);
        }
      } catch {}
    }
  }
}

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "server/index": "src/server/index.ts",
    "components/index": "src/components/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "validators/index": "src/validators/index.ts",
    "types/index": "src/types/index.ts",
    "presets/ballet": "src/presets/ballet.tsx",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [/^react/, /^next/, /^@prisma\/client/, /^zod/, /^clsx/, /^tailwind-merge/, /^sonner/, /\.css$/],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  onSuccess: async () => {
    const srcDir = resolve("src", "components");
    const destDirs = [resolve("dist"), resolve("dist", "components")];
    for (const destDir of destDirs) {
      mkdirSync(destDir, { recursive: true });
      try {
        copyFileSync(resolve(srcDir, "gallery.css"), resolve(destDir, "gallery.css"));
      } catch {}
    }
    addUseClientDirective();
  },
});
