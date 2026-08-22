const express = require('express');
const { expressjwt } = require('express-jwt');
const { compose } = require('compose-middleware');
const t = require('tcomb-validation');
const validators = require('../validators');
const config = require('@duelyst/config');

/*
Any route that requires authentication can use this middleware
Middleware will validate JWT security and expiration
Then ensure both an ID and maybe(username) are present in the JWT payload
We can add additional checks to the JWT payload here
*/
module.exports = compose([
  expressjwt({
    algorithms: ['HS256'], // Will be passed to jsonwebtoken.verify().
    secret: config.get('firebase.legacyToken'),
    /*
     * express-jwt 7 renamed the property it attaches to the request from
     * `req.user` to `req.auth`. This codebase reads `req.user.d.id` in 149
     * places across the routes, so we keep the old name rather than churn
     * every route in a dependency bump - the two are the same object.
     */
    requestProperty: 'user',
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
