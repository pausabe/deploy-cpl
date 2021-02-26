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
      __dirname + '/cpl-app/src/Assets/db/cpl-app.db');

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
      
      // Use the mv() method to place the file in upload directory
      db_file.mv('./cpl-app/src/Assets/db/cpl-app.db');

      console.log(`channel: ${expo_prod_channel}`)

      // Run deploy script
      shell.exec(
        `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${expo_prod_channel}`, 
        async (err, stdout, stderr) => {
          console.log("upload: Publicació realitzada correctament");
          res.send('Publicació realitzada correctament');
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
      let db_file = req.files.db_file;
      
      // Use the mv() method to place the file in upload directory
      db_file.mv('./cpl-app/src/Assets/db/cpl-app.db');

      console.log(`channel: ${expo_test_channel}`)

      // Run deploy script
      shell.exec(
        `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${expo_test_channel}`, 
        async (err, stdout, stderr) => {
          console.log("upload: Publicació realitzada correctament");
          res.send('Publicació realitzada correctament');
        });

    }
  } 
  catch (err) {
    console.log("upload error", err);
    res.status(500).send(err);
  }
});

app.listen(port, () => {
    console.log(`CPL web at port ${port}`);
})
