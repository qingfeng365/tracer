var fs = require('fs'), dateFormat = require('dateformat'), tinytim = require('tinytim'), utils = require('./utils'), spawn = require('child_process').spawn;
var path = require('path');

module.exports = function (conf) {
    var _conf = {
        root: '.',
        logPathFormat: '{{root}}/{{prefix}}.{{date}}.log',
        splitFormat: 'yyyymmdd',
        maxLogFiles: 10
    };

    _conf = utils.union(_conf, [conf]);

    function LogFile(prefix, date) {
        this.date = date;
        this.path = tinytim.tim(_conf.logPathFormat, {root: _conf.root, prefix: prefix, date: date});
        (function mkdirSync_p(dir) {
            if (fs.existsSync(dir)) return;
            mkdirSync_p(path.dirname(dir));
            fs.mkdirSync(dir);
        })(_conf.root);
        this.stream = fs.createWriteStream(this.path, {
            flags: "a",
            encoding: "utf8",
            mode: 0666
        });
    }

    LogFile.prototype.write = function (str) {
        this.stream.write(str + "\n");
    };

    LogFile.prototype.destroy = function () {
        if (this.stream) {
            this.stream.end();
            this.stream.destroySoon();
            this.stream = null;
        }
    };

    var _logMap = {};

    function _push2File(str, title) {
        var logFile = _logMap[title], now = dateFormat(new Date(), _conf.splitFormat);
        if (logFile && logFile.date != now) {
            logFile.destroy();
            logFile = null;
        }
        if (!logFile) {
            logFile = _logMap[title] = new LogFile(title, now);
            spawn('find', ['./', '-type', 'f', '-name', '*.log', '-mtime', '+' + _conf.maxLogFiles, '-exec', 'rm', '{}', '\;']);
        }
        logFile.write(str);
    }

    function dailyFileTransport(data) {
        _push2File(data.output, data.title);
    }

    if (conf.transport) {
        conf.transport = Array.isArray(conf.transport) ? conf.transport : [conf.transport];
        conf.transport.push(dailyFileTransport)
    } else {
        conf.transport = [dailyFileTransport];
    }
    return require('./color_console')(conf);
};