import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';

import { PrefixCommand } from '../commands/prefix/index.js';
import { EventDataService } from '../services/index.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export class PrefixCommandHandler {
    private rateLimiter = new RateLimiter(
        Config.rateLimiting.commands.amount,
        Config.rateLimiting.commands.interval * 1000
    );

    constructor(
        private commands: PrefixCommand[],
        private eventDataService: EventDataService
    ) {}

    public async process(msg: Message): Promise<void> {
        const command = this.commands.find(
            cmd => msg.content.startsWith(cmd.prefix) && (!cmd.requireGuild || !!msg.guild)
        );
        if (!command) return;

        if (this.rateLimiter.take(msg.author.id)) return;

        const data = await this.eventDataService.create({
            user: msg.author,
            channel: msg.channel,
            guild: msg.guild ?? undefined,
        });

        await command.execute(msg, data);
    }
}
