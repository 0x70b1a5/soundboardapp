const path = require('path');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const util = require('util');

const execFileAsync = util.promisify(execFile);

const CONFIG = {
    targetLoudness: -16,
    tolerance: 0.5,
    audioFolder: './public/soundboard'
};

async function getLoudness(filePath) {
    try {
        const { stderr } = await execFileAsync(ffmpeg, [
            '-i', filePath,
            '-af', 'ebur128=framelog=verbose',
            '-f', 'null', '-'
        ]);

        const match = stderr.match(/I:\s*([-0-9.]+)/);
        return match ? parseFloat(match[1]) : null;
    } catch (error) {
        console.error(`Error measuring loudness for ${filePath}:`, error);
        return null;
    }
}

async function normalizeFile(filePath) {
    try {
        const inputLoudness = await getLoudness(filePath);
        if (inputLoudness === null) return;

        console.log(`Processing ${path.basename(filePath)}`);
        console.log(`Input loudness: ${inputLoudness} LUFS`);

        const loudnessDiff = Math.abs(CONFIG.targetLoudness - inputLoudness);

        if (loudnessDiff > CONFIG.tolerance) {
            const gain = CONFIG.targetLoudness - inputLoudness;
            await execFileAsync(ffmpeg, [
                '-i', filePath,
                '-af', `volume=${gain}dB`,
                '-y', filePath
            ]);
            console.log(`Normalized with ${gain}dB gain`);
        } else {
            console.log('Within tolerance, skipping');
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function processDirectory(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await processDirectory(fullPath);
            } else if (/\.(mp3|ogg)$/i.test(entry.name)) {
                await normalizeFile(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error);
    }
}

async function main() {
    console.log('Beginning audio normalization...');
    await processDirectory(CONFIG.audioFolder);
    console.log('Audio normalization completed.');
}

main().catch(console.error); 