import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TARGET_BYTES = 20 * 1024 * 1024;
const BYTES_PER_PIXEL = 1.5;
const MAX_FPS = 8;
const MIN_FPS = 4;
const MAX_SCALE = 320;
const MIN_SCALE = 120;
const IMAGE_GIF_DURATION = 3;
const IMAGE_GIF_FPS = 2;

const PALETTE_FILTER =
    'split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';

type GifResult = { path: string } | { error: string };

interface FileInfo {
    duration: number; // 0 for images
    width: number;
    height: number;
}

async function probeFile(inputPath: string): Promise<FileInfo | null> {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v',
            'quiet',
            '-print_format',
            'json',
            '-show_streams',
            '-select_streams',
            'v:0',
            inputPath,
        ]);
        const data = JSON.parse(stdout);
        const stream = data.streams?.[0];
        if (!stream) return null;

        const duration = parseFloat(stream.duration ?? stream.tags?.DURATION ?? '0');
        const width = parseInt(stream.width, 10);
        const height = parseInt(stream.height, 10);

        if (!width || !height) return null;
        return { duration: isNaN(duration) ? 0 : duration, width, height };
    } catch {
        return null;
    }
}

/**
 * Compute output dimensions for an image → GIF conversion.
 *
 * Rules (in order):
 *  1. Scale DOWN so neither dimension exceeds MAX_SCALE (maintain aspect ratio).
 *  2. Scale UP if the shorter dimension is below MIN_SCALE (maintain aspect ratio).
 *     This can push the longer dimension above MAX_SCALE for extreme aspect ratios,
 *     which is acceptable — file size is tiny for a static-image GIF.
 *  3. Round to even numbers (codec requirement).
 */
function calcImageScale(origWidth: number, origHeight: number): { w: number; h: number } {
    let w = origWidth;
    let h = origHeight;

    if (w > MAX_SCALE || h > MAX_SCALE) {
        const ratio = Math.min(MAX_SCALE / w, MAX_SCALE / h);
        w *= ratio;
        h *= ratio;
    }

    const shorter = Math.min(w, h);
    if (shorter < MIN_SCALE) {
        const ratio = MIN_SCALE / shorter;
        w *= ratio;
        h *= ratio;
    }

    return { w: Math.ceil(w / 2) * 2, h: Math.ceil(h / 2) * 2 };
}

function pickVideoSettings(
    duration: number,
    origWidth: number,
    origHeight: number
): { fps: number; scale: number } {
    const aspect = origWidth / origHeight;

    for (let fps = MAX_FPS; fps >= MIN_FPS; fps -= 2) {
        const maxScale = Math.sqrt((TARGET_BYTES * aspect) / (fps * duration * BYTES_PER_PIXEL));
        const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor(maxScale / 2) * 2));
        const estimatedBytes = scale * (scale / aspect) * fps * duration * BYTES_PER_PIXEL;
        if (estimatedBytes <= TARGET_BYTES) {
            return { fps, scale };
        }
    }

    return { fps: MIN_FPS, scale: MIN_SCALE };
}

async function runConversion(
    inputArgs: string[],
    vfFilter: string,
    outputPath: string
): Promise<boolean> {
    try {
        await execFileAsync('ffmpeg', [...inputArgs, '-vf', vfFilter, '-loop', '0', outputPath]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Downloads a file from url, converts it to a GIF, and returns the output path.
 * Accepts videos or static images. The caller is responsible for deleting the returned
 * path after use. On failure, all temp files are cleaned up and an error string is returned.
 */
export async function videoToGif(url: string, ext: string): Promise<GifResult> {
    const id = crypto.randomUUID();
    const inputPath = join(tmpdir(), `vivix-${id}.${ext}`);
    const outputPath = join(tmpdir(), `vivix-${id}.gif`);
    let committed = false;

    try {
        const res = await fetch(url);
        if (!res.ok) return { error: 'Failed to download the file.' };
        await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

        const info = await probeFile(inputPath);
        const isImage = !info?.duration;

        let ok: boolean;
        if (isImage) {
            const { w, h } = info
                ? calcImageScale(info.width, info.height)
                : { w: MAX_SCALE, h: MAX_SCALE };
            const filter = `fps=${IMAGE_GIF_FPS},scale=${w}:${h}:flags=lanczos,${PALETTE_FILTER}`;
            ok = await runConversion(
                ['-loop', '1', '-t', String(IMAGE_GIF_DURATION), '-i', inputPath],
                filter,
                outputPath
            );
        } else {
            const { fps, scale } = info
                ? pickVideoSettings(info.duration, info.width, info.height)
                : { fps: 6, scale: 240 };
            const filter = `fps=${fps},scale=${scale}:-2:flags=lanczos,${PALETTE_FILTER}`;
            ok = await runConversion(['-i', inputPath], filter, outputPath);
        }

        if (!ok) return { error: 'Conversion failed. Make sure `ffmpeg` is installed.' };

        committed = true;
        return { path: outputPath };
    } finally {
        await rm(inputPath, { force: true });
        if (!committed) await rm(outputPath, { force: true });
    }
}
