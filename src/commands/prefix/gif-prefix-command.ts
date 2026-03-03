import {
    AttachmentBuilder,
    DiscordAPIError,
    Message,
    RESTJSONErrorCodes,
} from 'discord.js';
import { rm } from 'node:fs/promises';

import { PrefixCommand } from './prefix-command.js';
import { EventData } from '../../models/internal-models.js';
import { createEmbed, videoToGif } from '../../utils/index.js';

export class GifPrefixCommand implements PrefixCommand {
    public prefix = ',gif';
    public requireGuild = false;

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const attachment = msg.attachments.first();

        const isVideo = attachment?.contentType?.startsWith('video/');
        const isImage = attachment?.contentType?.startsWith('image/');

        if (!isVideo && !isImage) {
            await msg.reply({ embeds: [createEmbed('Please attach a video or image file.')] });
            return;
        }

        const ext = attachment.name.split('.').pop() ?? 'mp4';
        const result = await videoToGif(attachment.url, ext);

        if ('error' in result) {
            await msg.reply({ embeds: [createEmbed(result.error)] });
            return;
        }

        try {
            await msg.reply({
                embeds: [createEmbed().setImage('attachment://output.gif')],
                files: [new AttachmentBuilder(result.path, { name: 'output.gif' })],
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                error.code === RESTJSONErrorCodes.RequestEntityTooLarge
            ) {
                await msg.reply({
                    embeds: [
                        createEmbed(
                            'The resulting GIF is too large to upload. Try a shorter or lower-resolution video.'
                        ),
                    ],
                });
            } else {
                throw error;
            }
        } finally {
            await rm(result.path, { force: true });
        }
    }
}
