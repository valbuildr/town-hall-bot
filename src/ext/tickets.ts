import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Colors, ComponentType, ContainerBuilder, ContextMenuCommandBuilder, Events, GuildMember, InteractionContextType, Message, MessageFlags, SlashCommandBuilder, User, Role, type APIRole, type GuildTextBasedChannel, PermissionsBitField, MessageMentions, AllowedMentionsTypes, Client, GuildMemberRoleManager, AttachmentBuilder, MediaGalleryItem, MediaGalleryItemBuilder } from "discord.js";
import type { ContextMenuData, SlashCommandData } from "./";
import { isMod } from "../utils/staffCheck";
import snowflake from "../snowflake";
import howDidWeGetHere from "../utils/howDidWeGetHere";
import Canvas from '@napi-rs/canvas';
import { join } from "node:path";
import { request } from "undici";

async function newTicket(client: Client, creator: string, method: "dm" | "slash" | "context" | "button", fwdMsg?: Message): Promise<{ ticketId: string; channelId: string; } | undefined> {
    const guild = client.guilds.cache.get(process.env.SERVER_ID!) ?? await client.guilds.fetch(process.env.SERVER_ID!);
    const category = guild.channels.cache.get(process.env.MODMAIL_CATEGORY_ID!) ?? await guild.channels.fetch(process.env.MODMAIL_CATEGORY_ID!);
    const logChannel = guild.channels.cache.get(process.env.MODMAIL_LOG_ID!) ?? await guild.channels.fetch(process.env.MODMAIL_LOG_ID!);

    if (category && category.type === ChannelType.GuildCategory) {
        const id = snowflake.nextId().toString();
        const channel = await guild.channels.create({ name: `open-${id}`, parent: category });

        await channel.permissionOverwrites.create(channel.guild.roles.everyone, { ViewChannel: false });
        await channel.permissionOverwrites.create(client.user!.id, { ViewChannel: true, SendMessages: true });
        await channel.permissionOverwrites.create(process.env.MOD_ROLE_ID!, { ViewChannel: true, SendMessages: true });
        await channel.permissionOverwrites.create(creator, { ViewChannel: true, SendMessages: true });

        const fmtMethod = (m: "dm" | "slash" | "context" | "button") => {
            switch (m) {
                case "dm": return "DM";
                case "slash": return "Slash Command";
                case "context": return "Context Menu";
                case "button": return "Button";
            }
        }

        if (logChannel && logChannel.isSendable()) {
            const log = new ContainerBuilder()
                .addTextDisplayComponents(td =>
                    td.setContent(`## Created ticket\n> **User:** <@${creator}>\n> **Channel ID:** ${channel.id} (<#${channel.id}>)\n> **Method:** ${fmtMethod(method)}\n> **Ticket ID:** ${id}`)
                )
                .setAccentColor(Colors.Green);
            await logChannel.send({ components: [log], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [], roles: [] } });
        }

        if ((method === "dm" || method === "context") && fwdMsg) {
            const newTicketContainer = new ContainerBuilder()
                .addTextDisplayComponents(td =>
                    td.setContent(`## Ticket \`${id}\`\n> **Created by:** <@${creator}>\n> **Method:** ${fmtMethod(method)}\n\nSee the attached message below for the message sent that triggered the creation of the ticket.${method == "context" ? `\n-# Author: <@${fwdMsg.author.id}>\n-# Message Link: ${fwdMsg.url}` : ""}\n**Please be patient! Staff will help you as soon as they can.**`)
                )
                .setAccentColor(Colors.Blurple)
            await channel.send({ components: [newTicketContainer], flags: MessageFlags.IsComponentsV2 });
            await fwdMsg.forward(channel);
        } else if (method === "slash" || method === "button") {
            const newTicketContainer = new ContainerBuilder()
                .addTextDisplayComponents(td =>
                    td.setContent(`## Ticket \`${id}\`\n> **Created by:** <@${creator}>\n> **Method:** ${fmtMethod(method)}\n\nPlease state why you've opened this ticket.\n**Please be patient! Staff will help you as soon as they can.**`)
                )
                .setAccentColor(Colors.Blurple)
            await channel.send({ components: [newTicketContainer], flags: MessageFlags.IsComponentsV2 });
        }

        return { ticketId: id, channelId: channel.id };
    }
}

