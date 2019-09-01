var https = require('https'),
    http = require('http');

const MAX_REDIRECTS = 4;
const MAX_ATTEMPTS = 3;
const REPEAT_TIMEOUT = 2000; // wait 2 seconds between repeating request

module.exports = {
    get: function(url, cb, redirectCount, repeatCount){
        redirectCount = redirectCount || 0;
        repeatCount = repeatCount || 0;
        if(redirectCount === MAX_REDIRECTS) return cb(new Error('Max redirects count reached'));

        var agent = url.indexOf('https://') === 0 ? https : http;
        
        agent.get(url, resp => {
            let data = '';

            // follow redirect
            if(resp.statusCode === 301 || resp.statusCode === 302) {
                return this.get(resp.headers.location, cb, redirectCount+1, repeatCount);
            }

            resp.on('data', chunk => {
                data += chunk;
            });

            resp.on('end', () => {
                try {
                    data = JSON.parse(data);
                }
                catch(err){}

                cb(null, data, resp.statusCode, resp.headers);
            });

        }).on('error', err => {
            if(repeatCount === MAX_ATTEMPTS) return cb(err);
            else setTimeout(() => this.get(url, cb, redirectCount, repeatCount+1), REPEAT_TIMEOUT);
        });
    }
};