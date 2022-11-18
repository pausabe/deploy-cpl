const DeployManagerService = require("./Services/DeployManagerService");
const DatabaseKeys = require("./Services/DatabaseKeys");

const fs = require("fs");
const basicAuth = require('express-basic-auth');
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

app.get('/DownloadDatabaseFromProduction', function(req, res){
  try {
    console.log("DownloadDatabaseFromProduction");
    res.download(
      `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`);
  } catch (error) {
    console.log("DownloadDatabaseFromProduction error", error);
    res.send('Something went wrong: ' + error);
  }
});

app.post('/PublishProduction', async (req, res) => {
  try {
    console.log("PublishProduction");
    if(!req.files) {
      console.log("PublishProduction: cap base de dades introduïda");
      res.send('Error: cap base de dades introduïda');
    } 
    else {
      await PublishDatabaseChangesProduction(req.files.db_file);
      console.log("PublishProduction: Publicació realitzada correctament");
      res.send('Publicació realitzada correctament');
    }
  } 
  catch (err) {
    console.log("PublishProduction error", err);
    res.status(500).send(err);
  }
});

app.post('/PublishTest', async (req, res) => {
  try {
    console.log("PublishTest");
    if(!req.files) {
      console.log("PublishTest: cap base de dades introduïda");
      res.send('Error: cap base de dades introduïda');
    }
    else if(!req.body.repobranch) {
      console.log("PublishTest: cap repo introduït");
      res.send('Error: cap repo introduït');
    }
    else if(!req.body.releasechannel) {
      console.log("PublishTest: cap channel introduït");
      res.send('Error: cap channel introduït');
    }
    else{
      await PublishDatabaseChangesTest(req.files.db_file, req.body.repobranch, req.body.releasechannel);
      console.log("PublishTest: Publicació realitzada correctament");
      res.send('Publicació realitzada correctament');
    }
  }
  catch (err) {
    console.log("PublishTest error", err);
    res.status(500).send(err);
  }
});

app.listen(port, () => {
    console.log(`CPL web at port ${port}`);
})

async function PublishDatabaseChangesProduction(databaseFile){
  await PublishDatabaseChanges(
      databaseFile,
      true,
      app_repo_branch_production,
      DatabaseKeys.RepositoryDirectoryName,
      expo_prod_channel);
}

async function PublishDatabaseChangesTest(databaseFile, repoBranch, expoTestChannel){
  await PublishDatabaseChanges(
      databaseFile,
      true,
      repoBranch,
      DatabaseKeys.RepositoryDirectoryNameTest,
      expoTestChannel);
}

async function PublishDatabaseChanges(
    databaseFile,
    backCurrentDatabase,
    appRepoBranch,
    repositoryDirectoryName,
    expoReleaseChannel){
    await DeployManagerService.MoveDatabaseInsideProject(repositoryDirectoryName, databaseFile);
    if(backCurrentDatabase){
      await DeployManagerService.BackUpDatabase(repositoryDirectoryName);
    }
    await DeployManagerService.UpdateAppRepository(repositoryDirectoryName, appRepoBranch);
    await DeployManagerService.DeployAppProject(expoReleaseChannel, repositoryDirectoryName, expo_user, expo_pass, expo_send);
}