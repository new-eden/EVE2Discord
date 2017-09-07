const cron      = require("node-cron"),
      deasync   = require("deasync"),
      request   = require("request"),
      esi      = require("eve-swagger"),
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

        esi.characters(characterID).info().then(function (result) {
	  console.log(result);
          let currentCorporation = result.corporation_id;
          let currentAlliance = result.alliance_id;

          if(currentCorporation != corporationID) {
            console.log(characterName + " is no longer in the same corporation");
            //update ticker
            esi.corporations(currentCorporation).info().then(function (result2) {
	      request({
	        headers: {
	          "Authorization": "Bot " + config.discordBotToken,
	          "User-Agent": "EVE Discord Authenticator"
	        },
	        uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID,
		json: {"nick": "[" + result2.ticker + "] " + characterName},
	        method: "PATCH"
	      });
	    });
          }
          if (config.corporationIDs.includes(currentCorporation) || config.allianceIDs.includes(currentAlliance)) {
            console.log("User is in the coalition so no memebership change has to be done.");
            updateLastChecked(characterID);
          } else {
            console.log(characterName + " is no longer in the same alliance");
            request({
              headers: {
                "Authorization": "Bot " + config.discordBotToken,
                "User-Agent": "EVE Discord Authenticator"
              },
              uri: "https://discordapp.com/api/guilds/" + guildID + "/members/" + discordID + "/roles/" + roleID,
              method: "DELETE"
            });
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
