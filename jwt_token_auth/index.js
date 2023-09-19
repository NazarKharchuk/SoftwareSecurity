const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

const SECRET_KEY = 'My_super_secret_key';
const EXPIRE_TIME = '60s';

app.use((req, res, next) => {
    let current_user = {};
    let jwt_token = req.get(SESSION_KEY);

    if (jwt_token) {
        console.log('JWT token:', jwt_token);
        try {
            const decoded_token = jwt.verify(jwt_token, SECRET_KEY);
            current_user = { username: decoded_token.username };
        } catch (error) {
            console.error('Invalid JWT token:', error.message);
        }
    }

    req.user = current_user;

    next();
});

app.get('/', (req, res) => {
    if (req.user.username) {
        return res.json({
            username: req.user.username
        })
    }
    res.sendFile(path.join(__dirname + '/index.html'));
})

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
]

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    const user = users.find((user) => {
        if (user.login == login && user.password == password) {
            return true;
        }
        return false
    });

    if (user) {
        const payload = {
            login: user.login,
            username: user.username,
        };

        const jwt_token = jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRE_TIME });

        res.json({ token: jwt_token });
    }

    res.status(401).send();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
