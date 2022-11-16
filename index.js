const core = require('@actions/core');
const github = require('@actions/github');
const express = require('express');
const localtunnel = require('localtunnel');
const fs = require('fs-extra');
const { exec } = require('child_process');
// const mqtt = require('mqtt');

function run(command) {
	return new Promise((resolve, reject) => {
		exec(`${command}`, (error, stdout, stderr) => {
			if (error) {
				return reject(error.message);
			}
			if (stderr) {
				return reject(stderr);
			}
			return resolve(stdout);
		});
	});
}

function build(githubWorkspace = '.') {
	return new Promise(async (resolve, reject) => {
		try {
			const buildPathExistsPromise = fs.pathExists(
				arduinoBuilderConstants.buildPath
			);
			const buildCacheExistsPromise = fs.pathExists(
				arduinoBuilderConstants.buildCache
			);
			const [buildPathExists, buildCacheExists] = await Promise.all([
				buildPathExistsPromise,
				buildCacheExistsPromise
			]);
			if (!buildPathExists) {
				fs.mkdir(arduinoBuilderConstants.buildPath, { recursive: true });
			}
			if (!buildCacheExists) {
				fs.mkdir(arduinoBuilderConstants.buildCache, { recursive: true });
			}
			const buildResult = await run(getBuildCommand(githubWorkspace));
			return buildResult;
		} catch (error) {
			return reject(error);
		}
	});
}

const arduinoBuilderConstants = {
	arduinoBuilder: './Java/arduino-builder',
	hardware: './hardware',
	toolsBuilder: './Java/tools-builder',
	builtInLibraries: './Java/libraries',
	libraries: './arduino_libraries',
	fqbn: 'esp8266:esp8266:nodemcuv2:xtal=80,vt=flash,exception=disabled,stacksmash=disabled,ssl=all,mmu=3232,non32xfer=fast,eesz=4M2M,led=2,ip=lm2f,dbg=Disabled,lvl=None____,wipe=none,baud=115200',
	ideVersion: 10819,
	buildPath: './arduino_build',
	buildCache: './arduino_cache',
	prefs: [
		'build.warn_data_percentage=75',
		'runtime.tools.python3.path=./hardware/esp8266/tools/python3/3.7.2-post1',
		'runtime.tools.python3-3.7.2-post1.path=./hardware/esp8266/tools/python3/3.7.2-post1',
		'runtime.tools.mklittlefs.path=./hardware/esp8266/tools/mklittlefs/3.0.4-gcc10.3-1757bed',
		'runtime.tools.mklittlefs-3.0.4-gcc10.3-1757bed.path=./hardware/esp8266/tools/mklittlefs/3.0.4-gcc10.3-1757bed',
		'runtime.tools.mkspiffs.path=./hardware/esp8266/tools/mkspiffs/3.0.4-gcc10.3-1757bed',
		'runtime.tools.mkspiffs-3.0.4-gcc10.3-1757bed.path=./hardware/esp8266/tools/mkspiffs/3.0.4-gcc10.3-1757bed',
		'runtime.tools.xtensa-lx106-elf-gcc.path=./hardware/esp8266/tools/xtensa-lx106-elf-gcc/3.0.4-gcc10.3-1757bed',
		'runtime.tools.xtensa-lx106-elf-gcc-3.0.4-gcc10.3-1757bed.path=./hardware/esp8266/tools/xtensa-lx106-elf-gcc/3.0.4-gcc10.3-1757bed'
	],
	inputFile: './sketch.ino'
};

function getBuildCommand(githubWorkspace = '.', sketchFile = './sketch.ino') {
	githubWorkspace = githubWorkspace + '/';
	const argList = [];
	argList.push(
		arduinoBuilderConstants.arduinoBuilder.replace('./', githubWorkspace)
	);
	argList.push('-compile');
	argList.push('-logger=machine');
	argList.push('-hardware');
	argList.push(arduinoBuilderConstants.hardware.replace('./', githubWorkspace));
	argList.push('-tools');
	argList.push(
		arduinoBuilderConstants.toolsBuilder.replace('./', githubWorkspace)
	);
	argList.push('-built-in-libraries');
	argList.push(
		arduinoBuilderConstants.builtInLibraries.replace('./', githubWorkspace)
	);
	argList.push('-libraries');
	argList.push(
		arduinoBuilderConstants.libraries.replace('./', githubWorkspace)
	);
	argList.push(`-fqbn=${arduinoBuilderConstants.fqbn}`);
	argList.push(`-ide-version=${arduinoBuilderConstants.ideVersion}`);
	argList.push('-build-path');
	argList.push(
		arduinoBuilderConstants.buildPath.replace('./', githubWorkspace)
	);
	argList.push('-warnings=none');
	argList.push('-build-cache');
	argList.push(
		arduinoBuilderConstants.buildCache.replace('./', githubWorkspace)
	);
	for (const item of arduinoBuilderConstants.prefs) {
		argList.push(`-prefs=${item.replace('./', githubWorkspace)}`);
	}
	argList.push('-verbose');
	argList.push(sketchFile);
	return argList.join(' ');
}

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
		const githubWorkspace = core.getInput('githubWorkspace');
		console.log({ githubWorkspace });
		// const payload = JSON.stringify(github.context.payload, undefined, 2);
		// console.log(`The event payload: ${payload}`);
		const time = new Date().toTimeString();
		const { server, tunnel } = await openServer({ time });
		console.log(tunnel.url);
		const result = await build(githubWorkspace);
		console.log(result);
		await closeServer(server, tunnel);
		core.setOutput('time', time);
		console.log('CLOSED');
	} catch (error) {
		core.setFailed(JSON.stringify(error, undefined, 2));
		console.error(error);
	}
})();
