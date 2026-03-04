import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PALE_SIZE = 120;
const PALE_CURVES =
    // eslint-disable-next-line quotes
    "curves=r='0/0.18 0.5/0.65 1/0.90':g='0/0.17 0.5/0.64 1/0.89':b='0/0.15 0.5/0.62 1/0.88'";
const PALE_HUE = 'hue=s=0.14';
const SCALE_FILTER = `scale=${PALE_SIZE}:${PALE_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos`;
const PALETTE_FILTER =
    'split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';

type ImageResult = { path: string } | { error: string };

/**
 * Downloads an image from `url`, applies an instagram ass filter
 * fit within 120×120. GIF inputs are output as animated GIFs; everything else as PNG
 * The caller is responsible for deleting the returned path after use also
 */
export async function makeImagePale(url: string): Promise<ImageResult> {
    const id = crypto.randomUUID();
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? 'png';
    const isGif = ext === 'gif';
    const inputPath = join(tmpdir(), `vivix-${id}.${ext}`);
    const outputExt = isGif ? 'gif' : 'png';
    const outputPath = join(tmpdir(), `vivix-${id}-pale.${outputExt}`);
    let committed = false;

    try {
        const res = await fetch(url);
        if (!res.ok) return { error: 'Failed to download the image.' };
        await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

        try {
            if (isGif) {
                const filter = `${SCALE_FILTER},${PALE_CURVES},${PALE_HUE},${PALETTE_FILTER}`;
                await execFileAsync('ffmpeg', [
                    '-i',
                    inputPath,
                    '-vf',
                    filter,
                    '-loop',
                    '0',
                    outputPath,
                ]);
            } else {
                const filter = `${SCALE_FILTER},${PALE_CURVES},${PALE_HUE}`;
                await execFileAsync('ffmpeg', ['-i', inputPath, '-vf', filter, outputPath]);
            }
        } catch {
            return { error: 'Failed to process the image. Make sure `ffmpeg` is installed.' };
        }

        committed = true;
        return { path: outputPath };
    } finally {
        await rm(inputPath, { force: true });
        if (!committed) await rm(outputPath, { force: true });
    }
}
