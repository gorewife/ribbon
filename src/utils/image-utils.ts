import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PALE_SIZE = 120;
const LUT_PATH = join(process.cwd(), 'assets/pale-lut.png');
const SCALE_FILTER = `scale=${PALE_SIZE}:${PALE_SIZE}:force_original_aspect_ratio=increase:flags=lanczos,crop=${PALE_SIZE}:${PALE_SIZE}`;
const PALETTE_FILTER =
    'split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';

type ImageResult = { path: string } | { error: string };

/**
 * Downloads an image from `url`, applies the pale LUT and scales it to fit within
 * 120×120. GIF inputs are output as animated GIFs; everything else as PNG.
 * The caller is responsible for deleting the returned path after use.
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
                const filter = `[0]${SCALE_FILTER}[scaled];[scaled][1]haldclut[colored];[colored]${PALETTE_FILTER}`;
                await execFileAsync('ffmpeg', [
                    '-i', inputPath,
                    '-i', LUT_PATH,
                    '-filter_complex', filter,
                    '-loop', '0',
                    outputPath,
                ]);
            } else {
                const filter = `[0]${SCALE_FILTER}[scaled];[scaled][1]haldclut`;
                await execFileAsync('ffmpeg', [
                    '-i', inputPath,
                    '-i', LUT_PATH,
                    '-filter_complex', filter,
                    outputPath,
                ]);
            }
        } catch {
            return { error: 'FFmpeg failed to process the image.' };
        }

        committed = true;
        return { path: outputPath };
    } finally {
        await rm(inputPath, { force: true });
        if (!committed) await rm(outputPath, { force: true });
    }
}
