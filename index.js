const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const localtunnel = require('localtunnel');
// const mqtt = require('mqtt');

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

function openServer(app = require('express')(), port = 3000) {
	return new Promise(async (resolve, reject) => {
		try {
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

try {
	const input = core.getInput('input');
	console.log({ input });
	const payload = JSON.stringify(github.context.payload, undefined, 2);
	console.log(`The event payload: ${payload}`);
	const time = new Date().toTimeString();
	const app = express();
	app.use(express.json());
	app.get('/', (request, response) => response.send({ input, time, payload }));
	openServer(app)
		.then(({ server, tunnel }) => {
			console.log(tunnel.url);
			wait(20000).then(() => {
				closeServer(server, tunnel).then(() => {
					core.setOutput('time', time);
				});
			});
		})
		.catch((error) => {
			throw error;
		});
} catch (error) {
	core.setFailed(JSON.stringify(error, undefined, 2));
}
