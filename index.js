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
			await ngrok.authtoken(
				'2EzjPvdarzrY7Bz2BrKKMpZh1Mu_5CRVzmupxvYHwPbYMoofu'
			);
			const url = await ngrok.connect({
				proto: 'http',
				addr: port,
                // authtoken: '2EzjPvdarzrY7Bz2BrKKMpZh1Mu_5CRVzmupxvYHwPbYMoofu', 
                configPath: './ngrok.yml'
			});
			return resolve({ server, url });
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

try {
	const input = core.getInput('input');
	console.log({ input });
	const payload = JSON.stringify(github.context.payload, undefined, 2);
	console.log(`The event payload: ${payload}`);
	const time = new Date().toTimeString();
	const app = express();
	app.use(express.json());
	app.get('/', (request, response) => response.send({ input, time, payload }));
	openServer(app, ngrok)
		.then(({ server, url }) => {
			console.log(url);
			wait(20000).then(() => {
				closeServer(server, ngrok).then(() => {
					// core.setOutput('time', time);
				});
			});
		})
		.catch((error) => {
			throw error;
		});
} catch (error) {
	// core.setFailed(JSON.stringify(error, undefined, 2));
}
