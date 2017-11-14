const clientID = "jzkbprff40iqj646a697cyrvl0zt2m6";
const createMessage = require("./createMessage");
const superagent = require("superagent");
module.exports = redis => {
	setInterval(() => checkChannels(redis), 60000);
};

async function checkChannels(redis) {
	const toCheck = (await redis.keys("feeds:twitch:*")).map(key => key.substring(key.lastIndexOf(":") + 1));
	const onlineData = await redis.keys("feeds:twitchData:*");

	let requests = [];
	for(let i = 0; i < toCheck.length; i += 100) requests.push(toCheck.slice(i, i + 100));
	requests = requests.map(channels => superagent.get("https://api.twitch.tv/kraken/streams/")
		.set("Client-ID", clientID)
		.query({
			channel: channels.join(","),
			limit: 100
		}));
	requests = (await Promise.all(requests))
		.map(({ body: { streams } }) => streams)
		.reduce((a, b) => a.concat(b), []);

	for(const stream of requests) {
		const index = onlineData.indexOf(`feeds:twitchData:${stream.channel.name}`);
		if(~index) return;

		sendOnline(redis, stream);
		onlineData.splice(index, 1);
		await redis.set(`feeds:twitchData:${stream.channel.name}`, JSON.stringify({
			followers: stream.channel.followers,
			time: new Date(stream.created_at).getTime(),
			views: stream.channel.views
		}), 1814400);
	}

	const offlineData = onlineData
		.map(key => key.substring(key.lastIndexOf(":") + 1))
		.map(key => [
			superagent.get(`https://api.twitch.tv/kraken/channels/${key}`).set("Client-ID", clientID),
			JSON.parse(redis.get(`feeds:twitchData:${key}`))
		])
		.map(promises => Promise.all(promises));

	for(const [channelData, redisData] of await Promise.all(offlineData)) {
		sendOffline(redis, {
			channel: channelData.name,
			display: channelData.display_name,
			followersGained: channelData.followers - redisData.followers,
			viewsGained: channelData.views - redisData.views,
			timeStreamed: Date.now() - redisData.time,
			url: channelData.url
		});
	}
}

async function sendOffline(redis, data) {
	const channels = JSON.parse(await redis.get(`feeds:twitch:${data.channel}`));
	const embed = {
		color: 0xff3333,
		url: data.url,
		title: `${data.display} went offline`,
		fields: [{
			name: "Followers gained",
			value: data.followersGained,
			inline: true
		}, {
			name: "Views gained",
			value: data.viewsGained,
			inline: true
		}, {
			name: "Time streamed",
			value: `${Math.floor(data.timedStreamed / 3600000)}h ${Math.floor(data.timedStreamed % 3600000 / 60000)}m`,
			inline: true
		}]
	};

	channels.forEach((channel, i) => createMessage(channel, embed, i * 1250));
}

async function sendOnline(redis, stream) {
	const channels = JSON.parse(await redis.get(`feeds:twitch:${stream.channel.name}`));
	const embed = {
		color: 0x56d696,
		url: stream.channel.url,
		title: `${stream.channel.display_name} went online`,
		image: { url: stream.preview.large }
	};

	channels.forEach((channel, i) => createMessage(channel, embed, i * 1250));
}