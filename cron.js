const cron      = require("node-cron"),
      deasync   = require("deasync"),
      request   = require("request"),
      neow      = require("neow"),
      time      = require("moment"),
      sqlite3   = require("sqlite3"),
      db        = new sqlite3.Database("./database.sqlite"),
      config    = require("./config.json");

// Run every hour..
cron.schedule("0 * * * *", function () {
  db.serialize(function () {
    db.each("SELECT * FROM users", function (err, row) {
      let currentTime = time().unix();
      let lastChecked = parseInt(row.lastChecked);
      let characterName = row.characterName;
      let characterID = row.characterID;
      let corporationID = row.corporationID;
      let allianceID = row.allianceID;
      let discordID = row.discordID;
      let roleID = row.roleID;
      let guildID = row.guildID;

      if(currentTime > (lastChecked + 3600)) {
        console.log("Rechecking " + characterName);

        let client = new neow.EveClient({
          ids: characterID
        });

        client.fetch("eve:CharacterAffiliation").then(function (result) {
          let data = result.characters[characterID];
          let currentCorporation = data.corporationID;
          let currentAlliance = data.allianceID;

          if(currentCorporation != corporationID) {
            console.log(characterName + " is no longer in the same corporation");
            request({
              headers: {
                "Authorization": "Bot " + config.discordBotToken,
                "User-Agent": "EVE Discord Authenticator"
              },
              uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID + "/roles/" + roleID,
              method: "DELETE"
            });
            request({
              headers: {
                "Authorization": "Bot " + config.discordBotToken,
                "User-Agent": "EVE Discord Authenticator"
              },
              uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID,
              json: {"nick": characterName},
              method: "PATCH"
            });
            updateLastChecked(characterID);
          } else if(currentAlliance != allianceID) {
            console.log(characterName + " is no longer in the same alliance");
            request({
              headers: {
                "Authorization": "Bot " + config.discordBotToken,
                "User-Agent": "EVE Discord Authenticator"
              },
              uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID + "/roles/" + roleID,
              method: "DELETE"
            });
            request({
              headers: {
                "Authorization": "Bot " + config.discordBotToken,
                "User-Agent": "EVE Discord Authenticator"
              },
              uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID,
              json: {"nick": characterName},
              method: "PATCH"
            });
            updateLastChecked(characterID);
          } else {
            console.log("User is in the same corporation/alliance so nothing has to be done.");
            updateLastChecked(characterID);
          }
        });
      }
    });
  });
});

function updateLastChecked(characterID) {
  try {
    let stmt = db.prepare("UPDATE users SET lastChecked = ? WHERE characterID = ?");
    stmt.run(time().unix(), characterID);
    stmt.finalize();
  } catch (err) {
    console.log(err);
  }
}
