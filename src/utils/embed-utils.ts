import { EmbedBuilder } from 'discord.js';

const EMBED_COLOR = 0xffd1e1;
const EMBED_FOOTER = '˖                        ۪                             ⊹';
const EMBED_THUMBNAIL = 'https://cdn.discordapp.com/emojis/1439456764348334222.webp?animated=true';

// creates an embed duh
export function createEmbed(description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setFooter({ text: EMBED_FOOTER })
        .setThumbnail(EMBED_THUMBNAIL);
    if (description) embed.setDescription(description);
    return embed;
}
