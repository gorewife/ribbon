import {
    AttachmentBuilder,
    DiscordAPIError,
    Message,
    RESTJSONErrorCodes,
} from 'discord.js';
import { rm } from 'node:fs/promises';

import { EventData } from '../../models/internal-models.js';
import { videoToGif } from '../../utils/index.js';
import { PrefixCommand } from './prefix-command.js';

export class GifPrefixCommand implements PrefixCommand {
    public prefix = ',gif';
    public requireGuild = false;

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const attachment = msg.attachments.first();

        if (!attachment?.contentType?.startsWith('video/')) {
            await msg.reply('Please attach a video file.');
            return;
        }

        const ext = attachment.name.split('.').pop() ?? 'mp4';
        const result = await videoToGif(attachment.url, ext);

        if ('error' in result) {
            await msg.reply(result.error);
            return;
        }

        try {
            await msg.reply({
                files: [new AttachmentBuilder(result.path, { name: 'output.gif' })],
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                error.code === RESTJSONErrorCodes.RequestEntityTooLarge
            ) {
                await msg.reply('The resulting GIF is too large to upload. Try a shorter or lower-resolution video.');
            } else {
                throw error;
            }
        } finally {
            await rm(result.path, { force: true });
        }
    }
}
