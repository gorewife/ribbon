import { Attachment, AttachmentBuilder, DiscordAPIError, Message, RESTJSONErrorCodes } from 'discord.js';
import { rm } from 'node:fs/promises';

import { PrefixCommand } from './prefix-command.js';
import { EventData } from '../../models/internal-models.js';
import { createEmbed, makeImagePale } from '../../utils/index.js';

async function resolveMedia(msg: Message): Promise<Attachment | null> {
    const own = msg.attachments.first();
    if (own) return own;

    if (msg.reference?.messageId) {
        try {
            const ref = await msg.fetchReference();
            const refAttachment = ref.attachments.first();
            if (refAttachment) return refAttachment;
        } catch {
            // fetch failed, fall through
        }
    }

    const prev = await msg.channel.messages.fetch({ before: msg.id, limit: 1 });
    return prev.first()?.attachments.first() ?? null;
}

export class PalePrefixCommand implements PrefixCommand {
    public prefix = ',pale';
    public requireGuild = false;

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const attachment = await resolveMedia(msg);

        if (!attachment?.contentType?.startsWith('image/')) {
            await msg.reply({
                embeds: [createEmbed('Please attach an image or GIF file, or reply to one.')],
            });
            return;
        }

        const result = await makeImagePale(attachment.url);

        if ('error' in result) {
            await msg.reply({ embeds: [createEmbed(result.error)] });
            return;
        }

        const filename = `pale.${result.path.endsWith('.gif') ? 'gif' : 'png'}`;
        try {
            await msg.reply({
                embeds: [createEmbed().setImage(`attachment://${filename}`)],
                files: [new AttachmentBuilder(result.path, { name: filename })],
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