async function logTicketClosed(client: Client, ticketId: string, channelId: string, user: string) {
    const guild = client.guilds.cache.get(process.env.SERVER_ID!) ?? await client.guilds.fetch(process.env.SERVER_ID!);
    const logChannel = guild.channels.cache.get(process.env.MODMAIL_LOG_ID!) ?? await guild.channels.fetch(process.env.MODMAIL_LOG_ID!);

    if (logChannel && logChannel.isSendable()) {
        const log = new ContainerBuilder()
            .addTextDisplayComponents(td =>
                td.setContent(`## Closed ticket\n> **Closed by:** <@${user}>\n> **Channel ID:** ${channelId} (<#${channelId}>)\n> **Ticket ID:** ${ticketId}`)
            )
            .setAccentColor(Colors.Red);
        await logChannel.send({ components: [log], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [], roles: [] } });
    }
}

export const slashCommands: SlashCommandData[] = [
    {
        // @ts-ignore
        data: new SlashCommandBuilder()
            .setName("send-info-msg")
            .setDescription("Mod: Send the info message, including rules, ticket creation, and various other pieces of info.")
            .setContexts(InteractionContextType.Guild)
            .addChannelOption(opt =>
                opt.setName("channel")
                    .setDescription("The channel to send the creation message to.")
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
            .addBooleanOption(opt =>
                opt.setName("include-invite")
                    .setDescription("Include the primary invite link for the server as a seperate message. Defaults to False.")
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName("include-verification")
                    .setDescription("Include the verification button as a seperate message. Defaults to False.")
                    .setRequired(false)
            ),
        async execute(interaction) {
            if (isMod(interaction.member!.roles)) {
                const options = {
                    channel: interaction.options.getChannel("channel", true),
                    includeInvite: interaction.options.getBoolean("include-invite", false) ?? false,
                    includeVerification: interaction.options.getBoolean("include-verification", false) ?? false,
                }

                const dataFile = Bun.file("./src/data/rules.json");
                const fileData = await dataFile.json() as {
                    lastUpdated: string;
                    rules: Record<string, string>;
                    notes: string[]
                };

                const rulesContent = Object.entries(fileData.rules).map(([key, value]) => {
                    return `## ${key}\n${value}`;
                });
                const notesContent = fileData.notes.map(value => {
                    return `- ${value}`;
                })

                const containers = [
                    new ContainerBuilder()
                        .addTextDisplayComponents(td =>
                            td.setContent([
                                "# Server Rules",
                                "-# Last updated <t:1753276560:D>",
                                "",
                                ...rulesContent,
                                "",
                                "# Notes",
                                ...notesContent
                            ].join("\n"))
                        ),
                    new ContainerBuilder()
                        .addTextDisplayComponents(td =>
                            td.setContent([
                                "# Appeals",
                                "",
                                "We believe in second chances in most cases. Because of that, we have an appeals system in place.",
                                "All punishments (excluding kicks) can be appealed by visiting <https://appeal.gg/UKVMvUG2h9> and filling out the right form.",
                                "Due to limitations with appeal.gg, kicks can only be appealed by creating a ticket. (see directions below)"
                            ].join("\n"))
                        ),
                    new ContainerBuilder()
                        .addTextDisplayComponents(td =>
                            td.setContent([
                                "# Tickets",
                                "",
                                "If you need help from the staff, all you need to do is create a ticket.",
                                "There's many ways to create a ticket. Here's all the ways:",
                                `- DM <@${interaction.client.user.id}>.`,
                                "- Right click/hold down on a message, open the \"Apps\" submenu, and clicking \"Create Ticket from Message\".",
                                "- Use the `/ticket create` command.",
                                "- Click the button that reads \"Create a Ticket\" below."
                            ].join("\n"))
                        )
                        .addActionRowComponents(ar =>
                            ar.addComponents(
                                new ButtonBuilder()
                                    .setStyle(ButtonStyle.Primary)
                                    .setLabel("Create a Ticket")
                                    .setEmoji("🎫")
                                    .setCustomId("new-ticket")
                            )
                        )
                ];

                const channel = interaction.guild!.channels.cache.get(options.channel.id) ?? await interaction.guild!.channels.fetch(options.channel.id);

                if (channel && channel.isSendable()) {
                    await channel.send({ components: containers, flags: MessageFlags.IsComponentsV2 });

                    if (options.includeInvite) {
                        await channel.send({ content: `https://discord.gg/${process.env.PRIMARY_INVITE_SUFFIX!}` });
                    }
                    if (options.includeVerification) {
                        const btn = new ButtonBuilder()
                            .setCustomId("verify")
                            .setStyle(ButtonStyle.Success)
                            .setLabel("I agree to these rules!")
                            .setEmoji("✔️");
                        const ar = new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(btn);

                        await channel.send({ components: [ar] });
                    }
                }
            } else {
                await interaction.reply({ content: "You don't have the required role(s) for this command.", flags: MessageFlags.Ephemeral });
            }
        },
    },
    {
        //@ts-ignore
        data: new SlashCommandBuilder()
            .setName("ticket")
            .setDescription("Ticket commands")
            .setContexts(InteractionContextType.Guild)
            .addSubcommand(sc =>
                sc.setName("create")
                    .setDescription("Create a new ticket.")
            )
            .addSubcommand(sc =>
                sc.setName("add")
                    .setDescription("Adds a user/role to an open ticket.")
                    .addMentionableOption(opt =>
                        opt.setName("target")
                            .setDescription("The user/role to add.")
                            .setRequired(true)
                    )
                    .addBooleanOption(opt =>
                        opt.setName("ping")
                            .setDescription("Whether or not to ping the target. Defaults to False, not allowed for roles.")
                            .setRequired(false)
                    )
                    .addStringOption(opt =>
                        opt.setName("ticket-id")
                            .setDescription("The ID of the ticket to modify. Assumes the current ticket if ran in a ticket channel.")
                            .setRequired(false)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("remove")
                    .setDescription("Removes a user/role to an open ticket.")
                    .addMentionableOption(opt =>
                        opt.setName("target")
                            .setDescription("The user/role to remove.")
                            .setRequired(true)
                    )
                    .addStringOption(opt =>
                        opt.setName("ticket-id")
                            .setDescription("The ID of the ticket to modify. Assumes the current ticket if ran in a ticket channel.")
                            .setRequired(false)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("close")
                    .setDescription("Closes an open ticket.")
                    .addStringOption(opt =>
                        opt.setName("ticket-id")
                            .setDescription("The ID of the ticket to modify. Assumes the current ticket if ran in a ticket channel.")
                            .setRequired(false)
                    )
            ),
        async execute(interaction) {
            const subcommand = interaction.options.getSubcommand(true);

            const getTicket = async (ticketId: string) => {
                const channel = interaction.guild!.channels.cache.find((c) => c.name === `open-${ticketId}`);

                if (channel && channel.parentId === process.env.MODMAIL_CATEGORY_ID! && channel.type === ChannelType.GuildText) {
                    return channel;
                } else {
                    return null;
                }
            }

            const hasPermissions = async (channel: GuildTextBasedChannel, targetId: string) => {
                return channel.permissionsFor(targetId)?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]);
            };

            if (subcommand === "create") {
                const ticket = await newTicket(interaction.client, interaction.user.id, "slash");

                if (ticket) {
                    const resp = new ContainerBuilder()
                        .addTextDisplayComponents(td =>
                            td.setContent(`## Created Ticket \`${ticket.ticketId}\`\nVisit the created channel in ${interaction.guild!.name}, you should've been pinged there. Here's a handy link to the channel: <#${ticket.channelId}>`)
                        )
                        .setAccentColor(Colors.Green);
                    await interaction.reply({ components: [resp], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: "An error ocurred, please try again later.", flags: MessageFlags.Ephemeral });
                }

                return;
            } else if (subcommand === "add") {
                const options = {
                    target: interaction.options.getMentionable("target", true),
                    ping: interaction.options.getBoolean("ping", false) ?? false,
                    // @ts-ignore
                    ticketId: interaction.options.getString("ticket-id", false) ?? interaction.channel?.name.split("-")[1],
                };

                const ticket = await getTicket(options.ticketId);

                if (ticket !== null) {
                    const auth = await hasPermissions(ticket, interaction.user.id);

                    if (auth) {
                        if (options.target instanceof GuildMember || options.target instanceof Role) {
                            const name = options.target instanceof GuildMember ? options.target.user.username : options.target.name;
                            const id = options.target instanceof GuildMember ? options.target.user.id : options.target.id;

                            await ticket.permissionOverwrites.edit(options.target.id, { ViewChannel: true, SendMessages: true });

                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(td =>
                                    td.setContent(`## <@${interaction.user.id}> added ${options.target instanceof GuildMember ? "user" : "role"} ${name} to ticket\n<@${id}>`)
                                )
                                .setAccentColor(Colors.Blurple);

                            const allowedMentionsUsers = [];
                            if (options.ping && options.target instanceof GuildMember) { allowedMentionsUsers.push(options.target.user.id) }

                            const msg = await ticket.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: allowedMentionsUsers, roles: [] } });

                            await interaction.reply({ content: msg.url, flags: MessageFlags.Ephemeral });
                        }
                    } else {
                        await interaction.reply({ content: `You don't have permissions to add users/roles to this ticket.`, flags: MessageFlags.Ephemeral });
                    }
                } else {
                    await interaction.reply({ content: `No open ticket with the ID \`${options.ticketId}\` found.`, flags: MessageFlags.Ephemeral });
                }
            } else if (subcommand === "remove") {
                const options = {
                    target: interaction.options.getMentionable("target", true),
                    // @ts-ignore
                    ticketId: interaction.options.getString("ticket-id", false) ?? interaction.channel?.name.split("-")[1],
                };

                const ticket = await getTicket(options.ticketId);

                if (ticket !== null) {
                    const auth = await hasPermissions(ticket, interaction.user.id);

                    if (auth) {
                        if (options.target instanceof GuildMember || options.target instanceof Role) {
                            const name = options.target instanceof GuildMember ? options.target.user.username : options.target.name;

                            await ticket.permissionOverwrites.delete(options.target.id);

                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(td =>
                                    td.setContent(`## Removed ${options.target instanceof GuildMember ? "user" : "role"} ${name} from ticket`)
                                )
                                .setAccentColor(Colors.Blurple);

                            const msg = await ticket.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

                            await interaction.reply({ content: msg.url, flags: MessageFlags.Ephemeral });
                        }
                    } else {
                        await interaction.reply({ content: `You don't have permissions to remove users/roles to this ticket.`, flags: MessageFlags.Ephemeral });
                    }
                } else {
                    await interaction.reply({ content: `No open ticket with the ID \`${options.ticketId}\` found.`, flags: MessageFlags.Ephemeral });
                }
            } else if (subcommand === "close") {
                const options = {
                    // @ts-ignore
                    ticketId: interaction.options.getString("ticket-id", false) ?? interaction.channel?.name.split("-")[1],
                };

                const ticket = await getTicket(options.ticketId);

                if (ticket !== null) {
                    const auth = await hasPermissions(ticket, interaction.user.id);

                    if (auth) {
                        const newOverwrites = ticket.permissionOverwrites.cache.map((p) => {
                            if (p.id !== interaction.client.user.id && p.id !== process.env.MOD_ROLE_ID! && p.id !== interaction.guild!.roles.everyone.id) {
                                return {
                                    id: p.id,
                                    deny: [PermissionsBitField.Flags.SendMessages],
                                    allow: [PermissionsBitField.Flags.ViewChannel]
                                };
                            } else {
                                return p;
                            }
                        });
                        await ticket.permissionOverwrites.set(newOverwrites);

                        const container = new ContainerBuilder()
                            .addTextDisplayComponents(td =>
                                td.setContent(`## Ticket Closed\nThank you for reaching out.\n\nIf you need help from the staff team in the future, please don't hesitate to open another ticket.`)
                            )
                            .setAccentColor(Colors.Blurple);

                        const msg = await ticket.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

                        await logTicketClosed(interaction.client, options.ticketId, ticket.id, interaction.user.id);

                        await ticket.edit({
                            name: `closed-${options.ticketId}`,
                            topic: new Date().toISOString(),
                        });

                        await interaction.reply({ content: msg.url, flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.reply({ content: `You don't have permissions to close this ticket.`, flags: MessageFlags.Ephemeral });
                    }
                } else {
                    await interaction.reply({ content: `No open ticket with the ID \`${options.ticketId}\` found.`, flags: MessageFlags.Ephemeral });
                }
            } else {
                const hdwg = howDidWeGetHere("Please provide a valid subcommand.");
                await interaction.reply({ components: hdwg, flags: MessageFlags.IsComponentsV2 });
                return;
            }
        }
    },
];

