const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const ngrok = require('ngrok');
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

function openServer(
	app = require('express')(),
	ngrok = require('ngrok'),
	port = 3000
) {
	return new Promise(async (resolve, reject) => {
		try {
			const server = app.listen(port);
			const url = await ngrok.connect({
				proto: 'http',
				addr: port,
				onStatusChange: (status) => {
					if (status === 'connected') resolve({ server, url });
				},
				authtoken: '2EzjPvdarzrY7Bz2BrKKMpZh1Mu_5CRVzmupxvYHwPbYMoofu'
			});
		} catch (error) {
			return reject(error);
		}
	});
}

function closeServer(
	server = require('express')().listen(),
	ngrok = require('ngrok')
) {
	return new Promise(async (resolve, reject) => {
		try {
			await ngrok.disconnect();
			await ngrok.kill();
			return server.close((error) => {
				if (!!error) reject(error);
				resolve();
			});
		} catch (error) {
			return reject(error);
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
		const PORT = 3001;
		const app = express();
		app.use(express.json());
		app.get('/', (request, response) =>
			response.send({ input, time, payload })
		);
		const { server, url } = await openServer(app, ngrok);
		console.log({ url });
		// Do something
		await wait(60000);
		await closeServer(server, ngrok);
		core.setOutput('time', time);
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
	}
})();
