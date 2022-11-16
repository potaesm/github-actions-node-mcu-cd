const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const localtunnel = require('localtunnel');
// const fs = require('fs-extra');
// const mqtt = require('mqtt');

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

(async function () {
	try {
		const input = core.getInput('input');
		console.log({ input });
		const payload = JSON.stringify(github.context.payload, undefined, 2);
		console.log(`The event payload: ${payload}`);
		const time = new Date().toTimeString();
		const { server, tunnel } = await openServer({ time });
		console.log(tunnel.url);
		await closeServer(server, tunnel);
		core.setOutput('time', time);
		console.log('CLOSED');
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
		console.error(error);
	}
})();
