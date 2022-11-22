const DeployManagerService = require("./Services/DeployManagerService");
const DatabaseKeys = require("./Services/DatabaseKeys");
const Logger = require("./Utils/Logger")

const fs = require("fs");
const basicAuth = require('express-basic-auth');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const {LogKeys} = require("./Utils/Logger");

const port = 3000;

const cpl_user = process.env.CPL_USER;
const cpl_pass = process.env.CPL_PASS;
const expo_user = process.env.EXPO_USER;
const expo_pass = process.env.EXPO_PASS;
const expo_send = process.env.EXPO_SEND;
const expo_prod_channel = process.env.EXPO_PROD_CHANNEL;
const app_repo_branch_production = process.env.APP_REPO_BRANCH_PRODUCTION;

let webCredentials = {};
webCredentials[cpl_user] = cpl_pass;

app.use(basicAuth({
        challenge: true,
        users: webCredentials,
    }),
    fileUpload({
        createParentPath: true
    }));

app.get('/', (req, res) => {
    fs.readFile("index.html", 'utf8', (err, data) => {
        if (err) {
            res.send("Unable to load index.html");
            return;
        }
        res.send(data);
    });
});

app.get('/DownloadDatabaseFromProduction', function (req, res) {
    try {
        Logger.Log(LogKeys.IndexJS, "DownloadDatabaseFromProduction", "Starting Download");
        res.download(
            `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`);
    } catch (err) {
        Logger.LogError(LogKeys.IndexJS, "DownloadDatabaseFromProduction", err);
        res.send('Something went wrong: ' + err);
    }
});

app.post('/PublishProduction', async (req, res) => {
    try {
        Logger.Log(LogKeys.IndexJS, "PublishProduction", "Starting Release in production");
        if (!req.files) {
            Logger.Log(LogKeys.IndexJS, "PublishProduction", "PublishProduction: cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else {
            await PublishDatabaseChangesProduction(req.files.db_file);
            Logger.Log(LogKeys.IndexJS, "PublishProduction", "Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
        }
    } catch (err) {
        Logger.LogError(LogKeys.IndexJS, "PublishProduction", err);
        res.status(500).send(err);
    }
});

app.post('/PublishTest', async (req, res) => {
    try {
        Logger.Log(LogKeys.IndexJS, "PublishTest", "Starting Release in test");
        if (!req.files) {
            Logger.Log(LogKeys.IndexJS, "PublishTest", "cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else if (!req.body.repobranch) {
            Logger.Log(LogKeys.IndexJS, "PublishTest", "cap repo introduït");
            res.send('Error: cap repo introduït');
        } else if (!req.body.releasechannel) {
            Logger.Log(LogKeys.IndexJS, "PublishTest", "cap channel introduït");
            res.send('Error: cap channel introduït');
        } else {
            await PublishDatabaseChangesTest(req.files.db_file, req.body.repobranch, req.body.releasechannel);
            Logger.Log(LogKeys.IndexJS, "PublishTest", "Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
        }
    } catch (err) {
        Logger.LogError(LogKeys.IndexJS, "PublishTest", err);
        res.status(500).send(err);
    }
});

app.listen(port, () => {
    Logger.Log(LogKeys.IndexJS, "listen", "CPL web at port:", port);
})

async function PublishDatabaseChangesProduction(databaseFile) {
    await PublishDatabaseChanges(
        databaseFile,
        true,
        app_repo_branch_production,
        DatabaseKeys.RepositoryDirectoryName,
        expo_prod_channel);
}

async function PublishDatabaseChangesTest(databaseFile, repoBranch, expoTestChannel) {
    await PublishDatabaseChanges(
        databaseFile,
        false,
        repoBranch,
        DatabaseKeys.RepositoryDirectoryNameTest,
        expoTestChannel);
}

async function PublishDatabaseChanges(
    databaseFile,
    backCurrentDatabase,
    appRepoBranch,
    repositoryDirectoryName,
    expoReleaseChannel) {
    await DeployManagerService.MoveDatabaseInsideProject(repositoryDirectoryName, databaseFile);
    if (backCurrentDatabase) {
        await DeployManagerService.BackUpDatabase(repositoryDirectoryName);
    }
    await DeployManagerService.UpdateAppRepository(repositoryDirectoryName, appRepoBranch);
    await DeployManagerService.DeployAppProject(expoReleaseChannel, repositoryDirectoryName, expo_user, expo_pass, expo_send);
}