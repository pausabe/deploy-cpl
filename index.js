const DeployManagerService = require("./Services/DeployManagerService");
const DatabaseKeys = require("./Services/DatabaseKeys");
const Logger = require("./Utils/Logger")

const fs = require("fs");
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');

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

// Protección contra ataques de fuerza bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos por ventana
    message: 'Demasiados intentos de login. Por favor, espera 15 minutos antes de volver a intentarlo.',
    standardHeaders: true,
    legacyHeaders: false,
    // Bloquear basado en IP
    keyGenerator: (req) => {
        return req.ip;
    },
    // Handler para registrar intentos bloqueados
    handler: (req, res) => {
        Logger.LogError(Logger.LogKeys.IndexJS, "RateLimiter", `Demasiados intentos de login desde IP: ${req.ip}`);
        res.status(429).send('Demasiados intentos de login. Por favor, espera 15 minutos antes de volver a intentarlo.');
    }
});

app.use(loginLimiter);
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
        Logger.Log(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", "Starting Download");
        res.download(
            `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`);
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", err);
        res.send('Something went wrong: ' + err);
    }
});

app.post('/PublishProduction', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Starting Release in production");
        if (!req.files) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "PublishProduction: cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else {
            await PublishDatabaseChangesProduction(req.files.db_file);
            Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "PublishProduction", err);
        res.status(500).send(err);
    }
});

app.post('/PublishTest', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "Starting Release in test");
        if (!req.files) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else if (!req.body.repobranch) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap repo introduït");
            res.send('Error: cap repo introduït');
        } else if (!req.body.releasechannel) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap channel introduït");
            res.send('Error: cap channel introduït');
        } else {
            await PublishDatabaseChangesTest(req.files.db_file, req.body.repobranch, req.body.releasechannel);
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "PublishTest", err);
        res.status(500).send(err);
    }
});

app.post('/UpdateProductionRepository', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "UpdateProductionRepository", "Update Production Repository");
        await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryName, app_repo_branch_production);
        Logger.Log(Logger.LogKeys.IndexJS, "UpdateProductionRepository", "Production repository updated correctly");
        res.send('Production repository updated correctly');
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "UpdateProductionRepository", err);
        res.status(500).send(err);
    }
});

app.listen(port, () => {
    Logger.Log(Logger.LogKeys.IndexJS, "listen", "CPL web at port:", port);
})

async function PublishDatabaseChangesProduction(databaseFile) {
    await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryName, databaseFile);
    await DeployManagerService.BackUpDatabase(DatabaseKeys.RepositoryDirectoryName);
    await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryName, app_repo_branch_production);
    let currentAppBuildNumber = GetCurrentAppBuildNumber(DatabaseKeys.RepositoryDirectoryName);
    let expoReleaseChannel = expo_prod_channel + "_" + currentAppBuildNumber;
    await DeployManagerService.DeployAppProject(expoReleaseChannel, DatabaseKeys.RepositoryDirectoryName, expo_user, expo_pass, expo_send);
}

async function PublishDatabaseChangesTest(databaseFile, repoBranch, expoTestChannel) {
    await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryNameTest, databaseFile);
    await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryNameTest, repoBranch);
    await DeployManagerService.DeployAppProject(expoTestChannel, DatabaseKeys.RepositoryDirectoryNameTest, expo_user, expo_pass, expo_send);
}

function GetCurrentAppBuildNumber(repositoryDirectoryName){
    let appConfigFilePath = `./${repositoryDirectoryName}/app.json`;
    let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
    let appConfigFileContentJson = JSON.parse(appConfigFileContentString.toString());
    return appConfigFileContentJson.expo.ios.buildNumber;
}