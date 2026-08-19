const express = require('express');

const router = express.Router();

router.get('/forgot', (req, res, next) => res.status(400).send('Password reset is not currently supported.'));

router.post('/forgot', (req, res, next) => res.status(400).send('Password reset is not currently supported.'));

router.get('/forgot/:reset_token', (req, res, next) => res.status(400).send('Password reset is not currently supported.'));

router.post('/forgot/:reset_token', (req, res, next) => res.status(400).send('Password reset is not currently supported.'));

module.exports = router;
