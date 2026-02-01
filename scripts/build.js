import esbuild from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import zlib from "node:zlib"; 

try {
    if (fs.existsSync("./dist")) {
        fs.rmSync("./dist", { recursive: true });
    }
    
    execSync("npx tsc");

    await esbuild.build({
        entryPoints: ["./src/browser.ts"],
        outfile: "./dist/cdn.min.js",
        bundle: true,
        minify: true,
        platform: "browser",
    });

    const compressed = zlib.gzipSync(fs.readFileSync("./dist/cdn.min.js"));
    console.log(`Size (minified + gziped): ${bytesToSize(compressed.length)}`);
    
} catch (err) {
    console.error(`failed to build: ${err.message}`);
    process.exit(1);
}

function bytesToSize(bytes) {
    if (bytes === 0) return "0 KB";
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
}
