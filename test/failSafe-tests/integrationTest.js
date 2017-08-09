var request = require('request');
var async = require('async');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');
var exec = require('child_process').exec;

var APP_IMAGE_NAME = process.env.APP_IMAGE_NAME;
var  DOMAIN_NAME = process.env.DOMAIN_NAME;

//var baseurl = "https://$EVFURL/api/";
//var baseurl = "https://mayademo.oecloud.local/api/";
var baseurl = "https://" + APP_IMAGE_NAME + "." + DOMAIN_NAME + "/api/";

var modelPlural = 'Notes';
var EventHistoryModel;

var createLoginData = {"username":"admin","password":"admin","email":"ev_admin@edgeverve.com"};

var loginData = {"username":"admin","password":"admin"};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var token;

describe(chalk.blue('Failsafe - integrationTest'), function() {
  
  before('login using admin', function fnLogin(done) {
    console.log('Base Url is ', baseurl);
    request.post(
      baseurl + "BaseUsers/login", {
        json: loginData
      },
      function(error, response, body) {
        if (error || body.error) {
          console.log("error:", error || body.error);
          done(error || body.error);
        } else {
          token = body.id;
          done();
        }
      });
  });

  before('create 50 note records', function fnLogin(done) {
    
  });

  var getServiceCount = () => {
    exec ("docker service ps " + SERVICE_NAME + " --format '{{json .ID}}' | wc -l", (err, stdout) => {
      if (err) console.log("Error in getServiceCount: " + err);
      return stdout;
    } )
  }

  var checkServiceCount = (x, cb) => {
    if (getServiceCount() != x){
      setTimeout(checkServiceCount, 1000);
    } else {
      cb();
    }
  }

  function getEventHistoryModel() {
    if (!EventHistoryModel) {
      EventHistoryModel = loopback.getModel('EventHistory');
    }
    return EventHistoryModel;
  }

  it('Recover - Default sceanrio', function (done) {
    const SERVICE_NAME = APP_IMAGE_NAME + "_web";
    async.series({
      scaleServiceCountUp: function(callback){
        // load 5 node servers
        exec("docker service scale " + SERVICE_NAME + "=5", (err, stdout) => {
          if (err) console.log("Error in func One: " + err);
          checkServiceCount(5, callback);  
        })
      },
      initiateNodes: function(callback) {
        // create multipel nodes
        console.log('create 50 note records');
        for (var i=0; i<100; i++){
          var createUrl = baseurl + modelPlural + "/" + i + "/" + '?access_token=' + token;
          request.post({
            url: createUrl,
            json: {},
            headers: {},
            method: 'POST'
          }, function (error, r, body) { });
        }
        callback();    
      },
      scaleServiceCountUp: function(callback){
        //scale down 3 nodes 
        exec("docker service scale " + SERVICE_NAME + "=5", (err, stdout) => {
          if (err) console.log("Error in func One: " + err);
          checkServiceCount(3, callback);  
        })
      }, 
      checkDeadNodesStatus: function (callback){
        // query event history model to verify nodes where recovered 
        eventHistoryModel = getEventHistoryModel();
        //eventHistoryModel.find
        callback();
      }
    }, function(err, results) {
        // results is now equal to: {one: 1, two: 2}
        done();
    });
  });
});