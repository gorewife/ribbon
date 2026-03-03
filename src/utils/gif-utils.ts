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

type GifResult = { path: string } | { error: string };

interface VideoInfo {
    duration: number;
    width: number;
    height: number;
}

async function probeVideo(inputPath: string): Promise<VideoInfo | null> {
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

        if (!duration || !width || !height) return null;
        return { duration, width, height };
    } catch {
        return null;
    }
}

function pickSettings(
    duration: number,
    origWidth: number,
    origHeight: number
): { fps: number; scale: number } | null {
    const aspect = origWidth / origHeight;

    for (let fps = MAX_FPS; fps >= MIN_FPS; fps -= 2) {
        // Solve: TARGET = scale * (scale / aspect) * fps * duration * bpp
        // => scale^2 = TARGET / (fps * duration * bpp / aspect)
        const maxScale = Math.sqrt((TARGET_BYTES * aspect) / (fps * duration * BYTES_PER_PIXEL));
        const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor(maxScale / 2) * 2));

        // Check if this setting fits
        const estimatedBytes = scale * (scale / aspect) * fps * duration * BYTES_PER_PIXEL;
        if (estimatedBytes <= TARGET_BYTES) {
            return { fps, scale };
        }
    }

    // Last resort: minimum settings — return them and let the upload attempt handle it
    return { fps: MIN_FPS, scale: MIN_SCALE };
}

/**
 * Downloads a video from `url`, converts it to a GIF, and returns the output path.
 * The caller is responsible for deleting the returned path after use.
 * On failure, all temp files are cleaned up internally and an error string is returned.
 */
export async function videoToGif(url: string, ext: string): Promise<GifResult> {
    const id = crypto.randomUUID();
    const inputPath = join(tmpdir(), `vivix-${id}.${ext}`);
    const outputPath = join(tmpdir(), `vivix-${id}.gif`);
    let committed = false;

    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase());

    if (isImage) {
        await execFileAsync('ffmpeg', [
            '-loop',
            '1',
            '-t',
            '3',
            '-i',
            inputPath,
            '-vf',
            `fps=10,scale=320:-1:flags=lanczos`,
            '-loop',
            '0',
            outputPath,
        ]);
        return { path: outputPath };
    } else
        try {
            const res = await fetch(url);
            if (!res.ok) return { error: 'Failed to download the video.' };
            await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

            const info = await probeVideo(inputPath);
            const { fps, scale } = info
                ? (pickSettings(info.duration, info.width, info.height) ?? {
                      fps: MIN_FPS,
                      scale: MIN_SCALE,
                  })
                : { fps: 6, scale: 240 }; // ffprobe unavailable — safe fallback

            try {
                await execFileAsync('ffmpeg', [
                    '-i',
                    inputPath,
                    '-vf',
                    `fps=${fps},scale=${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
                    '-loop',
                    '0',
                    outputPath,
                ]);
            } catch {
                return { error: 'Conversion failed. Make sure `ffmpeg` is installed.' };
            }

            committed = true;
            return { path: outputPath };
        } finally {
            await rm(inputPath, { force: true });
            if (!committed) await rm(outputPath, { force: true });
        }
}
