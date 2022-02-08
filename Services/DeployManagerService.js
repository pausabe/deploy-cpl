
const FileSystemService = require("./FileSystemService");
const ScriptGeneratorService = require("./ScriptGeneratorService.js");
const DatabaseKeys = require("./DatabaseKeys");
const shell = require('child_process');
const fs = require("fs");

async function BackUpLastSavedDatabase(){
    let today = new Date();
    let backupName = today.getMonth().toString() + today.getDay().toString() + today.getFullYear().toString() + "_" + DatabaseKeys.DatabaseName;
    let oldFilePath = `./${DatabaseKeys.ScriptsDatabaseDirectoryName}/${DatabaseKeys.DatabaseName}`;
    let newFilePath = DatabaseKeys.ScriptsDatabaseBackupDirectory + backupName;
    console.log("Back up: " + oldFilePath + " -> " + newFilePath);
    await FileSystemService.MoveFile(oldFilePath, newFilePath);
}

async function SaveUploadedDatabase(db_file, scriptFileDatabaseDirectory){
    let databaseFilePath = `./${scriptFileDatabaseDirectory}/${DatabaseKeys.DatabaseName}`;
    console.log("Saving Uploaded Database into: " + databaseFilePath);
    await db_file.mv(databaseFilePath);
}

async function GenerateChangesScriptFileIntoAppProject(repositoryDirectoryName, scriptsDatabaseDirectory){
    const scriptFilePath = `./${repositoryDirectoryName}${DatabaseKeys.ScriptsPath}`;
    console.log("Generating changes script into: " + scriptFilePath);
    let jsonScript = await ScriptGeneratorService.GenerateJsonScript(0, scriptsDatabaseDirectory);
    await FileSystemService.WriteStringInFile(scriptFilePath, JSON.stringify(jsonScript));
}

async function UpdateAppRepository(repositoryDirectoryName, appRepoBranch){
    console.log("Updating Repository from branch: " + appRepoBranch);
    return new Promise((resolve, reject) => {
        shell.exec(
        `sh UpdateAppRepository.sh ${repositoryDirectoryName} ${appRepoBranch}`,
        async (err, stdout, stderr) => {
            if(err){
                reject(err);
            }
            else{
                resolve();
            }
        });
    });
}

async function DeployAppProject(expoReleaseChannel, repositoryDirectoryName, expo_user, expo_pass, expo_send){
    return new Promise((resolve, reject) => {
        let currentAppVersion = GetCurrentAppVersion(repositoryDirectoryName);
        let channelName = expoReleaseChannel + "_" + currentAppVersion;
        console.log("Deploying App in channel: " + channelName);
        console.log("DatabaseKeys.DeployActivated", DatabaseKeys.DeployActivated);
        if(DatabaseKeys.DeployActivated){
            shell.exec(
                `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${channelName}`, 
                async (err, stdout, stderr) => {
                    if(err){
                        console.log("deploy script finished with error", err);
                        reject("Error when trying to deploy the update");
                    }
                    else{
                        console.log("deploy script finished correctly");
                        resolve();
                    }
                });
        }
        else{
            resolve();
        }
    });
}

function GetCurrentAppVersion(repositoryDirectoryName){
    let appConfigFilePath = `./${repositoryDirectoryName}/app.json`;
    let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
    let appConfigFileContentJson = JSON.parse(appConfigFileContentString);
    let appVersionRaw = appConfigFileContentJson.expo.version;
    let appVersionRawArray = appVersionRaw.split(".");
    return appVersionRawArray[0] + "." + appVersionRawArray[1];
}

module.exports = { BackUpLastSavedDatabase, SaveUploadedDatabase, GenerateChangesScriptFileIntoAppProject, UpdateAppRepository, DeployAppProject }