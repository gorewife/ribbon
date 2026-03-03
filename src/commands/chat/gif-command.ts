import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    DiscordAPIError,
    PermissionsString,
    RESTJSONErrorCodes,
} from 'discord.js';
import { rm } from 'node:fs/promises';

import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { createEmbed, InteractionUtils, videoToGif } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class GifCommand implements Command {
    public names = [Lang.getRef('chatCommands.gif', Language.Default)];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const attachment = intr.options.getAttachment('video', true);

        const isVideo = attachment.contentType?.startsWith('video/');
        const isImage = attachment.contentType?.startsWith('image/');

        if (!isVideo && !isImage) {
            await InteractionUtils.send(intr, createEmbed('Please attach a video or image file.'));
            return;
        }

        const ext = attachment.name.split('.').pop() ?? 'mp4';
        const result = await videoToGif(attachment.url, ext);

        if ('error' in result) {
            await InteractionUtils.send(intr, createEmbed(result.error));
            return;
        }

        try {
            await InteractionUtils.send(intr, {
                embeds: [createEmbed().setImage('attachment://output.gif')],
                files: [new AttachmentBuilder(result.path, { name: 'output.gif' })],
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                error.code === RESTJSONErrorCodes.RequestEntityTooLarge
            ) {
                await InteractionUtils.send(
                    intr,
                    createEmbed(
                        'The resulting GIF is too large to upload. Try a shorter or lower-resolution video.'
                    )
                );
            } else {
                throw error;
            }
        } finally {
            await rm(result.path, { force: true });
        }
    }
}
