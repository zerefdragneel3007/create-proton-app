const commander = require('commander');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ncp = require('ncp').ncp;
const { exec } = require('child_process');

const pkgJson = require('../package.json');
const {isOnline, ansiColors} = require('./utils');
const runningOnWindows = os.platform() === 'win32';

let projectDir;

const app = new commander.Command(pkgJson.name)
  .version(pkgJson.version)
  .arguments('<project-name>')
  .usage('<project-name> [options]')
  .action(dirName => {
    projectDir = dirName;
  })
  .on('--help', () => {
    console.log('Example:');
    console.log();
    console.log('	$ create-proton-app `project_name` ');
    console.log();
  })
  .option('--verbose', 'Print additional logs')
  .parse(process.argv);


const createApp = function(projectDir) {
  const rootPath = path.resolve(projectDir);
  const projectName = path.basename(rootPath);
  
  console.log(`Creating a new Proton Native app on ${rootPath}`);
  console.log();

  //creates package.json file on the new project dir
  // get latest stable dep releases,
  const json = {
    "name": "app",
    "version": "0.0.1",
    "private": true,
    "scripts": {
      "start": "babel-watch index.js",
      "build": "babel index.js -d bin/",
      "pack": "electron-builder --dir",
      "dist": "electron-builder"
    },
    "dependencies": {
      "proton-native": "latest",
      "react": "^16.8.6"
    },
    "devDependencies": {
      "@babel/cli": "^7.4.4",
      "@babel/core": "^7.4.4",
      "@babel/preset-env": "^7.4.4",
      "@babel/preset-react": "^7.0.0",
      "babel-watch": "^7.0.0",
      "electron-builder": "latest"
    },
    "build": {
      "protonNodeVersion": "current",
      "mac": {
        "identity": null
      }
    }
  };

  // if any of these operations fails, there is no sense on continuing execution, that's why *Sync
  if (fs.existsSync(rootPath)) {
    fs.writeFileSync(path.join(rootPath, 'package.json'), JSON.stringify(json, null, 2) + os.EOL);
  } else {
    fs.mkdirSync(rootPath);
    fs.writeFileSync(path.join(rootPath, 'package.json'), JSON.stringify(json, null, 2) + os.EOL);
  }	
  
  process.chdir(rootPath);
  // copy template files
  const templatePath = path.join(__dirname, '..', 'template');
  ncp(templatePath, process.cwd(), (error) => {
    if(error){
      printErrorMessage(error);
      process.exit(1);
    }
  });

  console.log('Installing packages... This may take a few minutes. \n');

  isOnline()
  .then((online) => {
    if (!online) {
      return Promise.reject({message: 'Looks like you are offline.'});
    } else {
      return installDeps(app.verbose);
    }
  }).then(() => {
    process.chdir('..');
    printSuccessMessage(rootPath, projectName);
    process.exit(1);
  })
  .catch((error) => {
    //print error message
    printErrorMessage(error.message);
    process.exit(1);
  });
};

const installDeps = (verbose) => {
  // Install dependecies
  const command = `npm${runningOnWindows ? '.cmd' : ''}`; // Supporting only npm initially, yarn will come in the future(maybe)	
  const args = ['install'];
  if (verbose) {
    args.push('--verbose');
  }

  return new Promise((resolve, reject) => {
    const childProc = exec(`${command} ${args.join(' ')}`);
    childProc.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
    childProc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    childProc.on('close', (code) => {
      if (code !== 0) {
        reject({
          message: `${command} ${args.join(' ')} has failed.`,
        });
      }
      else {
        resolve();
      }
    });
  });
};


const printSuccessMessage = (rootPath, projectName) => {
  console.log();
  console.log('Great! You are all set.');
  console.log(`Created ${projectName} inside ${rootPath}`);
  console.log();
  console.log();
  console.log('Inside that directory, you can run the following commands: ');
  console.log();
  console.log(ansiColors.green, 'npm run start');
  console.log(ansiColors.reset, 'Will run your application.');
  console.log();
  console.log(ansiColors.green, 'npm run build');
  console.log(ansiColors.reset, 'Bundles and transpiles your source files.');
  console.log();
  console.log('Go to your project folder and run your application typing:')
  console.log(ansiColors.green, 'cd', ansiColors.reset,`${projectName}`);
  console.log(ansiColors.green,'npm run start');
  console.log(ansiColors.reset);
  console.log();
};

const printErrorMessage = (errorMessage) => {
  console.log();
  console.error('An error ocurred: ');
  console.log(ansiColors.red, `${errorMessage}`);
  console.log(ansiColors.reset);
};

if (typeof projectDir === 'undefined') {
  printErrorMessage('No directory especified ...');
  process.exit(1);
}

createApp(projectDir);
