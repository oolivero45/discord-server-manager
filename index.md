# Discord Server Manager

This is a Discord bot designed to allow you to run servers democratically through votes.

## How voting works
Members can start a vote using a command (more details below). The bot will automatically add reactions to the message allowing members to either approve, abstain, or deny the vote. Once a majority (half plus one) of all non-bot, non-abstaining users have voted to either approve or deny the vote, the bot will automatically perform the action specified in the vote command.

## How to start a vote
There are a few different types of vote that the bot can manage.

#### Change server name
To vote to change the server's name, send a message in the voting channel starting with `[VOTE] [SERVER NAME]`, followed by the suggested new name. For example, to hold a vote to change the server's name to 'A Server', you would send the following message:
```[VOTE] [SERVER NAME] A Server```
Once the vote has passed, the bot will automatically update the server's name.

#### Change server icon
To vote to change the server's icon, send a message in the voting channel starting with `[VOTE] [SERVER ICON]`, with an image of the suggested new icon attached to the message.

Once the vote has passed, the bot will automatically update the server's icon.

The bot sometimes struggles if the image you attach is too large (either in file size or in resolution), so you should try to ensure that you don't attach an excessively large file.

#### Invite a user
To vote to invite a new user to the server, send a message in the voting channel starting with `[VOTE] [INVITE]`, followed by an explanation of who you want to invite and why you want to invite them. For example, if you wanted to invite your friend Bob who plays games with you, you would send the following message:
```[VOTE] [INVITE] Bob, because we want to play games together```
Once the vote has passed, the bot will generate a single-use invite link for you to send to the user.

#### Other/miscellaneous votes
If you just want to vote on a random topic which doesn't require making a change to the server, you can start an 'other' vote. Other votes don't have any actual result or outcome - they just announce the result of the vote and nothing else. This is effectively just a generic poll command. To start an other vote, send a message in the voting channel starting with `[VOTE] [OTHER]`, followed by an explanation of what you're voting on. For example, if you're holding a movie night with your friends and want to ask whether everyone wants to order a pizza, you would send the following message:
```[VOTE] [OTHER] Shall we order a pizza?```

## Installation
This bot requires the [discord.js](https://discord.js.org/) library. You can install it using npm using the following command: `npm install discord.js`

Copy `config.json.example` to `config.json`, and edit it to configure your bot. All config fields are required.

Once you've got discord.js installed and you've configured the bot, just run `sm.js` in the bot's directory to start it.

## Final notes
This bot is still in development, and was originally developed for use in a single server. Because of that, it is not particularly well written - it was mainly just quickly thrown together in an hour or two one evening. If you encounter any bugs, please let me know by opening an issue on the bot's GitHub repository.