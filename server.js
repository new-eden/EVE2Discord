var express =               require("express"),
    session =               require("express-session"),
    passport =              require("passport"),
    DiscordStrategy =       require("passport-discord"),
    EVEStrategy =           require("passport-eveonline"),
    request =               require("request"),
    neow =                  require("neow"),
    cookieParser =          require('cookie-parser'),
    app =                   express(),
    config =                require("./config.json");

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var discordScopes = ["identify", "email", "guilds.join"];

passport.use(new DiscordStrategy({
  clientID: config.discordClientID,
  clientSecret: config.discordSecret,
  callbackURL: config.discordCallBack,
  scope: discordScopes
}, function(accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    return done(null, profile, accessToken);
  });
}));

passport.use(new EVEStrategy({
  clientID: config.eveClientID,
  clientSecret: config.eveSecret,
  callbackURL: config.eveCallBack
}, function (characterInformation, done) {
  return done(null, characterInformation);
}));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

app.get("/", passport.authenticate("discord", {scope: discordScopes}), function (req, res) {});
app.get("/auth/discord", passport.authenticate("discord", { failureRedirect: "/fail"}), function (req, res) {
  // Join user to guild..
  console.log("Joining user to guild..");
  var authorizationToken = "Bearer " + req.authInfo;
  request({
    headers: {
      "Authorization": authorizationToken,
      "User-Agent": "EVE Discord Authenticator"
    },
    uri: "https://discordapp.com/api/invites/" + config.discordInviteID,
    method: "POST"
  }, function(err, ret, body) {
    if(err) {
      res.redirect("/error");
    }
    else {
      let options = {maxAge: 1000 * 60, httpOnly: false, signed: false};
      res.cookie("did", req.user.id, options);
      res.redirect("/eve");
    }
  });
});
app.get("/eve", passport.authenticate("eveonline"));
app.get('/auth/eve', passport.authenticate('eveonline', { failureRedirect: '/error' }), function (req, res) {
  // Get user information from CCPs API server (the characterAffiliate endpoint)
  var characterID = req.user.CharacterID;
  var client = new neow.EveClient({
    ids: characterID
  });
  client.fetch("eve:CharacterAffiliation").then(function(result) {
    var allianceID = result.characters[characterID].allianceID;
    var discordID = req.cookies.did;
    // If user is in allowed alliance, add user to alliance group
    if(allianceID == config.allianceID) {
      // Now to post to the Discord API using the bot token, to add user to group......
      request({
        headers: {
          "Authorization": "Bot " + config.discordBotToken,
          "User-Agent": "EVE Discord Authenticator"
        },
        uri: "https://discordapp.com/api/guilds/" + config.guildID + "/members/" + discordID + "/roles/" + config.roleID,
        method: "PUT"
      }, function(err, ret, body) {
        if(err) {
          res.redirect("/error");
        }
        else {
          console.log(result.characters[characterID].characterName + " is now authed and can use discord");
          res.json({"success": "you can now use discord like a boss.."});
        }
      });
    } else {
      res.redirect("/error");
    }
  });
});

// Error handler.. lulz?!!?
app.get("/error", function (req, res) {
  res.json({"error": "you dun fukd up bruh..."});
});

app.listen(config.listenPort, config.listenIP, function (err) {
  if(err) return console.log(err);
  console.log("Listening at " + config.listenIP + " on port " + config.listenPort);
});
