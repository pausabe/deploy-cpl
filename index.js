const ScriptGeneratorService = require("./Services/ScriptGeneratorService.js");
const DatabaseKeys = require("./Services/DatabaseKeys");
const FileSystemService = require("./Services/FileSystemService");

const fs = require("fs");
const basicAuth = require('express-basic-auth');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const shell = require('child_process');

const port = 3000;

const cpl_user = process.env.CPL_USER;
const cpl_pass = process.env.CPL_PASS;
const expo_user = process.env.EXPO_USER;
const expo_pass = process.env.EXPO_PASS;
const expo_send = process.env.EXPO_SEND;
const expo_test_channel = process.env.EXPO_TEST_CHANNEL;
const expo_prod_channel = process.env.EXPO_PROD_CHANNEL;

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

      // Backup the current saved database
      let today = new Date();
      let backup_name = today.getMonth().toString() + today.getDay().toString() + today.getFullYear().toString() + "_" + DatabaseKeys.DatabaseName;
      await FileSystemService.MoveFile(DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName, DatabaseKeys.DatabaseBackupDirectory + backup_name);
      
      // Save the uploaded database
      await req.files.db_file.mv(DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName);
  
      // Generate script of all changes made
      let jsonScript = await ScriptGeneratorService.GenerateJsonScript(0);

      // Save the script in a new file iniside the project
      await FileSystemService.WriteStringInFile(DatabaseKeys.ScriptsPath, JSON.stringify(jsonScript));

      // Run deploy script
      //TODO pull cpl-app project before (to get the latest app versionion)
      let current_app_version = GetCurrentAppVersion();
      let channel_name = expo_prod_channel + "_" + current_app_version;
      console.log(`channel: ${channel_name}`);
      res.send('Publicació realitzada correctament'); // TODO: delete me
      /*shell.exec(
        `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${channel_name}`, 
        async (err, stdout, stderr) => {
          console.log("upload: Publicació realitzada correctament");
          res.send('Publicació realitzada correctament');
        });*/
    }
  } 
  catch (err) {
    console.log("upload error", err);
    res.status(500).send(err);
  }
});

function GetCurrentAppVersion(){
  let appConfigFilePath = "./cpl-app/app.json";
  let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
  let appConfigFileContentJson = JSON.parse(appConfigFileContentString);
  let appVersionRaw = appConfigFileContentJson.expo.version;
  let appVersionRawArray = appVersionRaw.split(".");
  let appVersion = appVersionRawArray[0] + "." + appVersionRawArray[1];
  return appVersion;
}

app.post('/uploadTest', async (req, res) => {
  try {
    console.log("upload-test");
    if(!req.files) {
      console.log("upload: cap base de dades introduïda");
      res.send('Error: cap base de dades introduïda');
    } 
    else {
      //TODO:
    }
  } 
  catch (err) {
    console.log("upload error", err);
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
      // Retreive database version
      let databaseVersion = req.body.databaseVersion;
      console.log("databaseVersion", databaseVersion);

      // Get script
      let jsonScript = await ScriptGeneratorService.GenerateJsonScript(databaseVersion);

      // Show script json
      res.send(jsonScript);
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
