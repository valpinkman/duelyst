const express = require('express');
const expressJwt = require('express-jwt');
const {
  compose,
} = require('compose-middleware');
const t = require('tcomb-validation');
const validators = require('../validators');
const config = require('../../config/config');

/*
Any route that requires authentication can use this middleware
Middleware will validate JWT security and expiration
Then ensure both an ID and maybe(username) are present in the JWT payload
We can add additional checks to the JWT payload here
*/
module.exports = compose([
  expressJwt({
    algorithms: ['HS256'], // Will be passed to jsonwebtoken.verify().
    secret: config.get('firebase.legacyToken'),
  }),
  function (req, res, next) {
    const result = t.validate(req.user.d, validators.token);
    if (!result.isValid()) {
      return res.status(400).json(result.errors);
    } else {
      return next();
    }
  },
]);
