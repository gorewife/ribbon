import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type ImageResult = { path: string } | { error: string };

/**
 * Downloads an image from `url`, applies a pale/washed-out filter, and returns the output path.
 * The caller is responsible for deleting the returned path after use.
 * On failure, all temp files are cleaned up internally and an error string is returned.
 */
export async function makeImagePale(url: string): Promise<ImageResult> {
    const id = crypto.randomUUID();
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? 'png';
    const inputPath = join(tmpdir(), `vivix-${id}.${ext}`);
    const outputPath = join(tmpdir(), `vivix-${id}-pale.png`);
    let committed = false;

    try {
        const res = await fetch(url);
        if (!res.ok) return { error: 'Failed to download the image.' };
        await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

        try {
            await execFileAsync('ffmpeg', [
                '-i',
                inputPath,
                '-vf',
                'scale=iw*0.18:ih*0.18:flags=neighbor,scale=iw:ih:flags=neighbor,eq=saturation=0.18:brightness=0.06:contrast=0.75:gamma=1.05',
                outputPath,
            ]);
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
