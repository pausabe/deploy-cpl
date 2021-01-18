const express = require('express')
const basicAuth = require('express-basic-auth')
const app = express()
const port = 3000
import { webCredentials } from './secrets.js'

app.use(basicAuth({
    challenge: true,
    users: { webCredentials }
}));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

