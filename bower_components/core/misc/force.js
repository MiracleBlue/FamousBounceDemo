/**
 * ABANDON ALL HOPE YE WHO ENTER HERE
 * THIS SET OF CODE MAY BE UNMAINTANABLE TO THOSE WHO DON'T ALREADY KNOW HOW IT WORKS
 *
 * Most of this stuff should be put into Apex controllers, if time permits.  We didn't get time,
 * so we weren't able to do it.  Sorry.
 *
 * Good luck (you'll need it)
 */


Date.prototype.addHours= function(h){
	this.setHours(this.getHours()+h);
	return this;
};

function handleError(e, done) {
	console.error(e);
	if (e.faultcode === "sf:INVALID_SESSION_ID") {
		//alert("Error: your SalesForce session has timed out or is invalid.  Please login to salesforce again.");
		console.log("Error: salesforce login invalid.  Error object:", e);
		localStorage.clear();
		//window.location.reload();
		if (done) done(true);
	}
	else if (e.faultcode === "sf:MALFORMED_QUERY") {
		console.log("Invalid query", e);
		if (done) done(true);
	}
	else {
		if (done) done(false);
	}
}
//did not getCorrectedDate on this as it is passed in
function toGMT(d) { return new Date(d.getTime() + d.getTimezoneOffset() * 60000) }

function formatDate(timestamp) {
	var nowDate = new Date(timestamp);
	var realMonth = nowDate.getMonth() + 1;
	return "" + nowDate.getFullYear() + "-" + (realMonth < 10 ? "0" + realMonth : realMonth) + "-" + (nowDate.getDay() < 10 ? "0" + nowDate.getDay() : nowDate.getDay());

}

function formatTime(timestamp) {
	var timestamp = new Date(timestamp);
	return "" + (timestamp.getHours() < 10 ? "0" + timestamp.getHours() : timestamp.getHours()) + ":"
	+ (timestamp.getMinutes() < 10 ? "0" + timestamp.getMinutes() : timestamp.getMinutes()) + ":"
	+ (timestamp.getSeconds() < 10 ? "0" + timestamp.getSeconds() : timestamp.getSeconds());
}

function getTotalMinutesFromTimestamp(timestamp) {
	return timestamp / (1000 * 60);
}

