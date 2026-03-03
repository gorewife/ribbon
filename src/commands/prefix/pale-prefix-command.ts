import { AttachmentBuilder, DiscordAPIError, Message, RESTJSONErrorCodes } from 'discord.js';
import { rm } from 'node:fs/promises';

import { PrefixCommand } from './prefix-command.js';
import { EventData } from '../../models/internal-models.js';
import { createEmbed, makeImagePale } from '../../utils/index.js';

export class PalePrefixCommand implements PrefixCommand {
    public prefix = ',pale';
    public requireGuild = false;

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const attachment = msg.attachments.first();

        if (!attachment?.contentType?.startsWith('image/')) {
            await msg.reply({ embeds: [createEmbed('Please attach an image file.')] });
            return;
        }

        const result = await makeImagePale(attachment.url);

        if ('error' in result) {
            await msg.reply({ embeds: [createEmbed(result.error)] });
            return;
        }

        try {
            await msg.reply({
                embeds: [createEmbed().setImage('attachment://pale.png')],
                files: [new AttachmentBuilder(result.path, { name: 'pale.png' })],
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                error.code === RESTJSONErrorCodes.RequestEntityTooLarge
            ) {
                await msg.reply({
                    embeds: [createEmbed('The resulting image is too large to upload.')],
                });
            } else {
                throw error;
            }
        } finally {
            await rm(result.path, { force: true });
        }
    }
}
