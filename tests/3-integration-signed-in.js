'use strict';
import { extractCSRF } from './helpers/integration-helpers-es5';
import { getModels } from './helpers/model-helpers-es5';
import request from 'supertest-as-promised';
import test from 'ava';

process.env.NODE_APP_INSTANCE = 'testing-3';
const dbFixture = require('./fixtures/db-fixture-es5');

test.before(async() => {
  await dbFixture.bootstrap(getModels());
  // Initialize once so sessions table is created if needed
  let getApp = require('../app');
  await getApp();
});

test.beforeEach(async t => {
  // Ensure we initialize from scratch
  Reflect.deleteProperty(require.cache, require.resolve('../app'));
  let getApp = require('../app');
  t.context.app = await getApp();
  t.context.agent = request.agent(t.context.app);
});

test(`We can register an account via the form (captcha disabled)`, async t => {
  let registerResponse = await t.context.agent.get('/register');
  let csrf = extractCSRF(registerResponse.text);
  if (!csrf)
    return t.fail('Could not obtain CSRF token');

  let postResponse = await t.context.agent
    .post('/register')
    .type('form')
    .send({
      _csrf: csrf,
      username: 'A friend of many GNUs',
      password: 'toGNUornottoGNU',
    })
    .expect(302)
    .expect('location', '/');

  await t.context.agent
    .get(postResponse.headers.location)
    .expect(200)
    .expect(/Thank you for registering a lib.reviews account, A friend of many GNUs!/);

});

test.after.always(async() => {
  await dbFixture.cleanup();
});
