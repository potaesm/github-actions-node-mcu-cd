const { exec } = require('child_process');
const fs = require('fs-extra');

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

function getBuildCommand(sketchFile = './sketch.ino') {
	' -verbose ./sketch_nov16a.ino';
	const argList = [];
	argList.push(arduinoBuilderConstants.arduinoBuilder);
	argList.push('-compile');
	argList.push('-logger=machine');
	argList.push('-hardware');
	argList.push(arduinoBuilderConstants.hardware);
	argList.push('-tools');
	argList.push(arduinoBuilderConstants.toolsBuilder);
	argList.push('-built-in-libraries');
	argList.push(arduinoBuilderConstants.builtInLibraries);
	argList.push('-libraries');
	argList.push(arduinoBuilderConstants.libraries);
	argList.push(`-fqbn=${arduinoBuilderConstants.fqbn}`);
	argList.push(`-ide-version=${arduinoBuilderConstants.ideVersion}`);
	argList.push('-build-path');
	argList.push(arduinoBuilderConstants.buildPath);
	argList.push('-warnings=none');
	argList.push('-build-cache');
	argList.push(arduinoBuilderConstants.buildCache);
	for (const item of arduinoBuilderConstants.prefs) {
		argList.push(`-prefs=${item}`);
	}
	argList.push('-verbose');
	argList.push(sketchFile);
	return argList.join(' ');
}

function build() {
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
			const buildResult = await run(getBuildCommand());
			return buildResult;
		} catch (error) {
			return reject(error);
		}
	});
}

(async function () {
	try {
		const buildResult = await build();
		console.log(buildResult);
	} catch (error) {
		console.log(error);
	}
})();
