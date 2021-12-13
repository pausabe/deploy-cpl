const fs = require("fs");
const basicAuth = require('express-basic-auth');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const shell = require('child_process');
const sqlite3 = require('sqlite3').verbose();

const port = 3000;

const DatabaseDirectory = './database/';
const DatabaseBackupDirectory = '/database/'; // TODO: change -> '/opt/usb/'
const DatabaseName = 'cpl-app.db';
const ScriptsPath = "./cpl-app/src/Assets/db/test.json"; // TODO: change -> "./cpl-app/src/Assets/DatabaseUpdateScript/UpdateScript.json"

const cpl_user = process.env.CPL_USER;
const cpl_pass = process.env.CPL_PASS;
const expo_user = process.env.EXPO_USER;
const expo_pass = process.env.EXPO_PASS;
const expo_send = process.env.EXPO_SEND;
const expo_test_channel = process.env.EXPO_TEST_CHANNEL;
const expo_prod_channel = process.env.EXPO_PROD_CHANNEL;

let database;

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
      __dirname + DatabaseDirectory + DatabaseName);

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

      // Retreive database file
      let db_file = req.files.db_file;
      
      // Backup the current saved database
      try {
        // TODO: not working...
        if(fs.existsSync(DatabaseDirectory + DatabaseName)){
          let today = new Date();
          let backup_name = today.getMonth().toString() + today.getDay().toString() + today.getFullYear().toString() + "_" + DatabaseName;
          fs.renameSync(DatabaseDirectory + DatabaseName, DatabaseBackupDirectory + backup_name);
        }
      } catch (error) {
        console.log("Error writing the backup:", error);
      }

      // Save the uploaded database
      db_file.mv(DatabaseDirectory + DatabaseName, async () => {
  
        // Generate script of all changes made
        let jsonScript = await GenerateJsonScript(0);
  
        // Save the script in a new file iniside the project
        fs.writeFileSync(ScriptsPath, JSON.stringify(jsonScript));
  
        // Run deploy script
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
      });
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
    else {

      // Retreive database file
      /*let db_file = req.files.db_file;
      
      // Use the mv() method to place the file in upload directory
      db_file.mv('./cpl-app/src/Assets/db/cpl-app.db');*/

      // Run deploy script
      /*console.log(`channel: ${expo_test_channel}`)
      shell.exec(
        `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${expo_test_channel}`, 
        async (err, stdout, stderr) => {
          if(err == null){
            console.log("upload: Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
          }
          else{
            console.log("script execution error:", err);
            console.log("stdout:", stdout);
            console.log("stderr:", stderr);
            res.status(500).send(err);
          }
        });*/
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
      let jsonScript = await GenerateJsonScript(databaseVersion);

      // Show script json
      res.send(jsonScript);

    }
  } 
  catch (err) {
    console.log("script error", err);
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

async function GenerateJsonScript(minTablesLogId){
  console.log("generating json scripts");
  let scriptJson = [];

  // Get list of changes
  let sql = 'SELECT MAX(id) As id, table_name, row_id, action, COUNT(id) AS repeated_records\
            FROM _tables_log\
            WHERE id > ' + minTablesLogId + '\
            GROUP BY table_name, row_id, action\
            ORDER BY id ASC';
  let rows = await execQuery(sql);
  await asyncForEach(rows, async (row) => {
    console.log("script for " + row["table_name"] + " - " + row["row_id"] + "(" + row["action"] + ")");
    let repeated_records = row["repeated_records"];
    if(repeated_records == 1){
      let rowScriptJson = await JsonScriptFromRow(row, true);
      scriptJson.push(rowScriptJson);
    }
    else{
      // If there are 3 repeated records, the 2 firsts must have avoid to add the values to add less innecessary data
      for (let index = 0; index < repeated_records - 1; index++) {
        let fakeRowScriptJson = await JsonScriptFromRow(row, false);
        scriptJson.push(fakeRowScriptJson);
      }
      let rowScriptJson = await JsonScriptFromRow(row, true);
      scriptJson.push(rowScriptJson);
    }
  });

  // Close database connection
  database.close();

  return scriptJson;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function JsonScriptFromRow(row, addValues){
  /*
  input (row)
  {
    id: 4,
    table_name: 'tempsQuaresmaCendra',
    row_id: 1,
    action: 2,
    date: '2021-02-25 08:07:54'
    repeated_records: 1
  }
  output (script json)
  {
    id: 4,
    table_name: 'tempsQuaresmaCendra',
    row_id: 1,
    action: 2, 
    values: {},// <-- NEW (columns-values)
    date: '2021-02-25 08:07:54'
  }
  */
  let rowColumnNames = Object.keys(row);
  let scriptJsonRow = await getScriptJsonRow(rowColumnNames, row, addValues);
  return scriptJsonRow;
}

async function getScriptJsonRow(rowColumnNames, row, addValues){
  let scriptJsonRow = {};
  scriptJsonRow["values"] = {}
  await asyncForEach(rowColumnNames, async (rowColumnName) => {

    let rowValue = row[rowColumnName];

    // Add the same column & value
    scriptJsonRow[rowColumnName] = rowValue;

    // When Inserting (1) or Updating (2) we need to add the values
    if (addValues && rowColumnName == 'action' && (rowValue == 1 || rowValue == 2)){
      let table_name = row["table_name"];
      let row_id = row["row_id"];
      scriptJsonRow["values"] = await getScriptJsonRowValues(table_name, row_id);
    }
  });
  return scriptJsonRow;
}

async function getScriptJsonRowValues(table_name, row_id){
  let scriptJsonRowValues = {};
  if(row_id != ""){
    let sql = "SELECT * FROM " + table_name + " WHERE id = " + row_id;
    let queryRowsResult = await execQuery(sql);
    if (queryRowsResult.length == 1) {
      let columns = Object.keys(queryRowsResult[0]);
      let values = Object.values(queryRowsResult[0]);
      for (let index = 0; index < values.length; index++) {
        let column = columns[index];
        let value = values[index];
        if(column != "id"){
          //if(value.length > 10) value = value.substring(0,10); // just for testing
          scriptJsonRowValues[column] = value;
        }
      }
    }
  }
  return scriptJsonRowValues;
}

function execQuery(query){
  if(database == undefined){
    console.log("Opening database in: " + DatabaseDirectory + DatabaseName);
    database = new sqlite3.Database(DatabaseDirectory + DatabaseName);
  }
  return new Promise((resolve,reject) => {
    database.all(query, function(err,rows){
         if(err){ reject(err); }
         resolve(rows);
       });
  });
}

app.listen(port, () => {
    console.log(`CPL web at port ${port}`);
})
