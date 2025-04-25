const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

// Read plugin directories, ignoring hidden files like .DS_Store
const plugins = fs.readdirSync("./open-discord/standalone").filter((p) => !p.startsWith("."));

// Remove existing zip files
for (const plugin of plugins) {
    const zipPath = path.join("open-discord", "standalone", plugin, `${plugin}.zip`);
    if (fs.existsSync(zipPath)) {
        fs.rmSync(zipPath);
    }
}
console.log("Removed old zip files!");

// Ensure temp directory exists
const tempDir = path.join("temp-open-discord", "standalone");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

let counter = 0;
for (const plugin of plugins) {
    const tempZipPath = path.join(tempDir, `${plugin}.zip`);
    const finalZipPath = path.join("open-discord", "standalone", plugin, `${plugin}.zip`);
    const pluginDir = path.join("open-discord", "standalone", plugin);

    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        console.log(`Wrote ${archive.pointer()} bytes for plugin: ${plugin}`);
        fs.copyFileSync(tempZipPath, finalZipPath);
        counter++;

        if (counter === plugins.length) {
            fs.rmSync("temp-open-discord", { recursive: true, force: true });
            console.log("Finished!");
        }
    });

    archive.on("warning", (err) => {
        console.warn("Archive warning:", err);
    });

    archive.on("error", (err) => {
        throw err;
    });

    archive.pipe(output);
    archive.directory(pluginDir, false);
    archive.finalize();
}
