const ScriptGeneratorService = require("./Services/ScriptGeneratorService");
const DeployManagerService = require("./Services/DeployManagerService");
const DatabaseKeys = require("./Services/DatabaseKeys");
const UpdateDatabaseService = require("./Services/UpdateDatabaseService")

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

var webCredentials = {};
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

app.get('/download', function(req, res){
  try {
    console.log("download");
    res.download(
      __dirname + DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName);
  } catch (error) {
    console.log("download error", error);
    res.send('Something went wrong: ' + error);
  }
});

app.post('/upload', async (req, res) => {
  try {
    console.log("upload");
    if(!req.files) {
      console.log("upload: cap base de dades introduïda");
      res.send('Error: cap base de dades introduïda');
    } 
    else {
      await PublishDatabaseChangesProduction(req.files.db_file);
      console.log("upload: Publicació realitzada correctament");
      res.send('Publicació realitzada correctament');
    }
  } 
  catch (err) {
    console.log("upload error", err);
    res.status(500).send(err);
  }
});

app.post('/uploadTest', async (req, res) => {
  try {
    console.log("upload-test");
    if(!req.files) {
      console.log("upload: cap base de dades introduïda");
      res.send('Error: cap base de dades introduïda');
    } 
    else if(!req.body.repobranch) {
      console.log("upload: cap repo introduït");
      res.send('Error: cap repo introduït');
    }
    else if(!req.body.releasechannel) {
      console.log("upload: cap channel introduït");
      res.send('Error: cap channel introduït');
    }
    else{
      DatabaseKeys.DatabaseDirectory = DatabaseKeys.DatabaseDirectoryTest;
      await PublishDatabaseChangesTest(req.files.db_file, req.body.repobranch, req.body.releasechannel);
      console.log("upload: Publicació realitzada correctament");
      res.send('Publicació realitzada correctament');
    }
  } 
  catch (err) {
    console.log("upload error", err);
    res.status(500).send(err);
  }
});

app.post('/UpdateDatabase', async (req, res) => {
  try {
    console.log("UpdateDatabase");
    await UpdateDatabaseService.UpdateDatabase();
    console.log("Updated correctly");
    res.send("Updated correctly");
  } 
  catch (err) {
    console.log("update database error", err);
    res.status(500).send(err);
  }
});

app.post('/getScript', async (req, res) => {
  try {
    console.log("get-script");

    if(!req.body.databaseVersion) {
      console.log("Script: cap valor introduït");
      res.send('Error: cap valor introduït');
    }
    else {
      res.send(await ScriptGeneratorService.GenerateJsonScript(req.body.databaseVersion));
    }
  } 
  catch (err) {
    console.log("script error", err);
    res.status(500).send(err);
  }
});

app.listen(port, () => {
    console.log(`CPL web at port ${port}`);
})

async function PublishDatabaseChangesProduction(uploadedDatabase){
  await PublishDatabaseChanges(
    uploadedDatabase,
    true,
    app_repo_branch_production,
    expo_prod_channel);
}

async function PublishDatabaseChangesTest(uploadedDatabase, repoBranch, otaChannel){
  await PublishDatabaseChanges(
      uploadedDatabase,
      false,
      repoBranch,
      otaChannel);
}

async function PublishDatabaseChanges(
  uploadedDatabase,
  backCurrentDatabase,
  appRepoBranch,
  expoReleaseChannel){
    if(backCurrentDatabase){
      await DeployManagerService.BackUpCurrentDatabase();
    }
    await DeployManagerService.SaveUploadedDatabase(uploadedDatabase);
    await DeployManagerService.UpdateAppRepository(appRepoBranch);
    await DeployManagerService.GenerateChangesScriptIntoAppProject();
    await DeployManagerService.DeployAppProject(expoReleaseChannel, expo_user, expo_pass, expo_send);
}