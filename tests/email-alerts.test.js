const test = require('node:test');
const assert = require('node:assert/strict');

test('email is disabled without configuration and rejects partial credentials', async () => {
  const {createEmailAlerts} = await import('../scripts/email-alerts.mjs');
  assert.equal(createEmailAlerts({}), null);
  assert.throws(() => createEmailAlerts({SMTP_USER:'sender@gmail.com'}));
});

test('alerts use TLS, configured recipient and failure/recovery subjects', async () => {
  const {createEmailAlerts} = await import('../scripts/email-alerts.mjs');
  const messages=[];
  const send=createEmailAlerts({SMTP_USER:'sender@gmail.com',SMTP_APP_PASSWORD:'abcd efgh',ALERT_EMAIL_TO:'owner@example.com'}, options => {
    assert.equal(options.secure,true);
    assert.equal(options.host,'smtp.gmail.com');
    assert.equal(options.auth.pass,'abcdefgh');
    return {sendMail:async message=>messages.push(message)};
  });
  await send({ok:false,time:'2026-11-19T00:00:00Z'});
  await send({ok:true,time:'2026-11-19T00:01:00Z'});
  assert.match(messages[0].subject,/unhealthy/);
  assert.match(messages[1].subject,/recovered/);
  assert.equal(messages[0].to,'owner@example.com');
});

test('delivery failure is propagated to the monitor', async () => {
  const {createEmailAlerts} = await import('../scripts/email-alerts.mjs');
  const send=createEmailAlerts({SMTP_USER:'sender@gmail.com',SMTP_APP_PASSWORD:'secret',ALERT_EMAIL_TO:'owner@example.com'},()=>({sendMail:async()=>{throw new Error('SMTP unavailable')}}));
  await assert.rejects(send({ok:false,time:'now'}),/SMTP unavailable/);
});
