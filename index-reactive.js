const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const localtunnel = require('localtunnel');
const mqtt = require('mqtt');
const { Observable, mergeMap, map } = require('rxjs');

function openServer(defaultResponse = {}) {
	return new Observable(async (subscriber) => {
		try {
			const port = 3001;
			const app = express();
			app.use(express.json());
			app.get('/', (request, response) => response.send(defaultResponse));
			const server = app.listen(port);
			const tunnel = await localtunnel({ port });
			subscriber.next({ server, tunnel });
			subscriber.complete();
		} catch (error) {
			subscriber.error(error);
		}
	});
}

function closeServer(
	server = require('express')().listen(),
	tunnel = require('localtunnel')()
) {
	return new Observable(async (subscriber) => {
		try {
			tunnel.close();
			return server.close((error) => {
				if (!!error) subscriber.error(error);
				subscriber.next();
				subscriber.complete();
			});
		} catch (error) {
			return subscriber.error(error);
		}
	});
}

function deploy(id = 'deviceId', url = '', mqttConfig = {}) {
	return new Observable((subscriber) => {
		try {
			const commit = github.context.payload.head_commit?.id;
			// 2 minutes timeout
			const timeout = setTimeout(() => {
				clearTimeout(timeout);
				subscriber.error('timeout');
			}, 120000);
			const client = mqtt.connect(mqttConfig.url, mqttConfig.options);
			client.on('connect', function () {
				client.subscribe(mqttConfig.topic, function (error) {
					if (error) {
						subscriber.error(error);
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
							subscriber.next('SUCCESSFUL');
							subscriber.complete();
						} else {
							subscriber.error('UNSUCCESSFUL');
						}
					} else {
						subscriber.next(payload?.stage);
					}
				}
			});
		} catch (error) {
			return subscriber.error(error);
		}
	});
}

function handleError(error = new Error()) {
	console.error(err);
	core.setFailed(JSON.stringify(error, undefined, 2));
}

(async function () {
	try {
		const deviceId = core.getInput('deviceId');
		const time = new Date().toTimeString();
		openServer({ time })
			.pipe(
				mergeMap(({ server, tunnel }) => {
					console.log('SERVER OPENED');
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
					return deploy(deviceId, tunnel.url, mqttConfig).pipe(
						map((stage) => [{ server, tunnel }, stage])
					);
				}),
				mergeMap(([{ server, tunnel }, stage]) => {
					console.log({ stage });
					if (stage === 'SUCCESSFUL') {
						console.log('DEPLOYED');
					}
					return closeServer(server, tunnel);
				})
			)
			.subscribe({
				next: () => {
					console.log('SERVER CLOSED');
					core.setOutput('result', 'successful');
				},
				error: handleError
			});
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
		console.error(error);
	}
})();
