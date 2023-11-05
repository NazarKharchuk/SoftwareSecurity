const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

const MY_DOMAIN = 'dev-sayk782uxiasmtdz.us.auth0.com';
const MY_CLIENT_ID = 'cS6lWiWjXnDYYMFk8qhYUxc6g3ZXQ2T0';
const MY_CLIENT_SECRET = '9z5iq-IFxPvUqw_iP9Jw_t8Byjc4AZkIV3qyjevVbXX4bWpahg5f3D5QXz3huxC3';

const client = jwksClient({
    jwksUri: `https://${MY_DOMAIN}/.well-known/jwks.json`,
});

const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
};

app.use((req, res, next) => {
    if (req.path === '/api/token/refresh') {
        return next();
    }
    if (req.path === '/api/verify-token') {
        return next();
    }

    let access_token = req.get(SESSION_KEY);
    console.log("token: " + access_token);

    if (access_token !== undefined) {
        jwt.verify(access_token, getKey, (err, decoded) => {
            if (err) {
                if (err instanceof jwt.TokenExpiredError) {
                    return res.status(426).json({ message: 'Токен закінчився' });
                } else {
                    return res.status(401).json({ message: 'Неправильний токен' });
                }
            }

            const currentTime = Math.floor(Date.now() / 1000);
            console.log("Time: " + (decoded.exp - currentTime));
            if (decoded.exp - currentTime <= 30) {
                return res.status(426).json({ message: 'Токен близький до закінчення' });
            }
            console.log(decoded);
            req.user = { userID: decoded.sub };
            next();
        });
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    if (req.user) {
        return res.json({
            userID: req.user.userID,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    axios
        .post(`https://${MY_DOMAIN}/oauth/token`, {
            grant_type: 'password',
            username: login,
            password: password,
            audience: `https://${MY_DOMAIN}/api/v2/`,
            client_id: MY_CLIENT_ID,
            client_secret: MY_CLIENT_SECRET,
            scope: 'offline_access'
        })
        .then((response) => {
            const accessToken = response.data.access_token;
            const refreshToken = response.data.refresh_token;
            console.log('Access Token:', accessToken);
            console.log('Refresh Token:', refreshToken);

            res.json({ access_token: accessToken, refresh_token: refreshToken }).send();
        })
        .catch((error) => {
            res.status(401).send();
        });
});

app.post('/api/token/refresh', (req, res) => {
    const { refresh_token } = req.body;

    axios
        .post(`https://${MY_DOMAIN}/oauth/token`, {
            grant_type: 'refresh_token',
            refresh_token,
            client_id: MY_CLIENT_ID,
            client_secret: MY_CLIENT_SECRET,
        })
        .then((response) => {
            const access_token = response.data.access_token;

            console.log(`New access_token: ${access_token};`);

            res.json({ access_token }).send();
        })
        .catch((error) => {
            res.status(401).send();
        });
});

app.post('/api/register', (req, res) => {
    const { login, password } = req.body;

    var token;

    axios
        .post(`https://${MY_DOMAIN}/oauth/token`, {
            grant_type: 'client_credentials',
            audience: `https://${MY_DOMAIN}/api/v2/`,
            client_id: MY_CLIENT_ID,
            client_secret: MY_CLIENT_SECRET
        })
        .then((response) => {
            token = response.data.access_token;

            axios
                .post(`https://${MY_DOMAIN}/api/v2/users`, {
                    email: login,
                    password: password,
                    connection: "Username-Password-Authentication"
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then((response) => {
                    res.status(201).send();
                })
                .catch((error) => {
                    console.log(error);
                    res.status(401).json({ message: error.message });
                });
        })
        .catch((error) => {
            console.log(error);
        });
});

const checkJwt = auth({
    audience: `https://${MY_DOMAIN}/api/v2/`,
    issuerBaseURL: `https://${MY_DOMAIN}`,
});

app.get('/api/verify-token', checkJwt, (req, res) => {
    res.json({ result: req.auth });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
