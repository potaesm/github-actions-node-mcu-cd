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
		app.get('/', (request, response) => response.send({ input, time, payload }));
		app.listen(PORT);
		ngrok
			.connect({
				proto: 'http',
				addr: PORT,
				onStatusChange: (status) => {
					console.log({ status });
				},
				authtoken: '2EzjPvdarzrY7Bz2BrKKMpZh1Mu_5CRVzmupxvYHwPbYMoofu'
			})
			.then((url) => {
				console.log({ url });
			})
			.catch((error) => {
				core.setFailed(JSON.stringify(error, undefined, 2));
			});
		await wait(60000);
		core.setOutput('time', time);
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
	}
})();
