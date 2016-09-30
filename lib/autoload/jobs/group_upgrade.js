// Group upgrade
//
'use strict';


module.exports = function (N) {
  N.wire.on('init:jobs', function register_group_upgrade() {
    const task_name = 'group_upgrade';

    if (!N.config.cron || !N.config.cron[task_name]) {
      return new Error(`No config defined for cron task "${task_name}"`);
    }

    N.queue.registerWorker({
      name: task_name,
      cron: N.config.cron[task_name],
      * process() {
        try {
          yield N.wire.emit('internal:users.group_upgrade', {});
        } catch (err) {
          // don't propagate errors because we don't need automatic reloading
          N.logger.error('"%s" job error: %s', task_name, err.message || err);
        }
      }
    });
  });
};
