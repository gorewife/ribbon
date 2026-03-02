import { AttachmentBuilder, DiscordAPIError, Message, RESTJSONErrorCodes } from 'discord.js';
import { rm } from 'node:fs/promises';

import { EventData } from '../../models/internal-models.js';
import { makeImagePale } from '../../utils/index.js';
import { PrefixCommand } from './prefix-command.js';

export class PalePrefixCommand implements PrefixCommand {
    public prefix = ',pale';
    public requireGuild = false;

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const attachment = msg.attachments.first();

        if (!attachment?.contentType?.startsWith('image/')) {
            await msg.reply('Please attach an image file.');
            return;
        }

        const result = await makeImagePale(attachment.url);

        if ('error' in result) {
            await msg.reply(result.error);
            return;
        }

        try {
            await msg.reply({
                files: [new AttachmentBuilder(result.path, { name: 'pale.png' })],
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                error.code === RESTJSONErrorCodes.RequestEntityTooLarge
            ) {
                await msg.reply('The resulting image is too large to upload.');
            } else {
                throw error;
            }
        } finally {
            await rm(result.path, { force: true });
        }
    }
}
