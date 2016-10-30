const Discord = require("discord.js"),
      bot = new Discord.Client(),
      fs = require("fs"),
      yaml = require("js-yaml");

exports.bot = bot;
exports.config = yaml.safeLoad(fs.readFileSync("./private/config.yml"));
exports.defaultConfig = fs.readFileSync("./private/default-config.yml");
exports.commands = {
  creator: {},
  default: {},
  dm: {},
  moderator: {}
};

var formatDate = (date) => {
    var date = new Date(date);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November"];
    var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var month = months[date.getMonth()];
    var day = date.getDate();
    var weekday = weekdays[date.getDay()];
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var year = date.getFullYear()

    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    return `${weekday}, ${month} ${day} ${year}, ${hour}:${min}:${sec}`;
}

registerCommand = function(name, type, callback, aliases, description, usage) {
  exports.commands[type][name] = {};
  exports.commands[type][name]["aliases"] = aliases;
  exports.commands[type][name]["description"] = description;
  exports.commands[type][name]["usage"] = usage;
  exports.commands[type][name]["process"] = callback;
}

var loadScript = (path, reload) => {
  var req = require(path);
  if (reload) {
    consoleLog("Reloaded script at " + path, "debug");
  } else {
    consoleLog("Loaded script at " + path, "debug");
  }
}

var changeConfig = (guildId, callback) => {
  var path = "./server-configs/" + guildId + ".yml";
  var data = yaml.safeLoad(fs.readFileSync(path));
  callback();
  fs.writeFileSync(path, yaml.safeDump(data));
  consoleLog("Edited config in `" + path + "`\n\n```\n" + callback + "\n```", "debug");
}

var getConfigValue = (guildId, name) => {
  var path = "./server-configs/" + guildId + ".yml";
  var data = yaml.safeLoad(fs.readFileSync(path));
  try { return data[name]; }
  catch(err) { return; }
}

var consoleLog = (message, type) => {
  if (type == "important" || type == "!") {
    console.log("[!] " + message);
    var channel = "important";
  } else if (type == "dm") {
    console.log("[DM] " + message);
    var channel = "dm";
  } else if (type == "command" || type == "cmd") {
    console.log("[CMD] " + message);
    var channel = "commands";
  } else if (type == "debug") {
    if (exports.config["options"]["debugMode"]) {
      console.log("[DEBUG] " + message);
      var channel = "debug";
    }
  }
  if (channel != null) {
    channel = exports.config["channels"][channel]
    try {
      channel = bot.channels.get(channel);
      channel.sendMessage(message);
    } catch(e) {}
  }
}

exports.formatDate = formatDate;
exports.registerCommand = registerCommand;
exports.loadScript = loadScript;
exports.changeConfig = changeConfig;
exports.getConfigValue = getConfigValue;
exports.consoleLog = consoleLog;

// Thanks to nfell2009 for having a repo that helped me with splitting files
// https://github.com/TheDuckyProject/DuckyJS

var modules = fs.readdirSync("./modules/");
modules.forEach(script => {
  if (script.substring(script.length - 3, script.length) == ".js") {
    loadScript("./modules/" + script);
  }
});

var commands = fs.readdirSync("./commands/");
commands.forEach(script => {
  if (script.substring(script.length - 3, script.length) == ".js") {
    exports.loadScript("./commands/" + script);
  }
});
