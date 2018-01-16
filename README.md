Node Discord EVE Auth Bot Thing..

First you need to create a Discord Application that is also a Bot.
Go to https://discordapp.com/developers/applications/me and make a new app, and then once you've done that make it into a bot as well.

Second you need to create yourself an EVE application for Sign-on, go here https://developers.eveonline.com/applications

Third you need to find the GuildID (Right click the server on discord, copy id, if you can't see it turn on developer mode)
Then you need the role ID, do \\@role (for example \\@yomomma) to get the ID of the role - if you DONT get an id, turn on so anyone can highlight role.

And fourth, you need to create an invite for the channel on the server you want people to come into. And make it non-expirable (sp?)

Last thing to do, is copy config.json.example to config.json, fill out everything and start it with node server.js

# Things you can do to spruce it up
Setup nginx / caddy / apache / ???
Get a domain
Do some proxying
????
