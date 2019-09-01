var process = require('process'),
    yargs = require('yargs'),
    Table = require('cli-table3'),
    colors = require('colors'),
    request = require('./request.js');

const endpoints = {
    production: 'https://app.testissimo.io',
    dev: 'http://app-dev.testissimo.io:8080'
};

var apiEndpoint = endpoints.production;
var runStatusCheckInterval = 10 * 1000; // every 15 seconds will check run status

// https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/
var argv = yargs
    // // Command method is used to add commands, their description and options which are specific to these commands only, like in the above code lyr is the command and -y is lyr specific option: node myapp.js lyr -y 2016
    // .command('run', 'Trigger and watch state of headless run in Testissimo cloud', {
    //     id: {
    //         description: 'the id of test run definition',
    //         // alias: 'y',
    //         type: 'string',
    //     }
    // })
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1)
    .command('run', 'trigger and watch state of headless run', (yargs) => {
        yargs
        .option('headless-id', {
            describe: 'id of headless run defined in testissimo client',
            type: 'string'
        })
        .demandOption('headless-id', 'must specify ID of headless run, e.g. run --headless-id=[run_id]');
    }, (argv) => {
        if(argv.devEndpoint) apiEndpoint = endpoints.dev;
        triggerRun(argv.headlessId);
    })
    // Option method is used to add global options(flags) which can be accessed by all commands or without any command.
    .option('dev-endpoint', {
        // alias: 'd',
        description: 'use Testissimo development endpoints (e.g. https://app-dev.testissimo.io:8443)',
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .argv;


// test running flow
// 1. trigger run with run definition ID - get run instance ID
// 2. repeat getting run status by requesting runs with run ID
// 3. if run is done, status service will return whole run json
// 4. pretty print output
// 5. exit with appropriate exit code

function triggerRun(runDefId){
    request.get(apiEndpoint + '/headless/' +runDefId+ '/trigger/', (err, resData, status) => {
        if(err || status !== 200) {
            if(status === 404) return runFailed('Run definition "' +runDefId+ '" does not exists', err);
            else return runFailed('Triggering run "' +runDefId+ '" failed', err);
        }

        var runInstanceIds = resData.data || [];
        if(runInstanceIds.length === 0) return runFailed('Triggering run "' +runDefId+ '" failed, no instances created');

        var finishedRunsCount = 0, runInfos = [];

        console.log('\n');
        runInstanceIds.forEach((runInstanceId) => {
            runProgress(runInstanceId, 'QUEUED'.blue);
            checkRunStatus(runInstanceId, (runInfo) => {
                runInfos.push(runInfo);
                finishedRunsCount++;
                if(finishedRunsCount === runInstanceIds.length) allRunsEnded(runInfos);
            });
        });
    });
}

function checkRunStatus(runInstanceId, cb, lastStatus){
    setTimeout(() => {
        request.get(apiEndpoint + '/reports/runs/' +runInstanceId, (err, resData, status) => {
            if(err || status !== 200) {
                return runFailed('Checking run instance "' +runInstanceId+ '" status failed', err || status);
            }

            var runInfo = resData.data;

            if(runInfo.finished) {
                runProgress(runInstanceId, runInfo.hasError ? 'ENDED'.red : 'ENDED'.green);
                return cb(runInfo);
            }

            lastStatus = lastStatus || 'QUEUED'.blue;
            var currStatus;
            if(runInfo.scheduled) currStatus = 'SCHEDULED'.blue;
            if(runInfo.started) currStatus = 'STARTED'.blue;
            if(runInfo.started && Object.keys(runInfo.tests || {}).length > 0) {
                currStatus = ('RUNNING '.cyan + getLastTestPathString(runInfo.tests).grey );
            }

            if(currStatus && (currStatus !== lastStatus)) runProgress(runInstanceId, currStatus);
            lastStatus = currStatus || lastStatus;

            checkRunStatus(runInstanceId, cb, lastStatus);
        });
    }, runStatusCheckInterval);
}

function runProgress(runInstanceId, progressMsg){
    var dateTime = toDateTimeString(new Date().toString());
    console.log(toFixedLength(dateTime, 21).grey + toFixedLength(runInstanceId, 12) + '.............. '.grey + progressMsg);
}

function runFailed(reason, err){
    console.error(reason.red);
    if(err) console.error(err);
    return process.exit(1);
}

function allRunsEnded(runInfos){

    runInfos.forEach(runInfo => {
        var table = new Table();

        table.push([ 'Suite'.bold, 'Test'.bold, 'Started'.bold, 'Ended'.bold, 'Duration'.bold, 'Status'.bold ]);

        orderRunTests(runInfo.tests).forEach(test => {
            table.push([ test.suitePath, test.name, test.start, test.end, test.duration, test.state ]);
        });
        
        console.log('\n');
        console.log('Results of run "'+runInfo.id+'" on ' + runInfo.browser + ' (' + runInfo.screenWidth + 'x' + runInfo.screenHeight + ')');
        console.log('More info and recordings here: ' + (apiEndpoint + '/reports/'+runInfo.runDefId+'/'+runInfo.id).underline);
        console.log(table.toString());
        console.log('\n');
    });

    // console.log('ALL DONE'.green);
}

/*
 * HELPERS
 */

function toFixedLength(str, len, replaceChar){
    if(str.length < len) return str + Array(len - str.length).join(replaceChar || ' ');
    else return str;
}

function toDateString(date){
    return date ? new Date(date).toLocaleDateString('de-DE') : '';
}

function toDateTimeString(date){
    return date ? new Date(date).toLocaleString('de-DE') : '';
}

function toTimeString(date){
    return date ? new Date(date).toLocaleTimeString('de-DE') : '';
}

function getLastTestPathString(testsObj){
    var sortedTests = Object.keys(testsObj).map(testPathKey => testsObj[ testPathKey] );

    sortedTests.sort((a,b) => {
        // a is still running while b not
        if(!a.finished && b.finished) return -1;
        
        // b is still running while a not
        else if(a.finished && !b.finished) return 1;

        // a starts later
        else if(a.startTS > b.startTS) return -1;

        // b starts later
        else if(a.startTS < b.startTS) return 1;

        // cannot decide, keep order
        else return 0;
    });

    return sortedTests[0].path.map(p => p.resId + '@' + (p.line+1)).join(' / ');
}

function toFixedChars(num, charsCount){
    var nullsToPrepend = charsCount - (num + '').length;
    return nullsToPrepend > 0 ? new Array(nullsToPrepend + 1).join('0') + num : num;
}

function orderRunTests(testsObj){
    var tests = [];

    for(var pathKey in testsObj){
        var test = testsObj[pathKey];
        var resId = test.path[ test.path.length - 1 ].resId;
        var suitePath = [];
        var sortKey = [];

        test.path.forEach(function(item){
            sortKey.push( toFixedChars(item.line, 5) );
            suitePath.push( item.resId.slice(10) );
        });

        suitePath.pop();

        test.name = resId.slice(5);
        test.suitePath = suitePath.join(' / ');
        test.sortKey = sortKey.join('-');
        test.state = getRunTestState(test);
        test.duration = getRunDuration(test.startTS, test.endTS);
        test.start = toTimeString(test.startTS);
        test.end = test.finished ? toTimeString(test.endTS) : '';
        tests.push(test);
    }

    tests.sort(function(a,b){
        if(a.sortKey < b.sortKey) return -1;
        else if(a.sortKey > b.sortKey) return 1;
        else return 0;
    });
    
    return tests;
}

function getRunTestState(test){
    if(test.finished && !test.error && !test.failed) return 'passed'.green;
    else if(test.failed || test.error) return 'failed'.red;
    else if(!test.finished) {
        if(new Date().getTime() >= this.run.timeoutTS) return 'timeouted'.yellow;
        else return 'running'.blue;
    }
}

function getRunDuration(start, end){
    if(!start || !end) return '';
    start = new Date(start);
    end = new Date(end);
    var duration = new Date(end.getTime() - start.getTime());

    return  toFixedChars( (duration.getHours()-1)*60 + duration.getMinutes(), 2) +
            ':' +
            toFixedChars( duration.getSeconds(), 2 ) + 
            '.' +
            toFixedChars( Math.round(duration.getMilliseconds() / 10), 2 );
}