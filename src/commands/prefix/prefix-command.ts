import { Message } from 'discord.js';

import { EventData } from '../../models/internal-models.js';

export interface PrefixCommand {
    prefix: string;
    requireGuild: boolean;
    execute(msg: Message, data: EventData): Promise<void>;
}
