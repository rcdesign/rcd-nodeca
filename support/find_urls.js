// Find urls within selected domain in posts
//

'use strict';


const _        = require('lodash');
const argparse = require('argparse');
const Promise  = require('bluebird');
const mongoose = require('mongoose');
const pump     = require('pump');
const stream   = require('stream');
const URL      = require('url');


let parser = new argparse.ArgumentParser();

parser.addArgument(
  [ '-d', '--db' ],
  {
    help: 'database name',
    defaultValue: 'nodeca'
  }
);

parser.addArgument(
  [ '-c', '--cutoff' ],
  {
    help: 'cutoff (days)',
    type: 'int'
  }
);

parser.addArgument(
  [ '-l', '--long' ],
  {
    help: 'hide short links (without query)',
    action: 'storeTrue'
  }
);

parser.addArgument(
  'domain',
  {
    help: 'domain name'
  }
);

let args = parser.parseArgs();


mongoose.Promise = Promise;

Promise.coroutine(function* () {
  yield mongoose.connect('mongodb://localhost/' + args.db);

  let Post = mongoose.model('forum.Post', new mongoose.Schema());

  let regexp_search = new RegExp('href="https?:\\/\\/[^\\/]*' + _.escapeRegExp(args.domain));

  let query = { html: regexp_search };

  if (args.cutoff) {
    let ts = Date.now() / 1000 - args.cutoff * 24 * 60 * 60;
    let min_objectid = new mongoose.Types.ObjectId(Math.floor(ts).toString(16) + '0000000000000000');

    query._id = { $gt: min_objectid };
  }

  yield Promise.fromCallback(callback => pump(
    Post.find(query).lean(true).cursor(),

    new stream.Writable({
      objectMode: true,
      write(post, encoding, callback) {
        let urls = post.html.match(/href="[^"]+"/g)
                     .map(href => _.unescape(href.replace(/^href="|"$/g, '')));

        urls.forEach(url => {
          let parsed = URL.parse(url, true, true);

          if (parsed.host && parsed.host.includes(args.domain)) {
            /* eslint-disable no-console */

            if (args.long) {
              if (Object.keys(parsed.query).length || parsed.hash) console.log(url, '\n');
            } else console.log(url, '\n');
          }
        });

        callback();
      }
    }),

    callback
  ));

  yield mongoose.disconnect();
})();
