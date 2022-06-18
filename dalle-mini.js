const fetch = require('node-fetch');
const Discord = require("discord.js");
const fs = require("fs");
const client = new Discord.Client({
    partials: ['MESSAGE', 'CHANNEL', 'GUILD_MEMBER', 'USER'],
    intents: ["GUILDS", "GUILD_MESSAGES"]
});

function dalle(prompt, isSecondReq = false) {
    return new Promise((resolve, reject) => {
        fetch("https://bf.dallemini.ai/generate", {
            "credentials": "omit",
            "headers": {
                "User-Agent": "DallE-Mini Discord Bot",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/json"
            },
            "referrer": "https://hf.space/",
            "body": "{\"prompt\":\"" + prompt + "\"}",
            "method": "POST",
            "mode": "cors"
        }).then(r => r.text()).then(r => {
            var out = {
                images: [],
                prompt: prompt,
                image: true
            };
            try {
                r = JSON.parse(r);
                out.images = r.images;
                resolve(out);
            } catch (e) {
                if (isSecondReq) {
                    out.prompt = r.replace(/<[/A-z0-9 =!]+>/g, "");
                    out.image = false;
                    resolve(out);
                } else {
                    setTimeout(() => {
                        dalle(prompt, true).then(data => {
                            resolve(data);
                        });
                    }, 3000);
                }
            }
        });
    });
}

client.on("messageCreate", (msg) => {
    if (msg.content.startsWith("d.generate")) {
        if (!msg.content.split(" ").slice(1).join(" ")) {
            msg.channel.send("Syntax: `d.generate [prompt]`\nFor example: `d.generate three ducks in a pool`");
        } else {
            msg.channel.send("Generating your image.\nThis could take around two minutes to complete.").then(() => {
                msg.channel.sendTyping();
            });
            console.log("Generating image with prompt \"" + msg.content.split(" ").slice(1).join(" ") + "\"");
            var i = setInterval(() => {
                msg.channel.sendTyping();
            }, 3000);
            var startTime = Date.now();
            dalle(msg.content.split(" ").slice(1).join(" "), false).then((data) => {
                if (!data.image) {
                    msg.channel.send("Too much traffic, try again later.");
                } else {
                    const sfbuff = new Buffer.from(data.images[0], "base64");
                    const sfattach = new Discord.MessageAttachment(sfbuff, "dalle-output.png");
                    msg.channel.send({ files: [sfattach], content: "\"" + data.prompt + "\"\nTook " + ((Date.now() - startTime) / 1000) + " seconds." });
                }
                clearInterval(i);
            });
        }
    }
    if (msg.content.startsWith("d.help")) {
        msg.channel.send(`Dall-E Mini Bot Help
--
Commands:
d.generate - Generates an image.
d.help - Shows this list.`);
    }
});

client.on("ready", () => {
    console.log("Logged in");
});

client.login(fs.readFileSync("./dalle-token.txt", "utf8"));
