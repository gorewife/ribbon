import { DiscordAPIError, Locale, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PalePrefixCommand } from '../../../src/commands/prefix/pale-prefix-command.js';
import { EventData } from '../../../src/models/internal-models.js';

// createEmbed is called then .setImage() is chained — return a self-referencing stub inline
// so no module-level variables are closed over (vi.mock is hoisted before any const declarations)
vi.mock('../../../src/utils/index.js', () => ({
    makeImagePale: vi.fn(),
    createEmbed: vi.fn(() => {
        const embed: any = { setImage: vi.fn().mockReturnThis() };
        return embed;
    }),
}));

vi.mock('node:fs/promises', () => ({
    rm: vi.fn().mockResolvedValue(undefined),
}));

/** Minimal message mock — avoids using mockDeep<Message> which can't mock discord.js mixin methods. */
function buildMsg(attachment?: object | null): { attachments: { first: () => object | undefined }; reply: ReturnType<typeof vi.fn> } {
    const reply = vi.fn().mockResolvedValue({});
    return {
        attachments: { first: () => attachment ?? undefined },
        reply,
    };
}

describe('PalePrefixCommand', () => {
    let paleCommand: PalePrefixCommand;
    let mockEventData: EventData;

    beforeEach(async () => {
        paleCommand = new PalePrefixCommand();
        mockEventData = new EventData(Locale.EnglishUS, Locale.EnglishUS);
        vi.clearAllMocks();
    });

    it('should have correct command properties', () => {
        expect(paleCommand.prefix).toBe(',pale');
        expect(paleCommand.requireGuild).toBe(false);
    });

    describe('execute', () => {
        it('should reply with error when no attachment is given', async () => {
            const msg = buildMsg(undefined);

            await paleCommand.execute(msg as any, mockEventData);

            expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
        });

        it('should reply with error when attachment is not an image', async () => {
            const msg = buildMsg({ contentType: 'video/mp4', url: 'https://cdn.test/v.mp4', name: 'v.mp4' });

            await paleCommand.execute(msg as any, mockEventData);

            expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
        });

        it('should reply with error when makeImagePale fails', async () => {
            const { makeImagePale } = await import('../../../src/utils/index.js');
            (makeImagePale as ReturnType<typeof vi.fn>).mockResolvedValue({
                error: 'Failed to process the image. Make sure `ffmpeg` is installed.',
            });

            const msg = buildMsg({ contentType: 'image/png', url: 'https://cdn.test/img.png', name: 'img.png' });

            await paleCommand.execute(msg as any, mockEventData);

            expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
        });

        it('should reply with the pale image on success', async () => {
            const { makeImagePale } = await import('../../../src/utils/index.js');
            (makeImagePale as ReturnType<typeof vi.fn>).mockResolvedValue({ path: '/tmp/vivix-test-pale.png' });

            const msg = buildMsg({ contentType: 'image/jpeg', url: 'https://cdn.test/img.jpg', name: 'img.jpg' });

            await paleCommand.execute(msg as any, mockEventData);

            expect(msg.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    embeds: expect.any(Array),
                    files: expect.arrayContaining([expect.objectContaining({ name: 'pale.png' })]),
                })
            );
        });

        it('should reply with friendly message on Discord 40005 error', async () => {
            const { makeImagePale } = await import('../../../src/utils/index.js');
            (makeImagePale as ReturnType<typeof vi.fn>).mockResolvedValue({ path: '/tmp/vivix-test-pale.png' });

            const apiError = Object.assign(new Error('Request Entity Too Large'), {
                code: RESTJSONErrorCodes.RequestEntityTooLarge,
            }) as DiscordAPIError;
            Object.setPrototypeOf(apiError, DiscordAPIError.prototype);

            const msg = buildMsg({ contentType: 'image/png', url: 'https://cdn.test/img.png', name: 'img.png' });
            msg.reply.mockRejectedValueOnce(apiError);

            await paleCommand.execute(msg as any, mockEventData);

            expect(msg.reply).toHaveBeenLastCalledWith(
                expect.objectContaining({ embeds: expect.any(Array) })
            );
        });
    });
});
