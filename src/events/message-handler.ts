import { Message } from 'discord.js';

import { EventHandler, PrefixCommandHandler, TriggerHandler } from './index.js';

export class MessageHandler implements EventHandler {
    constructor(
        private triggerHandler: TriggerHandler,
        private prefixCommandHandler: PrefixCommandHandler
    ) {}

    public async process(msg: Message): Promise<void> {
        // Don't respond to system messages or self
        if (msg.system || msg.author.id === msg.client.user?.id) {
            return;
        }

        await this.triggerHandler.process(msg);
        await this.prefixCommandHandler.process(msg);
    }
}
