import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { Args } from './index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export const ChatCommandMetadata: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = {
    AV: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.av', Language.Default),
        description: Lang.getRef('commandDescs.av', Language.Default),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                name: 'user',
                description: 'The user whose avatar to show. Defaults to you.',
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },
    GIF: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.gif', Language.Default),
        description: Lang.getRef('commandDescs.gif', Language.Default),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                name: 'video',
                description: 'The video to convert.',
                type: ApplicationCommandOptionType.Attachment,
                required: true,
            },
        ],
    },
    DEV: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.dev', Language.Default),
        description: Lang.getRef('commandDescs.dev', Language.Default),
        dm_permission: true,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
        ]).toString(),
        options: [
            {
                ...Args.DEV_COMMAND,
                required: true,
            },
        ],
    },
    HELP: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.help', Language.Default),
        description: Lang.getRef('commandDescs.help', Language.Default),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.HELP_OPTION,
                required: true,
            },
        ],
    },
    INFO: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.info', Language.Default),
        description: Lang.getRef('commandDescs.info', Language.Default),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.INFO_OPTION,
                required: true,
            },
        ],
    },
    TEST: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.test', Language.Default),
        description: Lang.getRef('commandDescs.test', Language.Default),
        dm_permission: true,
        default_member_permissions: undefined,
    },
};

export const MessageCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_SENT: {
        type: ApplicationCommandType.Message,
        name: Lang.getRef('messageCommands.viewDateSent', Language.Default),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};

export const UserCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_JOINED: {
        type: ApplicationCommandType.User,
        name: Lang.getRef('userCommands.viewDateJoined', Language.Default),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};
