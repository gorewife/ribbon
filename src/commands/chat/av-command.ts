import { ChatInputCommandInteraction, PermissionsString } from 'discord.js';

import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { createEmbed, InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class AvCommand implements Command {
    public names = [Lang.getRef('chatCommands.av', Language.Default)];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const target = intr.options.getUser('user') ?? intr.user;
        const avatarUrl = target.displayAvatarURL({ size: 1024 });

        const embed = createEmbed()
            .setTitle(`${target.displayName}'s avatar`)
            .setImage(avatarUrl);

        await InteractionUtils.send(intr, embed);
    }
}
