import { SlashCommandBuilder, ChatInputCommandInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction } from "discord.js";
import type Client from "../utils/Client";

export type SlashCommandData = {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
};

export type ContextMenuData = {
    data: ContextMenuCommandBuilder;
    execute: (interaction: ContextMenuCommandInteraction) => Promise<any>;
};

export type ExtFile = {
    slashCommands?: SlashCommandData[];
    contextMenus?: ContextMenuData[];
    setup?: (client: Client<true>) => Promise<any>;
}

import * as tickets from "./tickets";

const extFiles: Record<string, ExtFile> = {
    tickets,
};

export default extFiles;