var PowerUpForce = function (userid) {
	function formatTimestamp(timestamp) {
		
		timestamp = new Date(timestamp);
		var realMonth = timestamp.getMonth() + 1;
		var newTimeStr =  timestamp.getFullYear() + "-"
			+ (realMonth < 10 ? "0" + realMonth : realMonth) + "-"
			+ (timestamp.getDate() < 10 ? "0" + timestamp.getDate() : timestamp.getDate()) + "T"
			+ (timestamp.getHours() < 10 ? "0" + timestamp.getHours() : timestamp.getHours()) + ":"
			+ (timestamp.getMinutes() < 10 ? "0" + timestamp.getMinutes() : timestamp.getMinutes()) + ":"
			+ (timestamp.getSeconds() < 10 ? "0" + timestamp.getSeconds() : timestamp.getSeconds());


		//alert(timestamp + " \n" +
		//		newTimeStr);
		return newTimeStr;
	}
	//var userid;
	var RosterId;
	var startTime = null;

	var powerUpQueue = new TaskQueue("powerUpQueue", 10000, null, true, 2 /* maxHours */);
	powerUpQueue.clear();
	powerUpQueue.start();

	var recordTypeId;
	var recordTypeIdRoster;

	// Fill out recordTypeId and recordTypeRosterId
	(function() {
		try {
			var query = sforce.connection.query("SELECT Id,SobjectType FROM RecordType WHERE DeveloperName = 'Retail' AND SobjectType in( 'WorkEntry__c', 'RosterEntry__c')");
			var results;
			if (query.getArray) results = query.getArray("records");
			else results = query.records;

			var count = 0;
			_(results).each(function (item) {
				if (item.SobjectType === "RosterEntry__c") recordTypeIdRoster = item.Id;
				else recordTypeId = item.Id;
				count++;
			});
		} catch (e) {
			handleError(e);
		}
	})();

	// Public methods
	var methods = {
		getRosterRecordType: function(){
			var querystr = "SELECT Id FROM RecordType WHERE DeveloperName = 'Retail' AND SobjectType = 'RosterEntry__c'";
			var queryresult;
			try {
				queryresult =  sforce.connection.query(querystr);
			}
			catch(e) {
				handleError(e);
				return;
			}
			var records;
			if (typeof queryresult.getArray === "undefined") {
				records = [queryresult.records];
			}
			else {
				records = queryresult.getArray("records");
			}
			return records[0].Id;
		},

		getAllStores: function(){
			var querystr = "select Id, sf_StoreCode__c from Account where IsActive__c = true and sf_SubChannelName__c = 'Company Owned' Order By sf_StoreCode__c ASC";
			var queryresult;
			try {
				queryresult =  sforce.connection.query(querystr);
			}
			catch(e) {
				handleError(e);
				return;
			}
			var records;
			if (typeof queryresult.getArray === "undefined") {
				records = queryresult.records;
			}
			else {
				records = queryresult.getArray("records");
			}

			return records;
		},
		getRecentStores: function(){
               // get up to 5 recent created shift/roster records with store codes and sort them in descending order according to the frequency with which they worked.
               // First 3 stores will be listed in the list of recent stores.  If less than 3 stores, just list what we have.
               try {
                   var querystr1     = "select StoreCode__c from RosterEntry__c where StoreCode__c<>null and Ownerid = '"+userid+"' order by createddate desc limit 1";

                   var queryresult1  =  sforce.connection.query(querystr1);
                   console.log(queryresult1);
                   var records1;
                   if (typeof queryresult1.getArray === "undefined") {
                       records1 = queryresult1.records;
                   }
                   else {
                       records1 = queryresult1.getArray("records");
                   }


                   var querystr2     = "select StoreCode__c, Count(id) number from RosterEntry__c where  Ownerid = '"+userid+"' and StoreCode__c<>null and StoreCode__c<>'"+records1[0].get('StoreCode__c')+"' and CreatedDate > N_DAYS_AGO:30 group by StoreCode__c order by count(id) desc";
                   var queryresult2  =  sforce.connection.query(querystr2);

                   console.log(queryresult2);

                   var records2;
                   if (typeof queryresult2.getArray === "undefined") {
                       records2 = queryresult2.records;
                   }
                   else {
                       records2 = queryresult2.getArray("records");
                   }
                   var output = [];
                   output.push(records1[0]);
                   output.push(records2[0]);
                   output.push(records2[1]);

                   console.log("output",output);

                   return output; 
               }
               catch(e) {
                   handleError(e);
               }
               return false;

        },

		startShift: powerUpQueue.worker("startShift", function(storecode, timestamp, done){
			/*
			 App Load - shift start
			 1. When the app loads, check if there is a RosterEntry__c created *in the last 10 hours and with no EndTime__c*
			 2. If an entry exists, retrieve its Id and proceed to Idle screen
			 3. If no entry exists, display Login screen
			 */
			try{

				var user = sforce.connection.getUserInfo();
				var offset = getTimeZoneOffset(user.userTimeZone);
				//var offset = "";
				//var timestrGMT = formatTimestamp(toGMT(new Date(timestamp))) + "Z";
				var timestrGMT = moment(new Date(timestamp)).zone(0).format();
				var timestr = moment(new Date(timestamp)).format();
				// Offset to be managed by server allegedly
				//timestr  = timestr + "Z";

				var maxTimeAgo = timestamp - (10 * (1000 * 60 * 60));
				var maxTimeAgoFormattedGMT = moment(new Date(maxTimeAgo)).zone(0).format();
				var maxTimeAgoFormatted = moment(new Date(maxTimeAgo)).format();

				var queryresult =  sforce.connection.query("select Id,Name, StartTime__c, EndTime__c from RosterEntry__c where StoreCode__c = '"+storecode+"' and EndTime__c = null and StartTime__c >= "+maxTimeAgoFormatted+" and Ownerid = '"+userid+"'");
				var records = queryresult.getArray("records");
				if(records.length > 0 && records != null)
				{//** If an entry exists
					console.log("Previous roster entries exist", records);
					var record = records[0];
					RosterId = record.Id;
					startTime = moment(record.StartTime__c).unix();
					//** process idle screen
				}
				else
				{//** If NO entry exists
					startTime = timestamp;
					//** create roster ** //
					var se = new sforce.SObject("RosterEntry__c");

					se.StartTimeGMT__c = timestrGMT;
					se.StartTime__c = timestr;
					se.StoreCode__c = storecode ;
					//var curDate = '{!YEAR(TODAY())}-{!RIGHT(TEXT(MONTH(TODAY())+ 100), 2)}-{!RIGHT(TEXT(DAY(TODAY())+ 100), 2)}';
					//se.RosterEntryID__c = 'RD_{!NOW()}';
					se.RosterEntryID__c = 'RD_' + userid + "_" + formatDate(timestamp) + "_" + formatTime(timestamp);
					//se.RosterEntryID__c = 'RD_{!$User.id}_' + curDate;
					se.RecordTypeId     = recordTypeIdRoster;
					
					var newRecords = [];
					newRecords.push(se);
					var result = sforce.connection.create(newRecords, {
						onSuccess: function(data) {
							RosterId = data[0].id;
							window.localStorage.setItem("rosterEntry", JSON.stringify({
								rosterId: RosterId,
								timeStarted: timestamp
							}));
							done(true);
						},
						onFailure: function(error) {
							handleError(error, done);
						}
					});

				}
				//done(true);
				return true;
			}
			catch(e){
				handleError(e, done);
				return false;
			}
		}),

		endShift: powerUpQueue.worker("endShfit", function(storecode, timestamp, disableRedirect, done){

			try{
				var queryStr ;
				var user = sforce.connection.getUserInfo();
				var offset = getTimeZoneOffset(user.userTimeZone);
				var timestrGMT = moment(new Date(timestamp)).zone(0).format();
				var timestr = moment(new Date(timestamp)).format();
				//var offset = "";

				if(RosterId)
				{

					var roster = new sforce.SObject("RosterEntry__c");
					roster.Id  = RosterId;
					roster.EndTimeGMT__c = timestrGMT;
					roster.EndTime__c = timestr;
					var result = sforce.connection.update([roster], {
						onSuccess: function(data) {
							done(true);
							// Set window location to salesforce logout page
							if (!disableRedirect) window.location = "/secur/logout.jsp?retUrl=/apex/PowerUp";
						},
						onFailure: function(error) {
							handleError(error, done);
						}
					});
				}
				else
				{
					queryStr = "select Id,EndTime__c from RosterEntry__c where RecordtypeId = '"+this.getRosterRecordType()+"' and StoreCode__c = '"+storecode+"' and EndTime__c = null and StartTime__c >= "+timestr+" and Ownerid = '"+userid+"'";
					var queryresult =  sforce.connection.query(queryStr);
					var records = queryresult.getArray("records");
					var result;
					if(records.length > 0)
					{
						var roster = records[0];
						roster.Id  = records[0].Id;
						roster.EndTimeGMT__c = timestrGMT;
						roster.EndTime__c = timestr;

						result = sforce.connection.update([roster], {
							onSuccess: function(data) {
								done(true);
								// Set window location to salesforce logout page
								if (!disableRedirect) window.location = "/secur/logout.jsp?retUrl=/apex/PowerUp";
							},
							onFailure: function(error) {
								handleError(error, done);
							}
						});
					}
				}
			}
			catch(e)
			{
				handleError(e, done);
			}
			return false;
		}),
		getQueueCategories: function () {
			var resultRecords = [];

			var queryOne, queryOneTwo;
			try {
				queryOne = sforce.connection.query("select Id, Name, Category__c  from WorkEntryType__c where Name = 'Queue Completed' LIMIT 1");
				queryOneTwo = sforce.connection.query("select Id, Name, Category__c  from WorkEntryType__c where Name = 'Queue InCompleted' LIMIT 1");
			}
			catch(e) {
				handleError(e);
			}

			resultRecords[0] = queryOne.records;
			resultRecords[1] = queryOneTwo.records;
			return resultRecords;
		},
		getCategories: function () {
			var result_1;
			var records;

			try {
				result_1 = sforce.connection.query("select Id,Name from SkillGroup__c where Name = 'RetailDemand'");
			}
			catch (e) {
				handleError(e);
				return;
			}

			if (typeof result_1.getArray !== "undefined") {
				records = result_1.getArray("records");
			}
			else {
				records = [result_1.records];
			}

			var resultRecords;
			if (records.length > 0) {
				var record = records[0];
				var result_2 = sforce.connection.query("select Id, Name, Category__c, CategoryColor__c from WorkEntryType__c where SkillGroup__c = '" + record.Id + "' order by Category__c, Name");
				//var result_2 = sforce.connection.query("select * from WorkEntryType__c where SkillGroup__c = '" + record.Id + "' order by Category__c, Name");

				resultRecords = (typeof result_2.getArray !== "undefined" ? result_2.getArray("records") : result_2.records);

			}
			return resultRecords;
		},
		createRecords: powerUpQueue.worker("createRecords", function(worktypeid, starttime, endtime, customertype, numberOfRecords, done){
			var nowDate = new Date();
			var newRecords = [];
			var user = sforce.connection.getUserInfo();
			var offset = getTimeZoneOffset(user.userTimeZone);

			var momentStart = moment(new Date(starttime));
			var momentEnd = moment(new Date(endtime));

			var currentDate = formatDate(nowDate.getTime());
			var durationInMins = getTotalMinutesFromTimestamp(endtime - starttime);


			if (typeof worktypeid !== "string") {
				_(worktypeid).each(function(item) {

					var we =                new sforce.SObject("WorkEntry__c");
					we.WorkEntryType__c =   item;
					we.Owner__c =           userid; //'{!$User.Id}
					we.StartTimeGMT__c =    momentStart.zone(0).format();
					we.StartTime__c =       momentStart.format();
					we.CustomerType__c =    customertype; // the value will be 'New' or 'Existing'
					we.EndTimeGMT__c   =    momentEnd.zone(0).format();
					we.EndTime__c =         momentEnd.format();
					we.RosterEntry__c =     RosterId; // dummy entry id for required master-detail field
					we.RecordTypeId  =      recordTypeId; // this is hardcode. In live instance, this may be different.
					we.GroupedEntries__c =  numberOfRecords;
					we.Date__c =            currentDate;
					we.WorkDurationMins__c = durationInMins;
					newRecords.push(we);
				});
			}
			else {
				var we =                new sforce.SObject("WorkEntry__c");
				we.WorkEntryType__c =   worktypeid;
				we.Owner__c =           userid; //'{!$User.Id}
				we.StartTimeGMT__c =    momentStart.zone(0).format();
				we.StartTime__c =       momentStart.format();
				we.CustomerType__c =    customertype; // the value will be 'New' or 'Existing'
				we.EndTimeGMT__c   =    momentEnd.zone(0).format();
				we.EndTime__c =         momentEnd.format();
				we.RosterEntry__c =     RosterId; // dummy entry id for required master-detail field
				we.RecordTypeId  =      recordTypeId ; // this is hardcode. In live instance, this may be different.
				we.GroupedEntries__c =  numberOfRecords;
				we.Date__c =            currentDate;
				we.WorkDurationMins__c = durationInMins;
				newRecords.push(we);
			}
			var result = sforce.connection.create(newRecords, {
				onSuccess: function() {
					done(true);
				},
				onFailure: function(e) {
					handleError(e, done);
				}
			});
			return false;

		})
	};

	return methods;
};

function getTimeZoneOffset(sTimeZone) {

	var sOffSet;
	switch (sTimeZone) {
		case 'Australia/Sydney':
			sOffSet = '+10:00';
			break;
		case 'Australia/Perth':
			sOffSet = '+08:00';
			break;
		case 'Australia/Brisbane':
			sOffSet = '+10:00';
			break;
		case 'Australia/Adelaide':
			sOffSet = '+09:30';
			break;
		case 'Australia/Darwin':
			sOffSet = '+09:30';
			break;
		case 'Pacific/Auckland':
			sOffSet = '+12:00';
			break;
		case 'Asia/Colombo':
			sOffSet = '+05:30';
			break;
		case 'Asia/Kolkata':
			sOffSet = '+05:30';
			break;
		default:
			sOffSet = '+10:00';
	}
	return sOffSet;
}
