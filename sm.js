const Discord = require('discord.js');
const fs = require('fs');

const client = new Discord.Client();

var raw_config = fs.readFileSync('config.json');
var config = JSON.parse(raw_config);

const allowed_emojis = [
  config["emojis"]["yes"], // YES
  config["emojis"]["abstain"], // ABSTAIN
  config["emojis"]["no"], // NO
  config["emojis"]["admin_no"], // ADMIN OVERRIDE NO
  config["emojis"]["admin_yes"] // ADMIN OVERRIDE YES
];

const admin_emojis = [
  config["emojis"]["admin_no"], // ADMIN OVERRIDE NO
  config["emojis"]["admin_yes"] // ADMIN OVERRIDE YES
];

client.on('ready', () => {
  console.log('I am ready!');
  client.user.setPresence({ activity: { name: 'https://l.oolivero45.net/sm' }, status: 'online' });
});

client.on('message', message => {
  if (message.channel.id === config["channel"]) {
    if (message.content.includes("[VOTE]")) {
      message.channel.send("<@&" + config["role"] + "> A new vote is available for you to participate in!");
      message.react(config["emojis"]["yes"]);
      message.react(config["emojis"]["abstain"]);
      message.react(config["emojis"]["no"]);
    }
  }
});

client.on('messageReactionAdd', (reaction, user) => {
  if (user.bot === false && reaction.message.channel.id === config["channel"]) {
    if (allowed_emojis.includes(reaction.emoji.name)) {
      var emoji = reaction.emoji.name;
      var reactionCount = reaction.count - 1;
      var message = reaction.message;
      if (admin_emojis.includes(emoji) && !message.member.hasPermission("ADMINISTRATOR")) {
        // no permission to admin override
        return false;
      }
      var abstainedreaction = message.reactions.cache.get(config["emojis"]["abstain"]);
      var abstained = 0;
      if (abstainedreaction !== undefined) {
        abstained = abstainedreaction.count - 1;
      }
      var eligibleVoters = reaction.message.channel.members.filter(member => !member.user.bot).size;
      var includedVoters = eligibleVoters - abstained;
      var countNeeded = Math.floor(includedVoters / 2) + 1;
      console.log(eligibleVoters + " eligible voters");
      console.log(abstained + " abstained");
      console.log(includedVoters + " included voters");
      console.log(countNeeded + " reactions needed for a majority");
      var ao = false;
      if (admin_emojis.includes(emoji) && message.member.hasPermission("ADMINISTRATOR")) {
        // sufficient permission to admin override
        console.log("ADMIN OVERRIDE");
        var aoresult = "Something has happened which defies the rules of logic. No, seriously. This line of code should never run. I'd advise you to run as fast as you can, because it appears that the universe is about to collapse.";
        if (emoji === config["emojis"]["admin_no"]) {
          aoresult = "fail.";
        } else if (emoji === config["emojis"]["admin_yes"]) {
          aoresult = "pass.";
        }
        message.channel.send("**⚠️ An administrator has overridden the results of this vote and forced it to " + aoresult + "**");
        ao = true;
      }
      if (reactionCount >= countNeeded || ao === true) {
        if (emoji === config["emojis"]["yes"] || emoji === config["emojis"]["admin_yes"]) {
          console.log("VOTE PASSED");
          message.channel.send("<@!" + message.author.id + "> Hi there! Great news - your recent vote has passed due to being approved by a majority of the server's members. Any actions related to your vote, such as updating the server's name or icon, will be performed shortly.");
          if (message.content.includes("[VOTE] [SERVER NAME]")) {
            var name = message.content.replace("[VOTE] [SERVER NAME] ", "").replace("[VOTE] [SERVER NAME]", "");
            message.guild.setName(name, "Majority vote passed");
          } else if (message.content.includes("[VOTE] [SERVER ICON]")) {
            if (message.attachments.size === 0) {
              message.channel.send("Failed to set server icon - vote message did not include an image.");
              message.delete();
            } else {
              var attachment = message.attachments.first().url;
              message.guild.setIcon(attachment, "Majority vote passed");
            }
          } else if (message.content.includes("[VOTE] [INVITE]")) {
            var content = message.content.replace("[VOTE] [INVITE] ", "").replace("[VOTE] [INVITE]", "");
            message.channel.createInvite({maxAge: 86400, maxUses: 1, reason: "Majority vote passed", unique: true}).then(invite => {
              message.channel.send("Beware: This is a single-use invite link. It will expire in 24 hours, or after being used by 1 user.\nPlease only use it to invite the person you specified in the vote, so that it's fair for everybody.\n\n" + invite.url + "\n\nInvite reason: ```" + content + "```");
            });
          } else if (message.content.includes("[VOTE] [OTHER]")) {
            var content = message.content.replace("[VOTE] [OTHER] ", "").replace("[VOTE] [OTHER]", "");
            message.channel.send("The subject of the vote was:\n```" + content + "```");
          }
          message.delete();
        } else if (emoji === config["emojis"]["no"] || emoji === config["emojis"]["admin_no"]) {
          console.log("VOTE FAILED");
          message.channel.send("<@!" + message.author.id + "> Hi there! Unfortunately, your recent vote has failed due to being rejected by a majority of the server's members. Sorry about that.");
          message.delete();
        }
      }
    }
  }
});

client.login(config["token"]);
