var util = require('util'),
		Client = require('./client');


var Report = function(username, sharedSecret, environment, options){
	this.init.apply(this,arguments);
}
util.inherits(Report, Client);

var p = Report.prototype;

/* We need a little bit different functionality for the Report request
 * We need to poll Omniture to see if our report has been generated and then
 * get the full report.
 * We're going to use the call back from Client.request to poll set off the polling
 */
p.clientRequest = Client.prototype.request;
p.request = function(method, parameters, callback){
	var self = this;
	this.clientRequest(method, parameters, function(err, data){
		if(err){ callback(new Error(err.message)); }
		if(data.status == 'queued'){
			self.getQueuedReport(data.reportID, callback);
		}else{
			console.log(data);
			callback(new Error(data.status+': '+data.statusMsg))
		}
	});
}
p.getQueuedReport = function(reportId, callback){
	console.log('Getting Queued Report');
	var self = this, // alias "this" for anonymous functions
			reportData = {"reportID": reportId};
	
	// we're checking the status of the report
	this.sendRequest('Report.GetStatus', reportData, function(err,data){
		if(err){ 
			callback(err, data); 
		}else{
			var json = JSON.parse(data)
		
			// if the status is done or ready, then we can finally make the call
			// to get the actual data we want
			if(json.status == 'done'){
				// let's get the data we want
				self.getReport(reportId, callback);
			}else if(json.status == 'failed'){
				// the report failed for some reason throw an error
				callback(new Error(json.status+": "+json.error_msg))
			}else{
				console.log('Report '+ reportId +' not ready yet');
				// if the report isn't done yet, let's wait
				// and try again.
				setTimeout(function(){
					console.log('Checking report '+reportId+ 'status');
					self.getQueuedReport(reportId, callback);
				}, self.waitTime * 1000); // convert seconds to miliseconds
			}	
		}
	});

}

p.getReport = function(reportId, callback){
	var reportData = {'reportID' : reportId};
	console.log('Getting Report: '+ reportId);
	// make request for data
	this.sendRequest('Report.GetReport', reportData, callback);
}

module.exports = Report;