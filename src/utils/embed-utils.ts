import { EmbedBuilder } from 'discord.js';

const EMBED_COLOR = 0xffd1e1;
const EMBED_FOOTER = '˖                        ۪                             ⊹';

// creates an embed duh
export function createEmbed(description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setFooter({ text: EMBED_FOOTER });
    if (description) embed.setDescription(description);
    return embed;
}
