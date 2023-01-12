const DatabaseKeys = require("./DatabaseKeys");
const shell = require('child_process');
const FileSystemService = require("./FileSystemService");
const Logger = require("../Utils/Logger");
const fs = require("fs");

async function MoveDatabaseInsideProject(repositoryDirectoryName, databaseFile) {
    let databaseFilePath = `./${repositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
    Logger.Log(Logger.LogKeys.DeployManagerService, "MoveDatabaseInsideProject", "Moving Uploaded Database into:", databaseFilePath);
    // TODO: I should use FileSystemService.MoveFile but I guess it doesn't work as well as .mv... I don't remember
    return databaseFile.mv(databaseFilePath);
}

async function BackUpDatabase(repositoryDirectoryName) {
    let today = new Date();
    let backupName = today.getMinutes().toString() + "_" + today.getDate().toString() + "_" + (today.getMonth() + 1).toString() + "_" + today.getFullYear().toString() + ".db";
    let databaseFilePath = `./${repositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
    let backupFilePath = DatabaseKeys.DatabaseBackupDirectory + backupName;
    Logger.Log(Logger.LogKeys.DeployManagerService, "BackUpDatabase", "Back up to:", backupFilePath);
    await FileSystemService.CopyFile(databaseFilePath, backupFilePath);
}

async function UpdateAppRepository(repositoryDirectoryName, appRepoBranch) {
    Logger.Log(Logger.LogKeys.DeployManagerService, "UpdateAppRepository", "Updating Repository from branch:", appRepoBranch);
    let packageJsonPath = `./${repositoryDirectoryName}/package.json`;
    let oldPackageContentString = fs.readFileSync(packageJsonPath).toString();
    await new Promise((resolve, reject) => {
        shell.exec(
            `sh UpdateAppRepository.sh ${repositoryDirectoryName} ${appRepoBranch}`,
            async (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
    let newPackageContentString = fs.readFileSync(packageJsonPath).toString();
    if(oldPackageContentString !== newPackageContentString){
        await UpdateDependencies(repositoryDirectoryName);
        Logger.Log(Logger.LogKeys.DeployManagerService, "UpdateAppRepository", "Dependencies updated correctly");
    }
    else{
        Logger.Log(Logger.LogKeys.DeployManagerService, "UpdateAppRepository", "No necessary to update dependencies");
    }
}

async function UpdateDependencies(repositoryDirectoryName) {
    Logger.Log(Logger.LogKeys.DeployManagerService, "UpdateDependencies", "Updating dependencies");
    return new Promise((resolve, reject) => {
        shell.exec(
            `sh update-dependencies.sh ${repositoryDirectoryName}`,
            async (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

async function DeployAppProject(expoReleaseChannel, repositoryDirectoryName, expo_user, expo_pass, expo_send) {
    return new Promise((resolve, reject) => {
        Logger.Log(Logger.LogKeys.DeployManagerService, "DeployAppProject", "Deploying App in channel:", expoReleaseChannel);
        if (DatabaseKeys.DeployActivated === 'true') {
            shell.exec(
                `sh deploy-cpl.sh ${repositoryDirectoryName} ${expo_user} ${expo_pass} ${expo_send} ${expoReleaseChannel}`,
                async (err, stdout, stderr) => {
                    if (err) {
                        Logger.Log(Logger.LogKeys.DeployManagerService, "DeployAppProject", "Deploy script finished with an error", err);
                        reject("Error when trying to deploy the update");
                    } else {
                        Logger.Log(Logger.LogKeys.DeployManagerService, "DeployAppProject", "Deploy script finished correctly");
                        resolve();
                    }
                });
        } else {
            resolve();
        }
    });
}

module.exports = { MoveDatabaseInsideProject, BackUpDatabase, UpdateAppRepository, DeployAppProject }