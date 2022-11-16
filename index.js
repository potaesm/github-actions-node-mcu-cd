const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const localtunnel = require('localtunnel');
const mqtt = require('mqtt');

function openServer(defaultResponse = {}) {
	return new Promise(async (resolve, reject) => {
		try {
			const port = 3001;
			const app = express();
			app.use(express.json());
			app.get('/', (request, response) => response.send(defaultResponse));
			const server = app.listen(port);
			const tunnel = await localtunnel({ port });
			return resolve({ server, tunnel });
		} catch (error) {
			return reject(error);
		}
	});
}

function closeServer(
	server = require('express')().listen(),
	tunnel = require('localtunnel')()
) {
	return new Promise(async (resolve, reject) => {
		try {
			tunnel.close();
			return server.close((error) => {
				if (!!error) reject(error);
				resolve();
			});
		} catch (error) {
			return reject(error);
		}
	});
}

function wait(time = 1000) {
	return new Promise((resolve, reject) => {
		try {
			const timeout = setTimeout(() => {
				clearTimeout(timeout);
				resolve();
			}, time);
		} catch (error) {
			reject(error);
		}
	});
}

function deploy(id = 'deviceId', url = '') {
	return new Promise((resolve, reject) => {
		try {
			const commit = github.context.payload.head_commit?.id;
			// 2 minutes timeout
			const timeout = setTimeout(() => {
				clearTimeout(timeout);
				reject('timeout');
			}, 120000);
			const mqttConfig = {
				url: 'mqtt://puffin.rmq2.cloudamqp.com',
				options: {
					username: 'gwbvwhzr:gwbvwhzr',
					password: 'BH4UyDm74GHbzdsYJOFtvZL7LTIM_bNB'
				},
				topic: 'main/update',
				defaultStageMessage: {
					DOWNLOADED: 'DOWNLOADED',
					UPDATED: 'UPDATED',
					RESTARTED: 'RESTARTED'
				}
			};
			const client = mqtt.connect(mqttConfig.url, mqttConfig.options);
			client.on('connect', function () {
				client.subscribe(mqttConfig.topic, function (error) {
					if (error) {
						reject(error);
					} else {
						// Deploy message
						client.publish(
							mqttConfig.topic,
							JSON.stringify({ id, commit, url })
						);
					}
				});
			});
			client.on('message', function (topic, message) {
				const payload = JSON.parse(message.toString());
				if (
					topic === mqttConfig.topic &&
					Object.values(mqttConfig.defaultStageMessage).includes(payload?.stage)
				) {
					const isRestarted =
						payload?.stage === mqttConfig.defaultStageMessage.RESTARTED;
					const isLatestCommitId = payload?.commit !== commit;
					if (isRestarted) {
						client.end();
						if (isLatestCommitId) {
							resolve('update successful');
						} else {
							reject('update unsuccessful');
						}
					} else {
						// Use observable will log each steps in details
						console.log(payload?.stage);
					}
				}
			});
		} catch (error) {
			return reject(error);
		}
	});
}

(async function () {
	try {
		const deviceId = core.getInput('deviceId');
		const time = new Date().toTimeString();
		const { server, tunnel } = await openServer({ time });
		// const deploymentResult = await deploy(deviceId, tunnel.url);
		await closeServer(server, tunnel);
		// core.setOutput('result', deploymentResult);
		core.setOutput('result', 'successful');
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
		console.error(error);
	}
})();
