// Show contacts form
//

'use strict';


module.exports = function (N, apiPath) {
  N.validate(apiPath, {});


  // Fill page meta
  //
  N.wire.on(apiPath, function fill_page_head(env) {
    env.res.head.title = env.t('title');
  });


  // Fill breadcrumbs
  //
  N.wire.after(apiPath, function fill_breadcrumbs(env) {
    env.data.breadcrumbs = env.data.breadcrumbs || [];

    env.data.breadcrumbs.push({
      text:  env.t('@rcd-nodeca.contacts.title'),
      route: 'rcd-nodeca.contacts'
    });

    /*env.data.breadcrumbs.push({
      text:  env.t('title')
    });*/

    env.res.breadcrumbs = env.data.breadcrumbs;
  });
};
