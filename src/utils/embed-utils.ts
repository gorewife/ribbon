import { EmbedBuilder } from 'discord.js';

const EMBED_COLOR = 0xffd1e1;
const EMBED_FOOTER = '✦ ✦ ✦';

/**
 * Creates a pre-styled EmbedBuilder with the bot's brand color and footer.
 * Use this for all inline embeds (error messages, media replies, etc.).
 */
export function createEmbed(description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setFooter({ text: EMBED_FOOTER });
    if (description) embed.setDescription(description);
    return embed;
}
