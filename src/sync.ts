import { REST, Routes } from "discord.js";
import cmds from "./ext";

let commands: any[] = []
Object.values(cmds).forEach((c) => {
    if (c.slashCommands) {
        c.slashCommands.forEach((ccmd) => commands.push(ccmd.data.toJSON()));
    }
    if (c.contextMenus) {
        c.contextMenus.forEach((ccmd) => commands.push(ccmd.data.toJSON()));
    }
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const resp = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands }) as any[];

    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}