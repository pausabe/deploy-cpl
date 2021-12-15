
const FileSystemService = require("./FileSystemService");
const ScriptGeneratorService = require("./ScriptGeneratorService.js");
const DatabaseKeys = require("./DatabaseKeys");
const shell = require('child_process');
const fs = require("fs");

async function BackUpCurrentDatabase(){
    let today = new Date();
    let backupName = today.getMonth().toString() + today.getDay().toString() + today.getFullYear().toString() + "_" + DatabaseKeys.DatabaseName;
    let oldFilePath = DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName
    let newFilePath = DatabaseKeys.DatabaseBackupDirectory + backupName;
    console.log("Back up: " + oldFilePath + " -> " + newFilePath);
    await FileSystemService.MoveFile(oldFilePath, newFilePath);
}

async function SaveUploadedDatabase(db_file){
    let databaseFilePath = DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName;
    console.log("Saving Uploaded Database into: " + databaseFilePath);
    await db_file.mv(databaseFilePath);
}

async function GenerateChangesScriptIntoAppProject(){
    console.log("Generating changes script into: " + DatabaseKeys.ScriptsPath);
    let jsonScript = await ScriptGeneratorService.GenerateJsonScript(0);
    await FileSystemService.WriteStringInFile(DatabaseKeys.ScriptsPath, JSON.stringify(jsonScript));
}

async function UpdateAppRepository(appRepoBranch){
    console.log("Updating Repository from branch: " + appRepoBranch);
    return new Promise((resolve, reject) => {
        shell.exec(
        `sh UpdateAppRepository.sh ${appRepoBranch}`, 
        async (err, stdout, stderr) => {
            if(err){
            reject();
            }
            else{
            resolve();
            }
        });
    });
}

async function DeployAppProject(expoReleaseChannel, expo_user, expo_pass, expo_send){
    return new Promise((resolve, reject) => {
        let currentAppVersion = GetCurrentAppVersion();
        let channelName = expoReleaseChannel + "_" + currentAppVersion;
        console.log("Deploying App in channel: " + channelName);
        console.log("DatabaseKeys.AvoidDeploy", DatabaseKeys.AvoidDeploy);
        if(DatabaseKeys.AvoidDeploy){
            resolve();
        }
        else{
            shell.exec(
                `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${channelName}`, 
                async (err, stdout, stderr) => {
                    if(err){
                        reject();
                    }
                    else{
                        resolve();
                    }
                });
        }
    });
}

function GetCurrentAppVersion(){
    let appConfigFilePath = "./cpl-app/app.json";
    let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
    let appConfigFileContentJson = JSON.parse(appConfigFileContentString);
    let appVersionRaw = appConfigFileContentJson.expo.version;
    let appVersionRawArray = appVersionRaw.split(".");
    let appVersion = appVersionRawArray[0] + "." + appVersionRawArray[1];
    return appVersion;
}

module.exports = { BackUpCurrentDatabase,  SaveUploadedDatabase, GenerateChangesScriptIntoAppProject, UpdateAppRepository, DeployAppProject };