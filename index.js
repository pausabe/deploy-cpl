const fs = require("fs");
const express = require('express');
const basicAuth = require('express-basic-auth');
const app = express();
const port = 3000;

const user = process.env.CPL_USER;
const pass = process.env.CPL_PASS;

console.log(user, pass);

var webCredentials = {};
webCredentials[user] = pass;

app.use(basicAuth({
    challenge: true,
    users: webCredentials
}));

app.get('/', (req, res) => {
    //res.send('Hello World!');
    fs.readFile("index.html", 'utf8', (err, data) => {
        if (err) {
            res.send("Unable to load index.html");
            return;
        }
        res.send(data);
    });
})

app.post('/upload', (req, res) => {
    console.log("Fchero subido!!");
    console.log(req.files);
    res.send("Hemos recibido tu ficheroooo!!");
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
