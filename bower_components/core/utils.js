function milliecondsToMinutes(milliseconds, disableHours){
	var seconds = milliseconds / 1000;
	var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	var numseconds = Math.round((((seconds % 31536000) % 86400) % 3600) % 60);
	//return (numminutes < 10 ? "0" + numminutes : numminutes) + "m " + (numseconds < 10 ? "0" + numseconds : numseconds) + "s";

	if (("" + numhours).length < 2)
			numhours = "0" + numhours;
	if (("" + numminutes).length < 2)
			numminutes = "0" + numminutes;
	if (("" + numseconds).length < 2)
			numseconds = "0" + numseconds;

	if (disableHours) return (numhours > 0 ? numhours + ":" : "") + (numminutes) + ":" + (numseconds) + "";

	return (numhours) + ":" + (numminutes) + ":" + (numseconds) + "";
}

var InlineClock = function(callback) {
	var interval = null;
	return {
		running: false,
		start: function() {
			this.running = true;
			interval = setInterval(callback, 1000);
		},
		stop: function() {
			this.running = false;
			clearInterval(interval);
			interval = null;
		}
	};
};

// Compares an array of objects with a comparator to determine uniqueness
// and returns an array with duplicates removes
function deepUnique(arr, comparator) {
	var newArr = [];
	var memoizeComparator = {};
	_(arr).each(function(item) {
		if (!memoizeComparator[item[comparator]]) {
			memoizeComparator[item[comparator]] = true;
			newArr.push(item);
		}
	});
}

function verboseDifference(oldArray, newArray, comparator) {
	var added = [];
	var removed = [];
	var oldMem = {};
	var newMem = {};
	_(oldArray).each(function(item) {
		oldMem[item[comparator]] = item;
	});
	_(newArray).each(function(item) {
		newMem[item[comparator]] = item;
	});

	_(oldMem).forOwn(function(item, key) {
		if (!newMem[key]) removed.push(item);
	});
	_(newMem).forOwn(function(item, key) {
		if (!oldMem[key]) added.push(item);
	});

	return {
		added: added,
		removed: removed
	};
}

function timeSync() {

}

function now() {return+new Date}

function clockDrift() {
	var clock_drift = {};
	clock_drift.start = now();
	PUBNUB.time(function(timetoken){
		var latency     = (now() - clock_drift.start) / 2
			,   server_time = (timetoken / 10000) + latency
			,   local_time  = now()
			,   drift       = local_time - server_time;

		console.log(drift);
		if (drift > 3000 || drift < -3000) console.error("Oh no, drift is too big!", drift);
	});
}

function getNetworkTime(cb) {
	PUBNUB.time(function(timetoken) {
		cb(timetoken / 10000);
	});
}

var timeDifferential = new Date();

PUBNUB.time(
	function(time){
		timeDifferential = Math.round((time - (new Date().getTime() * 10000))/10000);
	}
);

var getCorrectedDate = function(oldTime) {

	var newTime = oldTime + timeDifferential;
	return newTime;

};

function updateTimeDifferential() {
	PUBNUB.time(
		function(time){
			timeDifferential = Math.round((time - (new Date().getTime() * 10000))/10000);
		}
	);
}