export const contextMenus: ContextMenuData[] = [
    {
        data: new ContextMenuCommandBuilder()
            .setName("Create Ticket from Message")
            .setType(ApplicationCommandType.Message)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            if (interaction.isMessageContextMenuCommand()) {
                const ticket = await newTicket(interaction.client, interaction.user.id, "context", interaction.targetMessage);

                if (ticket) {
                    const resp = new ContainerBuilder()
                        .addTextDisplayComponents(td =>
                            td.setContent(`## Created Ticket \`${ticket.ticketId}\`\nVisit the created channel in ${interaction.guild!.name}, you should've been pinged there. Here's a handy link to the channel: <#${ticket.channelId}>`)
                        )
                        .setAccentColor(Colors.Green);
                    await interaction.reply({ components: [resp], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: "An error ocurred, please try again later.", flags: MessageFlags.Ephemeral });
                }
            }
        },
    }
];

export async function setup(client: Client<true>) {
    client.on(Events.MessageCreate, async (message) => {
        if (message.channel.type === ChannelType.DM && message.author.id !== client.user!.id) {
            const guild = client.guilds.cache.get(process.env.SERVER_ID!) ?? await client.guilds.fetch(process.env.SERVER_ID!);
            const conf = new ContainerBuilder()
                .addTextDisplayComponents(td =>
                    td.setContent(`## Create a ticket?\nPlease confirm that you wish to create a ticket in ${guild.name}. Your message will be forwarded to the ticket.`)
                )
                .addActionRowComponents(ar =>
                    ar.addComponents(
                        new ButtonBuilder()
                            .setCustomId("confirm")
                            .setStyle(ButtonStyle.Success)
                            .setLabel("Yes, create a ticket"),
                        new ButtonBuilder()
                            .setCustomId("cancel")
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("No, do not create a ticket")
                    )
                )
                .setAccentColor(Colors.Blurple);

            const confDisabled = new ContainerBuilder()
                .addTextDisplayComponents(td =>
                    td.setContent(`## Create a ticket?\nPlease confirm that you wish to create a ticket in ${guild.name}. Your message will be forwarded to the ticket.`)
                )
                .addActionRowComponents(ar =>
                    ar.addComponents(
                        new ButtonBuilder()
                            .setCustomId("confirm")
                            .setStyle(ButtonStyle.Success)
                            .setLabel("Yes, create a ticket")
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId("cancel")
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("No, do not create a ticket")
                            .setDisabled(true)
                    )
                )
                .setAccentColor(Colors.Blurple);

            const collectorFilter = (i: ButtonInteraction) => {
                i.deferUpdate();
                return i.user.id === message.author.id;
            };

            const r = await message.channel.send({ components: [conf], flags: MessageFlags.IsComponentsV2 });

            r.awaitMessageComponent({ filter: collectorFilter, componentType: ComponentType.Button, time: 60_000 })
                .then(async (interaction: ButtonInteraction) => {
                    if (interaction.customId === "confirm") {
                        const ticket = await newTicket(client, message.author.id, "dm", message);

                        if (ticket) {
                            const resp = new ContainerBuilder()
                                .addTextDisplayComponents(td =>
                                    td.setContent(`## Created Ticket \`${ticket.ticketId}\`\nVisit the created channel in ${guild.name}, you should've been pinged there. Here's a handy link to the channel: https://discord.com/channels/${guild.id}/${ticket.channelId}`)
                                )
                                .setAccentColor(Colors.Green);
                            await r.edit({ components: [confDisabled] });

                            await interaction.followUp({ components: [resp], flags: MessageFlags.IsComponentsV2 });
                        } else {
                            await interaction.followUp({ content: "An error ocurred, please try again later." });
                        }
                    } else {
                        await r.edit({ components: [confDisabled] });

                        const resp = new ContainerBuilder()
                            .addTextDisplayComponents(td =>
                                td.setContent("Okay, I haven't created a ticket. Feel free to send me another DM if you need further help.")
                            )
                            .setAccentColor(Colors.Blue);

                        await interaction.followUp({ components: [resp], flags: MessageFlags.IsComponentsV2 });
                    }
                })
                .catch(async (err) => {
                    await r.edit({ components: [confDisabled] });
                });
        }
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        if (member.guild.id === process.env.SERVER_ID!) {
            await member.roles.add(process.env.UNVERIFIED_ROLE_ID!);

            Canvas.GlobalFonts.registerFromPath(join(import.meta.dir, "..", "fonts", "inter", "Inter-Regular.ttf"), "Inter Regular");
            Canvas.GlobalFonts.registerFromPath(join(import.meta.dir, "..", "fonts", "inter", "Inter-Bold.ttf"), "Inter Bold");
            const canvas = Canvas.createCanvas(1598, 258);
            const context = canvas.getContext('2d');

            const { body } = await request(member.user.displayAvatarURL({ extension: 'jpg' }));
            const avatar = await Canvas.loadImage(await body.arrayBuffer());

            context.strokeRect(0, 0, canvas.width, canvas.height);

            context.fillStyle = "#ff99b7";
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.save();
            context.beginPath();
            context.arc(125, 125, 100, 0, Math.PI * 2, true);
            context.closePath();
            context.clip();

            context.drawImage(avatar, 25, 25, 208, 208);

            context.restore();

            const applyFont = (c: Canvas.Canvas, text: string, font: string, baseSize: number) => {
                const context = c.getContext('2d');
                do {
                    context.font = `${(baseSize -= 10)}px ${font}`;
                } while (context.measureText(text).width > c.width - 300);
                return context.font;
            };

            context.font = applyFont(canvas, member.displayName, "Inter Regular", 40);
            context.fillStyle = '#000000';
            context.fillText('Welcome,', 258, canvas.height / 2.75);

            context.font = applyFont(canvas, `${member.displayName}!`, "Inter Bold", 70);
            context.fillText(`${member.displayName}!`, 258, canvas.height / 1.5);

            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'welcome.png' });

            const container = new ContainerBuilder()
                .addMediaGalleryComponents(mg =>
                    mg.addItems(
                        new MediaGalleryItemBuilder()
                            .setURL("attachment://welcome.png")
                    )
                )
                .addTextDisplayComponents(td =>
                    td.setContent(`## Welcome, <@${member.user.id}>!\nPlease take a look over <#${process.env.RULES_CHANNEL_ID!}> to learn how to be able to send messages.`)
                )
                .setAccentColor(0xFF99B7);

            const guild = client.guilds.cache.get(process.env.SERVER_ID!) ?? await client.guilds.fetch(process.env.SERVER_ID!)
            const channel = guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID!) ?? await client.channels.fetch(process.env.WELCOME_CHANNEL_ID!);

            if (channel && channel.isSendable()) {
                await channel.send({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
            }
        }
    });

    setInterval(async () => {
        const guild = client.guilds.cache.get(process.env.SERVER_ID!) ?? await client.guilds.fetch(process.env.SERVER_ID!);

        guild.members.cache.filter((m) => !m.roles.cache.has(process.env.MEMBER_ROLE_ID!) && !m.roles.cache.has(process.env.UNVERIFIED_ROLE_ID!) && !m.user.bot).forEach((m) => m.roles.add(process.env.UNVERIFIED_ROLE_ID!));
    }, 15 * 60 * 1000);

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton() && interaction.customId === "verify" && interaction.guild && interaction.guild.id === process.env.SERVER_ID!) {
            if (interaction.member!.roles instanceof GuildMemberRoleManager) {
                const hasUnverifiedRole = interaction.member!.roles.cache.has(process.env.UNVERIFIED_ROLE_ID!);
                const hasMemberRole = interaction.member!.roles.cache.has(process.env.MEMBER_ROLE_ID!);

                if (hasUnverifiedRole && !hasMemberRole) {
                    await interaction.member!.roles.remove(process.env.UNVERIFIED_ROLE_ID!);
                    await interaction.member!.roles.add(process.env.MEMBER_ROLE_ID!);
                    await interaction.reply({ content: `I've added the <@&${process.env.MEMBER_ROLE_ID!}> role to and removed the <@&${process.env.UNVERIFIED_ROLE_ID!}> role from your profile. Welcome to the server!`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [], roles: [] } });
                } else if (!hasUnverifiedRole && !hasMemberRole) {
                    await interaction.member!.roles.add(process.env.MEMBER_ROLE_ID!);
                    await interaction.reply({ content: `I've added the <@&${process.env.MEMBER_ROLE_ID!}> role to your profile. Welcome to the server!`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [], roles: [] } });
                } else if (!hasUnverifiedRole && hasMemberRole) {
                    await interaction.reply({ content: "You've already verified, so nothing has changed.", flags: MessageFlags.Ephemeral });
                } else if (hasUnverifiedRole && hasMemberRole) {
                    await interaction.member!.roles.remove(process.env.UNVERIFIED_ROLE_ID!);
                    await interaction.reply({ content: `I've removed the <@&${process.env.UNVERIFIED_ROLE_ID!}> role from your profile.`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [], roles: [] } });
                }
            }
        } else {
            return;
        }
    });
}