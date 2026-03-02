import { Locale } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvCommand } from '../../../src/commands/chat/av-command.js';
import { EventData } from '../../../src/models/internal-models.js';
import { InteractionUtils } from '../../../src/utils/index.js';
import { interactionBuilder, userBuilder } from '../../builders/discord-builders.js';

vi.mock('../../../src/utils/index.js', () => ({
    InteractionUtils: {
        send: vi.fn().mockResolvedValue({}),
    },
}));

vi.mock('../../../src/services/index.js', () => ({
    Lang: {
        getRef: vi.fn().mockImplementation((key: string) => key.split('.').pop() ?? key),
    },
}));

describe('AvCommand', () => {
    let avCommand: AvCommand;
    let mockEventData: EventData;

    beforeEach(() => {
        avCommand = new AvCommand();
        mockEventData = new EventData(Locale.EnglishUS, Locale.EnglishUS);
        vi.clearAllMocks();
    });

    it('should have correct command properties', () => {
        expect(avCommand.names).toEqual(['av']);
        expect(avCommand.deferType).toBe('PUBLIC');
        expect(avCommand.requireClientPerms).toEqual([]);
    });

    describe('execute', () => {
        it('should show the invoker avatar when no user option is given', async () => {
            const user = userBuilder().withId('invoker123').build();
            (user.displayAvatarURL as ReturnType<typeof vi.fn>).mockReturnValue(
                'https://cdn.discordapp.com/avatars/invoker123/hash.png'
            );
            Object.defineProperty(user, 'displayName', {
                value: 'InvokerUser',
                writable: true,
                configurable: true,
            });

            const interaction = interactionBuilder().withUser(user).build();
            // Replace options entirely so getUser returns null (no target)
            (interaction as any).options = { getUser: vi.fn().mockReturnValue(null) };

            await avCommand.execute(interaction as any, mockEventData);

            expect(InteractionUtils.send).toHaveBeenCalledWith(
                interaction,
                expect.objectContaining({
                    data: expect.objectContaining({
                        title: "InvokerUser's avatar",
                        image: { url: 'https://cdn.discordapp.com/avatars/invoker123/hash.png' },
                    }),
                })
            );
        });

        it('should show the target user avatar when a user option is provided', async () => {
            const invoker = userBuilder().withId('invoker123').build();
            const target = userBuilder().withId('target456').build();
            (target.displayAvatarURL as ReturnType<typeof vi.fn>).mockReturnValue(
                'https://cdn.discordapp.com/avatars/target456/hash.png'
            );
            Object.defineProperty(target, 'displayName', {
                value: 'TargetUser',
                writable: true,
                configurable: true,
            });

            const interaction = interactionBuilder().withUser(invoker).build();
            (interaction as any).options = { getUser: vi.fn().mockReturnValue(target) };

            await avCommand.execute(interaction as any, mockEventData);

            expect(InteractionUtils.send).toHaveBeenCalledWith(
                interaction,
                expect.objectContaining({
                    data: expect.objectContaining({
                        title: "TargetUser's avatar",
                        image: { url: 'https://cdn.discordapp.com/avatars/target456/hash.png' },
                    }),
                })
            );
        });
    });
});
