const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const pluginsDir = "./standalone";
const tempDir = "./zips";

// Zorg dat de tijdelijke map bestaat
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// // Haal plugin-mappen op (behalve .DS_Store etc.)
// const plugins = fs.readdirSync(pluginsDir).filter(
//     (p) => p !== ".DS_Store" && fs.statSync(path.join(pluginsDir, p)).isDirectory()
// );

const plugins = ['Fv-welcomer'];

console.log("📦 Start met zippen van plugins...");

(async () => {
    for (const plugin of plugins) {
        const pluginPath = path.join(pluginsDir, plugin);
        const zipName = `${plugin}.zip`;
        const zipTempPath = path.join(tempDir, zipName);
        const zipFinalPath = path.join(pluginPath, zipName);

        // Verwijder oude zip (indien aanwezig)
        if (fs.existsSync(zipFinalPath)) {
            fs.rmSync(zipFinalPath);
        }

        const output = fs.createWriteStream(zipTempPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", (err) => {
            throw err;
        });

        output.on("close", () => {
            console.log(`✅ ${plugin}: ${archive.pointer()} bytes geschreven.`);
            fs.copyFileSync(zipTempPath, zipFinalPath);
        });

        archive.pipe(output);

        // Alleen zippen als er bestanden in zitten
        const files = fs.readdirSync(pluginPath).filter((f) => f !== zipName);
        if (files.length === 0) {
            console.log(`⚠️ ${plugin}: map is leeg, overslaan...`);
            continue;
        }

        archive.directory(pluginPath, false);
        await archive.finalize();
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("🎉 Klaar! Alle plugins gezipt.");
})();
