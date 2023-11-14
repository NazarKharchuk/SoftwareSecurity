const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const { auth } = require('express-openid-connect');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const MY_DOMAIN = 'dev-sayk782uxiasmtdz.us.auth0.com';
const MY_CLIENT_ID = 'cS6lWiWjXnDYYMFk8qhYUxc6g3ZXQ2T0';
const MY_CLIENT_SECRET = '9z5iq-IFxPvUqw_iP9Jw_t8Byjc4AZkIV3qyjevVbXX4bWpahg5f3D5QXz3huxC3';

app.use(auth({
    baseURL: `http://localhost:${port}`,
    clientID: MY_CLIENT_ID,
    secret: MY_CLIENT_SECRET,
    authRequired: true,
    auth0Logout: true,
    issuerBaseURL: `https://${MY_DOMAIN}`,
    logoutParams: {
        returnTo: `http://localhost:${port}/logout`,
    },
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/data', (req, res) => {
    if (req.oidc.isAuthenticated()) {
        res.json({
            userID: req.oidc.user.sub,
            logout: 'http://localhost:3000/logout'
        })
    } else {
        res.status(401).send();
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
