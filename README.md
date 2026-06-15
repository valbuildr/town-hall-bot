# town-hall-bot

[![GitHub Sponsors](https://img.shields.io/github/sponsors/valbuildr?style=flat-square&logo=githubsponsors&logoColor=ffffff&color=ea4aaa)](https://github.com/sponsors/valbuildr)
![GitHub last commit](https://img.shields.io/github/last-commit/valbuildr/town-hall-bot?style=flat-square)
![GitHub top language](https://img.shields.io/github/languages/top/valbuildr/town-hall-bot?style=flat-square)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues-raw/valbuildr/town-hall-bot?style=flat-square)](https://github.com/valbuildr/town-hall-bot/issues)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues-pr-raw/valbuildr/town-hall-bot?style=flat-square)](https://github.com/valbuildr/town-hall-bot/pulls)
[![GitHub License](https://img.shields.io/github/license/valbuildr/town-hall-bot?style=flat-square)](./LICENSE)
![GitHub package.json dynamic](https://img.shields.io/github/package-json/version/valbuildr/town-hall-bot?style=flat-square)

A bot for managing my Discord server.

## Self-hosting

Even though the bot is designed for my use case, you can use it in any way you seem fit. Here's how to set it up yourself.

First, ensure you have the following:
- [Bun](https://bun.com)[^1] (I develop with v1.3.10, but versions around it should work fine.)
- [Git](https://git-scm.com/)[^2]
- A small amount of command line and file editing knowledge

[^1]: Unsure if you have Bun installed? Run `bun -v` in a terminal to check.
[^2]: Unsure if you have Git installed? Run `git -v` in a terminal to check.

Next, clone the repository to your local machine and open the folder. For those who forked the respository, ensure you're copying your fork by replacing `valbuildr` with your Github username and `town-hall-bot` with whatever you called your fork.
```bash
git clone https://github.com/valbuildr/town-hall-bot.git
cd town-hall-bot
```

> [!TIP]
> If you want to clone the repository to a different folder name, simply add it to the end of the `git clone` command.
>
> For example, if you want to clone it to the `banana` folder:
> ```bash
> git clone https://github.com/valbuildr/town-hall-bot.git banana
> cd banana
> ```

Now, install the required dependencies:
```bash
bun install
```

Copy `example.env` and name it simply `.env`, then fill out the values.

Sync slash commands.
```bash
bun run sync
# OR
bun src/sync.ts
```

Lastly, start the bot.
```bash
bun run main
# OR
bun src/index.ts
```

> [!TIP]
> If you want the bot to keep running after you close your terminal and start when your machine starts, ensure you have `pm2` installed and use `pm2.config.js`.
>
> ```bash
> pm2 -v # check for pm2
> 
> bun install --global pm2 # if you dont have pm2; requires shell restart
> 
> pm2 start pm2.config.js
>
> pm2 save # if you want the bot to start with your machine
> ```

## License

The source code contained in this repository is licensed under the GNU GPL v3 license. Visit [LICENSE](./LICENSE) for details.

## AI Disclosure

Claude gets used from time to time to help understand and fix errors.

## Hack Club

This project is a part of Hack Club's [Stardance challenge](https://stardance.hackclub.com/).
