const DatabaseKeys = require("./DatabaseKeys");
const shell = require('child_process');
const fs = require("fs");
const FileSystemService = require("./FileSystemService");
const Logger = require("../Utils/Logger");

async function MoveDatabaseInsideProject(repositoryDirectoryName, databaseFile){
    let databaseFilePath = `./${repositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
    Logger.Log(Logger.LogKeys.DeployManagerService, "MoveDatabaseInsideProject", "Moving Uploaded Database into:", databaseFilePath);
    // TODO: I should use FileSystemService.MoveFile but I guess it doesn't work as well as .mv... I don't remember
    return databaseFile.mv(databaseFilePath);
}

async function BackUpDatabase(repositoryDirectoryName){
    let today = new Date();
    let backupName = today.getMinutes().toString() + "_" + today.getDate().toString() + "_" + (today.getMonth() + 1).toString() + "_" + today.getFullYear().toString() + ".db";
    let databaseFilePath = `./${repositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
    let backupFilePath = DatabaseKeys.DatabaseBackupDirectory + backupName;
    Logger.Log(Logger.LogKeys.DeployManagerService, "BackUpDatabase", "Back up to:", backupFilePath);
    await FileSystemService.CopyFile(databaseFilePath, backupFilePath);
}

async function UpdateAppRepository(repositoryDirectoryName, appRepoBranch){
    Logger.Log(Logger.LogKeys.DeployManagerService, "UpdateAppRepository", "Updating Repository from branch:", appRepoBranch);
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
        let currentAppBuildNumber = GetCurrentAppBuildNumber(repositoryDirectoryName);
        let channelName = expoReleaseChannel + "_" + currentAppBuildNumber;
        Logger.Log(Logger.LogKeys.DeployManagerService, "DeployAppProject", "Deploying App in channel:", channelName);
        if(DatabaseKeys.DeployActivated === 'true'){
            shell.exec(
                `sh deploy-cpl.sh ${repositoryDirectoryName} ${expo_user} ${expo_pass} ${expo_send} ${channelName}`,
                async (err, stdout, stderr) => {
                    Logger.Log(Logger.LogKeys.DeployManagerService, "DeployAppProject", "Deploy script finished " + err? "with an error" : "correctly");
                    if(err){
                        reject("Error when trying to deploy the update");
                    }
                    else{
                        resolve();
                    }
                });
        }
        else{
            resolve();
        }
    });
}

function GetCurrentAppBuildNumber(repositoryDirectoryName){
    let appConfigFilePath = `./${repositoryDirectoryName}/app.json`;
    let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
    let appConfigFileContentJson = JSON.parse(appConfigFileContentString.toString());
    let appVersionRaw = appConfigFileContentJson.expo.version;
    let appVersionRawArray = appVersionRaw.split(".");
    return appVersionRawArray[1];
}

module.exports = { BackUpDatabase, MoveDatabaseInsideProject, UpdateAppRepository, DeployAppProject }