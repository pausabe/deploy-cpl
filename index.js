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
const expo_publish_channel = process.env.EXPO_PUBLISH_CHANNEL;

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

    res.download(
      __dirname + '/cpl-app/src/Assets/db/cpl-app.db', 
      (error) => res.send('Actualment no hi ha cap base de dades actualment'));

  } catch (error) {
    res.send('Something went wrong: ' + error);
  }
});

app.post('/upload', async (req, res) => {
  try {
    if(!req.files) {
      res.send('Error: cap base de dades introduïda');
    } 
    else {

      // Retreive database file
      let db_file = req.files.db_file;
      
      // Use the mv() method to place the file in upload directory
      db_file.mv('./cpl-app/src/Assets/db/cpl-app.db');

      // Run deploy script
      shell.exec(
        `sh deploy-cpl.sh ${expo_user} ${expo_pass} ${expo_send} ${expo_publish_channel}`, 
        async (err, stdout, stderr) => {
          res.send('Publicació realitzada correctament');
        });

    }
  } 
  catch (err) {
    res.status(500).send(err);
  }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
