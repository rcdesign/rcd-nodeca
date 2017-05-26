// Submit form handler
//

'use strict';

const _  = require('lodash');


module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    nick: { type: 'string', required: true }
  });


  // Check auth
  //
  N.wire.before(apiPath, function check_user_auth(env) {
    if (!env.user_info.is_member) throw N.io.FORBIDDEN;
  });


  // Create sandbox for form errors
  //
  N.wire.before(apiPath, function prepare_env_data(env) {
    env.data.errors = env.data.errors || {};
  });


  // Check nick formatting and uniqueness
  //
  N.wire.before(apiPath, async function check_nick(env) {
    let error;

    // Nick is checked twice:
    //  - on the client-side using users.auth.check_nick method
    //  - on the server-side here
    //
    // Hardcoded i18n paths from @users are here to make sure that
    // messages are the same for both cases.
    //
    if (!N.models.users.User.validateNick(env.params.nick)) {
      error = env.t('@users.auth.check_nick.message_invalid_nick');
    } else if (await N.models.users.User.similarExists(env.params.nick)) {
      error = env.t('@users.auth.check_nick.message_busy_nick');
    }

    if (error) env.data.errors.nick = error;
  });


  // If any of the previous checks failed, terminate with client error
  //
  N.wire.before(apiPath, function check_errors(env) {
    if (!_.isEmpty(env.data.errors)) {
      throw { code: N.io.CLIENT_ERROR, data: env.data.errors };
    }
  });


  // Send email to administration
  //
  N.wire.on(apiPath, async function send_email(env) {
    let general_project_name = await N.settings.get('general_project_name');
    let emails;

    if (!emails) emails = _.get(N.config, 'rcd-nodeca.contacts.nick_change.email');
    if (!emails) emails = _.get(N.config, 'rcd-nodeca.contacts_default_email');
    if (!emails) emails = [];

    if (!Array.isArray(emails)) emails = [ emails ];

    let subject = env.t('email_subject', {
      project_name: general_project_name,
      username: env.user_info.user_name
    });

    let text = env.t('email_text', {
      name:     env.user_info.user_name,
      profile:  N.router.linkTo('users.member', { user_hid: env.user_info.user_hid }),
      nick:     env.params.nick
    });

    let from_name  = env.user_info.user_name;
    let from_email = (await N.models.users.User.findById(env.user_info.user_id)).email;

    let replyTo = `"${from_name}" <${from_email}>`;

    for (let email of emails) {
      await N.mailer.send({
        to: email,
        subject,
        text,
        replyTo
      });
    }
  });
};
