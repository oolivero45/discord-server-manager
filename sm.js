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

var my_id = null;
var last_message_id = null;

const required_multiplier = config["required_multiplier"];
const required_modifier = config["required_modifier"];

var raw_saved_votes = fs.readFileSync('votes.json');
var saved_votes = JSON.parse(raw_saved_votes);
var saved_vote_ids = Object.keys(saved_votes);

var raw_saved_messages = fs.readFileSync('messages.json');
var saved_messages = JSON.parse(raw_saved_messages);

var slash_commands = {};
var commandHandlers = {};

var addCommandHandler = function(path, func) {
  // Command handlers should expect the parameters (options, interaction_data)
  // Command handlers can use commandRespond(interaction id, interaction token, response, show) to respond.
  commandHandlers[path] = func;
};

var commandRespondEphemeral = function(id, token, response) {
  if (typeof(response) === "string") {
    response = {"content": response};
  }
  response["flags"] = 1 << 6;
  client.api.interactions(id, token).callback.post({data: {type: 3, data: response}});
}

var commandRespond = function(id, token, response, show, ephemeral = false) {
  var type = 3
  if (show === true) {
    type = 4;
  }
  if (typeof(response) === "string") {
    response = {"content": response};
  }
  client.api.interactions(id, token).callback.post({data: {type: type, data: response}});
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

client.ws.on('INTERACTION_CREATE', async interaction => {
  var command_id = interaction["id"];
  var command_name = interaction["data"]["name"]
  var command_path = "/" + command_name;
  var option_type = 0;
  var command_data_step = [];
  var command_parameters = {};
  var command_parameters_search = interaction["data"]["options"];
  if (command_parameters_search === undefined) {
    command_parameters_search = [];
  };
  var interaction_data = {
    "guild": interaction["guild_id"],
    "channel": interaction["channel_id"],
    "user": interaction["member"]["user"]["id"],
    "id": interaction["id"],
    "token": interaction["token"],
    "roles": interaction["member"]["roles"],
  };
  if (interaction["type"] === 2) {
    if ("options" in interaction["data"]) {
      command_data_step = interaction["data"]["options"][0];
      option_type = command_data_step["type"];
      while (option_type <= 2) {
        command_path += "/" + command_data_step["name"];
        if (option_type === 1) {
          command_parameters_search = command_data_step["options"];
          if (command_parameters_search === undefined) {
            command_parameters_search = [];
          }
          break;
        } else {
          command_data_step = command_data_step["options"][0];
          option_type = command_data_step["type"];
        }
      }
    }
    for (var i = 0; i < command_parameters_search.length; i++) {
      var parameter = command_parameters_search[i];
      command_parameters[parameter["name"]] = parameter["value"];
    }
    if (command_path in commandHandlers) {
      commandHandlers[command_path](command_parameters, interaction_data);
    }
  };
});

client.on('ready', () => {
  console.log('I am ready!');
  my_id = client.user.id;
  client.user.setPresence({ activity: { name: 'V2.1.0 | https://l.oolivero45.net/sm' }, status: 'online' });
  client.channels.fetch(config["channel"]).then(channel => {
    for (var i = 0; i < saved_vote_ids.length; i++) {
      var vote_id = saved_vote_ids[i];
      var vote = saved_votes[vote_id];
      channel.messages.fetch(vote["message_id"]);
      console.log("Loaded saved vote " + vote_id);
    }
  });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  omRoles = Array.from(oldMember.roles.cache.keys());
  nmRoles = Array.from(newMember.roles.cache.keys());
  if (!omRoles.includes(config["role"]) && nmRoles.includes(config["role"])) {
    newMember.send("**Hi there!**\n\nYou've successfully registered to vote.\nTo cancel your registration, just remove the voter role from yourself.");
    console.log(newMember.displayName + " registered to vote.");
  } else if (omRoles.includes(config["role"]) && !nmRoles.includes(config["role"])) {
    newMember.send("**Hi there!**\n\nYou've successfully cancelled your registration to vote.\nTo renew your registration, just add the voter role to yourself.");
    console.log(newMember.displayName + " unregistered to vote.");
  }
});

var calculateVotes = function(id) {
  return new Promise(function(resolve, reject) {
    if (!(id in saved_votes)) {
      resolve(false);
    } else {
      var vote = saved_votes[id];
      client.channels.fetch(config["channel"]).then(channel => {
        channel.messages.fetch(vote["message_id"]).then(message => {
          var reactions_yes = message.reactions.resolve(config["emojis"]["yes"]);
          var reactions_abstain = message.reactions.resolve(config["emojis"]["abstain"]);
          var reactions_no = message.reactions.resolve(config["emojis"]["no"]);
          
          reactions_yes.users.fetch().then(voted_yes => {
            reactions_abstain.users.fetch().then(voted_abstain => {
              reactions_no.users.fetch().then(voted_no => {
                voted_yes = Array.from(voted_yes.filter(user => !user.bot).keys());
                voted_abstain = Array.from(voted_abstain.filter(user => !user.bot).keys());
                voted_no = Array.from(voted_no.filter(user => !user.bot).keys());
                
                var single_check_ids = {};
                for (var i = 0; i < voted_yes.length; i++) {
                  if (voted_yes[i] in single_check_ids) {
                    single_check_ids[voted_yes[i]] += 1;
                  } else {
                    single_check_ids[voted_yes[i]] = 1;
                  }
                }
                for (var i = 0; i < voted_abstain.length; i++) {
                  if (voted_abstain[i] in single_check_ids) {
                    single_check_ids[voted_abstain[i]] += 1;
                  } else {
                    single_check_ids[voted_abstain[i]] = 1;
                  }
                }
                for (var i = 0; i < voted_no.length; i++) {
                  if (voted_no[i] in single_check_ids) {
                    single_check_ids[voted_no[i]] += 1;
                  } else {
                    single_check_ids[voted_no[i]] = 1;
                  }
                }
                
                var sci_keys = Object.keys(single_check_ids);
                var yes_discount = 0;
                var abstain_discount = 0;
                var no_discount = 0;
                var invalid_voters = 0;
                
                for (var i = 0; i < sci_keys.length; i++) {
                  var check_id = sci_keys[i];
                  var check_count = single_check_ids[check_id];
                  if (check_count > 1) {
                    if (voted_yes.includes(check_id)) {
                      yes_discount += 1;
                    }
                    if (voted_abstain.includes(check_id)) {
                      abstain_discount += 1;
                    }
                    if (voted_no.includes(check_id)) {
                      no_discount += 1;
                    }
                    invalid_voters += 1;
                  }
                }
                
                var votes_yes = (reactions_yes.count - 1) - yes_discount;
                var votes_abstain = (reactions_abstain.count - 1) - abstain_discount;
                var votes_no = (reactions_no.count - 1) - no_discount;
          
                var vote_ao_yes = false;
                var vote_ao_no = false;
                if (message.reactions.resolve(config["emojis"]["admin_yes"]) !== undefined && message.reactions.resolve(config["emojis"]["admin_yes"]) !== null) {
                  vote_ao_yes = true;
                }
                if (message.reactions.resolve(config["emojis"]["admin_no"]) !== undefined && message.reactions.resolve(config["emojis"]["admin_no"]) !== null) {
                  vote_ao_no = true;
                }
                var vote_status = "Unknown";
                
                var nonBotList = Array.from(message.channel.members.filter(member => !member.user.bot).keys());
                var voterRoleList = Array.from(message.guild.roles.cache.get(config["role"]).members.keys());
                var eligibleVoterList = [];
                for (var i = 0; i < nonBotList.length; i++) {
                  if (voterRoleList.includes(nonBotList[i])) {
                    eligibleVoterList.push(nonBotList[i]);
                  }
                }
                var eligibleVoters = (eligibleVoterList.length - votes_abstain) - invalid_voters;
                var countNeeded = Math.floor(eligibleVoters * required_multiplier) + required_modifier;
                
                var greentick = message.guild.emojis.resolve("819589583871803422").toString();
                var redcross = message.guild.emojis.resolve("819589605170217072").toString();
                
                if (vote_ao_yes) {
                  vote_status = greentick + " Passed due to administrator override";
                  vote_raw_status = "passed";
                } else if (vote_ao_no) {
                  vote_status = redcross + " Failed due to administrator override";
                  vote_raw_status = "failed";
                } else if (votes_yes >= countNeeded) {
                  vote_status = greentick + " Passed";
                  vote_raw_status = "passed";
                } else if (votes_no >= countNeeded) {
                  vote_status = redcross + " Failed";
                  vote_raw_status = "failed";
                } else {
                  vote_status = "⌛ In progress";
                  vote_raw_status = "in_progress";
                }
                
                var still_needed_yes = countNeeded - votes_yes;
                var still_needed_no = countNeeded - votes_no;
                var result = {
                  "status": vote_status,
                  "raw_status": vote_raw_status,
                  "total_needed": countNeeded,
                  "votes": {
                    "yes": votes_yes,
                    "abstain": votes_abstain,
                    "no": votes_no,
                  },
                  "still_needed": {
                    "yes": still_needed_yes,
                    "no": still_needed_no,
                  },
                }
                resolve(result);
              });
            });
          });
        });
      });
    };
  });
};

addCommandHandler("/vote/start/name", function(parameters, data) {
  var vid = makeid(5);
  client.channels.fetch(config["channel"]).then(channel => {
    channel.send("Starting a new vote. Please wait...").then(message => {
      var vote = {
        "id": vid,
        "message_id": message.id,
        "user_id": data["user"],
        "type": "name",
        "data": {
          "name": parameters["name"],
        },
      };
      var nonBotList = Array.from(message.channel.members.filter(member => !member.user.bot).keys());
      var voterRoleList = Array.from(message.guild.roles.cache.get(config["role"]).members.keys());
      var eligibleVoterList = [];
      for (var i = 0; i < nonBotList.length; i++) {
        if (voterRoleList.includes(nonBotList[i])) {
          eligibleVoterList.push(nonBotList[i]);
        }
      }
      var eligibleVoters = eligibleVoterList.length;
      var countNeeded = Math.floor(eligibleVoters * required_multiplier) + required_modifier;
      saved_votes[vid] = vote;
      fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
      var vote_message = "`[" + vid + "]`\n<@&" + config["role"] + ">\n\n**<@!" + data["user"] + "> would like to change the server's name.**\n\nProposed new name: " + parameters["name"];
      var ve = new Discord.MessageEmbed();
      ve.setTitle("Vote status");
      ve.setFooter(vid);
      ve.addField("Vote status", "⌛ In progress", false);
      ve.addField("Total number of yes/no votes needed to pass/fail", countNeeded, false);
      var currentString = "👍 Yes: 0\n✋ Abstained: 0\n👎 No: 0";
      ve.addField("Current vote count", currentString, false);
      var neededString = "👍 Yes: " + countNeeded + "\n👎 No: " + countNeeded;
      ve.addField("Number of votes still needed", neededString, false);
      message.edit(vote_message, ve);
      message.react(config["emojis"]["yes"]);
      message.react(config["emojis"]["abstain"]);
      message.react(config["emojis"]["no"]);
      commandRespondEphemeral(data["id"], data["token"], "Your vote has been started.");
    });
  });
});

addCommandHandler("/vote/start/icon", function(parameters, data) {
  var vid = makeid(5);
  client.channels.fetch(config["channel"]).then(channel => {
    channel.send("Starting a new vote. Please wait...").then(message => {
      var vote = {
        "id": vid,
        "message_id": message.id,
        "user_id": data["user"],
        "type": "icon",
        "data": {
          "url": parameters["image_url"],
        },
      };
      var nonBotList = Array.from(message.channel.members.filter(member => !member.user.bot).keys());
      var voterRoleList = Array.from(message.guild.roles.cache.get(config["role"]).members.keys());
      var eligibleVoterList = [];
      for (var i = 0; i < nonBotList.length; i++) {
        if (voterRoleList.includes(nonBotList[i])) {
          eligibleVoterList.push(nonBotList[i]);
        }
      }
      var eligibleVoters = eligibleVoterList.length;
      var countNeeded = Math.floor(eligibleVoters * required_multiplier) + required_modifier;
      saved_votes[vid] = vote;
      fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
      var vote_message = "`[" + vid + "]`\n<@&" + config["role"] + ">\n\n**<@!" + data["user"] + "> would like to change the server's icon.**\n\nProposed new icon: " + parameters["image_url"];
      var ve = new Discord.MessageEmbed();
      ve.setTitle("Vote status");
      ve.setFooter(vid);
      ve.addField("Vote status", "⌛ In progress", false);
      ve.addField("Total number of yes/no votes needed to pass/fail", countNeeded, false);
      var currentString = "👍 Yes: 0\n✋ Abstained: 0\n👎 No: 0";
      ve.addField("Current vote count", currentString, false);
      var neededString = "👍 Yes: " + countNeeded + "\n👎 No: " + countNeeded;
      ve.addField("Number of votes still needed", neededString, false);
      message.edit(vote_message, ve);
      message.react(config["emojis"]["yes"]);
      message.react(config["emojis"]["abstain"]);
      message.react(config["emojis"]["no"]);
      commandRespondEphemeral(data["id"], data["token"], "Your vote has been started.");
    });
  });
});

addCommandHandler("/vote/start/invite", function(parameters, data) {
  var vid = makeid(5);
  client.channels.fetch(config["channel"]).then(channel => {
    channel.send("Starting a new vote. Please wait...").then(message => {
      var vote = {
        "id": vid,
        "message_id": message.id,
        "user_id": data["user"],
        "type": "invite",
        "data": {
          "user": parameters["user"],
          "reason": parameters["reason"],
        },
      };
      var nonBotList = Array.from(message.channel.members.filter(member => !member.user.bot).keys());
      var voterRoleList = Array.from(message.guild.roles.cache.get(config["role"]).members.keys());
      var eligibleVoterList = [];
      for (var i = 0; i < nonBotList.length; i++) {
        if (voterRoleList.includes(nonBotList[i])) {
          eligibleVoterList.push(nonBotList[i]);
        }
      }
      var eligibleVoters = eligibleVoterList.length;
      var countNeeded = Math.floor(eligibleVoters * required_multiplier) + required_modifier;
      saved_votes[vid] = vote;
      fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
      var vote_message = "`[" + vid + "]`\n<@&" + config["role"] + ">\n\n**<@!" + data["user"] + "> would like to invite somebody to the server.**\n\nNew user: " + parameters["user"] + "\nReason:\n> " + parameters["reason"];
      var ve = new Discord.MessageEmbed();
      ve.setTitle("Vote status");
      ve.setFooter(vid);
      ve.addField("Vote status", "⌛ In progress", false);
      ve.addField("Total number of yes/no votes needed to pass/fail", countNeeded, false);
      var currentString = "👍 Yes: 0\n✋ Abstained: 0\n👎 No: 0";
      ve.addField("Current vote count", currentString, false);
      var neededString = "👍 Yes: " + countNeeded + "\n👎 No: " + countNeeded;
      ve.addField("Number of votes still needed", neededString, false);
      message.edit(vote_message, ve);
      message.react(config["emojis"]["yes"]);
      message.react(config["emojis"]["abstain"]);
      message.react(config["emojis"]["no"]);
      commandRespondEphemeral(data["id"], data["token"], "Your vote has been started.");
    });
  });
});

addCommandHandler("/vote/start/other", function(parameters, data) {
  var vid = makeid(5);
  client.channels.fetch(config["channel"]).then(channel => {
    channel.send("Starting a new vote. Please wait...").then(message => {
      var vote = {
        "id": vid,
        "message_id": message.id,
        "user_id": data["user"],
        "type": "other",
        "data": {
          "reason": parameters["reason"],
        },
      };
      var nonBotList = Array.from(message.channel.members.filter(member => !member.user.bot).keys());
      var voterRoleList = Array.from(message.guild.roles.cache.get(config["role"]).members.keys());
      var eligibleVoterList = [];
      for (var i = 0; i < nonBotList.length; i++) {
        if (voterRoleList.includes(nonBotList[i])) {
          eligibleVoterList.push(nonBotList[i]);
        }
      }
      var eligibleVoters = eligibleVoterList.length;
      var countNeeded = Math.floor(eligibleVoters * required_multiplier) + required_modifier;
      saved_votes[vid] = vote;
      fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
      var vote_message = "`[" + vid + "]`\n<@&" + config["role"] + ">\n\n**<@!" + data["user"] + "> would like to hold a vote.**\n\nVote subject: " + parameters["reason"];
      var ve = new Discord.MessageEmbed();
      ve.setTitle("Vote status");
      ve.setFooter(vid);
      ve.addField("Vote status", "⌛ In progress", false);
      ve.addField("Total number of yes/no votes needed to pass/fail", countNeeded, false);
      var currentString = "👍 Yes: 0\n✋ Abstained: 0\n👎 No: 0";
      ve.addField("Current vote count", currentString, false);
      var neededString = "👍 Yes: " + countNeeded + "\n👎 No: " + countNeeded;
      ve.addField("Number of votes still needed", neededString, false);
      message.edit(vote_message, ve);
      message.react(config["emojis"]["yes"]);
      message.react(config["emojis"]["abstain"]);
      message.react(config["emojis"]["no"]);
      commandRespondEphemeral(data["id"], data["token"], "Your vote has been started.");
    });
  });
});

addCommandHandler("/vote/end", function(parameters, data) {
  var vote = saved_votes[parameters["id"]];
  client.channels.fetch(config["channel"]).then(channel => {
    channel.messages.fetch(vote["message_id"]).then(message => {
      var start_user = message.mentions.users.first();
      if (data["user"] === start_user.id) {
        message.reactions.removeAll();
        var ve = new Discord.MessageEmbed();
        ve.setTitle("Vote status");
        ve.setFooter(vote["id"]);
        ve.setDescription("This vote has been cancelled.");
        message.edit(message.content, ve);
        delete saved_votes[vote["id"]];
        fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
        commandRespondEphemeral(data["id"], data["token"], "Your vote has been ended.");
      } else {
        commandRespondEphemeral(data["id"], data["token"], "You can only end votes that *you* started.");
      }
    });
  });
});

addCommandHandler("/vote/status", async function(parameters, data) {
  var calculated = await calculateVotes(parameters["id"])
  var response = "Vote status: " + calculated["status"] + "\nTotal votes needed: " + calculated["total_needed"] + "\nVotes:\n- Yes: " + calculated["votes"]["yes"] + "\n- Abstain: " + calculated["votes"]["abstain"] + "\n- No: " + calculated["votes"]["no"] + "\n\"Yes\" votes still needed to pass: " + calculated["still_needed"]["yes"] + "\n\"No\" votes still needed to fail: " + calculated["still_needed"]["no"];
  commandRespondEphemeral(data["id"], data["token"], response);
});

var passed_name = function(message, name) {
  message.guild.setName(name, "Majority vote passed");
};

var passed_icon = function(message, url) {
  message.guild.setIcon(url, "Majority vote passed");
};

var passed_invite = function(message) {
  message.channel.createInvite({maxAge: 86400, maxUses: 1, reason: "Majority vote passed", unique: true}).then(invite => {
    message.channel.send("Beware: This is a single-use invite link. It will expire in 24 hours, or after being used by 1 user.\nPlease only use it to invite the person you specified in the vote, so that it's fair for everybody.\n\n" + invite.url);
  });
};

async function handleReaction(reaction, user) {
  var user_roles = Array.from(reaction.message.guild.members.cache.get(user.id).roles.cache.keys());
  if (!user_roles.includes(config["role"]) && user.id !== my_id && reaction.message.channel.id === config["channel"]) {
    console.log("Unregistered voter attempted to vote");
    user.send("**Hi there!**\n\nI notice that you just attempted to take part in a vote. Unfortunately, you aren't registered to vote, so your vote **was not counted**.\nTo register to vote, just add the voter role to yourself.");
    console.log("Removing " + user.id);
    reaction.users.remove(user.id);
  } else {
    if (user.bot === false && reaction.message.channel.id === config["channel"]) {
      if (allowed_emojis.includes(reaction.emoji.name)) {
        var id = reaction.message.content.substring(2, 7);
        if (id in saved_votes) {
          var vote_status = await calculateVotes(id);
          var vote = saved_votes[id];
          reaction.message.channel.messages.fetch(vote["message_id"]).then(message => {
            if (vote_status["raw_status"] === "passed" || vote_status["raw_status"] === "failed") {
              var ve = new Discord.MessageEmbed();
              ve.setTitle("Vote status");
              ve.setFooter(id);
              ve.addField("Vote status", vote_status["status"], false);
              var currentString = "👍 Yes: " + vote_status["votes"]["yes"] + "\n✋ Abstained: " + vote_status["votes"]["abstain"] + "\n👎 No: " + vote_status["votes"]["no"];
              ve.addField("Final vote count", currentString, false);
              message.edit(message.content.replace("would like to", "wanted to"), ve);
              var start_user = message.mentions.users.first();
              var news_type = "Good news! Your vote has **";
              if (vote_status["raw_status"] === "failed") {
                news_type = "Unfortunately, your vote has **";
              }
              message.channel.send("Hey, <@!" + start_user.id + ">!\n" + news_type + vote_status["status"] + "**.\n\n" + message.url);
              delete saved_votes[id];
              fs.writeFileSync("votes.json", JSON.stringify(saved_votes));
              message.reactions.removeAll();
              if (vote_status["raw_status"] === "passed") {
                switch (vote["type"]) {
                  case "name":
                    var new_name = vote["data"]["name"];
                    passed_name(message, new_name);
                    break;
                  
                  case "icon":
                    var new_icon = vote["data"]["url"];
                    passed_icon(message, new_icon);
                    break;
                  
                  case "invite":
                    passed_invite(message);
                    break;
                  
                  default:
                    break;
                };
              }
            } else {
              var ve = new Discord.MessageEmbed();
              ve.setTitle("Vote status");
              ve.setFooter(id);
              ve.addField("Vote status", vote_status["status"], false);
              ve.addField("Total number of yes/no votes needed to pass/fail", vote_status["total_needed"], false);
              var currentString = "👍 Yes: " + vote_status["votes"]["yes"] + "\n✋ Abstained: " + vote_status["votes"]["abstain"] + "\n👎 No: " + vote_status["votes"]["no"];
              ve.addField("Current vote count", currentString, false);
              var neededString = "👍 Yes: " + vote_status["still_needed"]["yes"] + "\n👎 No: " + vote_status["still_needed"]["no"];
              ve.addField("Number of votes still needed", neededString, false);
              message.edit(message.content, ve);
            }
          });
        }
      }
    }
  }
}

client.on('messageReactionAdd', (reaction, user) => handleReaction(reaction, user));
client.on('messageReactionRemove', (reaction, user) => handleReaction(reaction, user));

client.login(config["token"]);
