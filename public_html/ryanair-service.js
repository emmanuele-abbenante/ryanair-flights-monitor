var baseApiUrl = "https://www.ryanair.com/api/booking/v4/it-it";

class FlightData {

	constructor(dateTime, amount, faresLeft) {
	    this.dateTime = dateTime;
	    this.amount = amount;
	    this.faresLeft = faresLeft;
	}
	
	static compare(a, b) {
		if (a.amount > b.amount) {
	        return 1;
	    }
	    if (b.amount > a.amount) {
	        return -1;
	    }
	    return 0;
	}

}

function retrieveOneWayFlightsForAWeek(origin, destination, middleDateOfWeek, daysBefore=3, daysAfter=3) {
	var outputData;
	var url = baseApiUrl + "/availability?ToUs=AGREED&ADT=1&CHD=0&INF=0&RoundTrip=false&TEEN=0&Disc=0&IncludeConnectingFlights=false&DateIn=&Origin=" + origin + "&Destination=" + destination + "&DateOut=" + middleDateOfWeek.format('YYYY-MM-DD') + "&FlexDaysOut=" + daysBefore + "&FlexDaysBeforeOut=" + daysAfter;
	console.log(url);
	$.ajax({
        type: "GET",
        url: url,
        async: false
    }).done(function (flightsData) {
    	outputData = flightsData;
    });
	return outputData;
}

function retrieveOneWayFlightsForMultipleWeeks(origin, destination, middleDateOfFirstWeek, weeksNumber=4) {
	var flightsPeriodsData = [];
	for (var i = 0; i < weeksNumber; i++) {
		var middleDateOfCurrentWeek = middleDateOfFirstWeek.clone().add(i * 7, 'days');
		flightsPeriodsData.push(retrieveOneWayFlightsForAWeek(origin, destination, middleDateOfCurrentWeek));
    }
	return flightsPeriodsData;
}

function extractFlightsData(flightsPeriodsData) {
	var flightsData = [];
	for (var i = 0; i < flightsPeriodsData.length; i++) {
		var flightPeriod = flightsPeriodsData[i];
		var dates = flightPeriod.trips[0].dates;
		for (var j = 0; j < dates.length; j++) {
			var flights = dates[j].flights;
			for (var k = 0; k < flights.length; k++) {
				var flight = flights[k];
				var dateTime = flight.time[0];
				var faresLeft = flight.faresLeft;
				if (flight.regularFare != undefined) { 
					var fares = flight.regularFare.fares;
					for (var l = 0; l < fares.length; l++) {
						var amount = fares[l].amount;
						flightsData.push(new FlightData(dateTime, amount, faresLeft));
					}
				}
			}
		}
	}
	return flightsData.sort(FlightData.compare);
}


function retrieveFlightsData() {
    var origin = $("#searchParams #origin").val();
    var originName = $("#searchParams #origin option:selected").text();
    var destination = $("#searchParams #destination").val();
    var destinationName = $("#searchParams #destination option:selected").text();
    var weeksToScan = parseInt($("#searchParams #weeksToScan").val());
    var maxPrice = parseFloat($("#searchParams #maxPrice").val());

    var dateOut = moment($("#searchParams #dateOut").val(), "DD/MM/YYYY");
    var dateIn = moment($("#searchParams #dateIn").val(), "DD/MM/YYYY");

    var datesDiffInDays = dateIn.diff(dateOut, 'days');
    
    var outDaysOfTheWeek = $('#searchParams #outDaysOfTheWeek').val();
    console.log(outDaysOfTheWeek);
    var inDaysOfTheWeek = $('#searchParams #inDaysOfTheWeek').val();
    console.log(inDaysOfTheWeek);
    var outTakeOffHours = $('#searchParams #outTakeOffHours').val();
    console.log(outTakeOffHours);
    var inTakeOffHours = $('#searchParams #inTakeOffHours').val();
    console.log(inTakeOffHours);
    
    $("#flightsOut #flights").html("");
    $("#flightsOut #flights").html("<tr><th>Data</th><th>Ora partenza</th><th>Ora arrivo</th><th>Volo</th><th>Standard</th><th>Leisure</th><th>Business</th></tr>");
    $("#flightsBack #flights").html("");
    $("#flightsBack #flights").html("<tr><th>Data</th><th>Ora partenza</th><th>Ora arrivo</th><th>Volo</th><th>Standard</th><th>Leisure</th><th>Business</th></tr>");
    for (var i = 0; i < datesDiffInDays * 3; i++) {
        $("#flightsBack #flights").append("<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>");
    }

    $("#flightsOut #origin").html(originName + " (" + origin + ")");
    $("#flightsOut #destination").html(destinationName + " (" + destination + ")");
    $("#flightsBack #origin").html(destinationName + " (" + destination + ")");
    $("#flightsBack #destination").html(originName + " (" + origin + ")");

    for (var i = 0; i < weeksToScan; i++) {
        var currentDateOut = dateOut.add(i * 7, 'days').format('YYYY-MM-DD');
        var currentDateIn = dateIn.add(i * 7, 'days').format('YYYY-MM-DD');

        $.ajax({
            type: "GET",
            url: "https://www.ryanair.com/api/booking/v4/it-it/availability?ToUs=AGREED&ADT=1&CHD=0&DateIn=" + currentDateIn + "&DateOut=" + currentDateOut + "&Destination=" + destination + "&FlexDaysIn=2&FlexDaysOut=2&INF=0&Origin=" + origin + "&RoundTrip=true&TEEN=0&Disc=0&FlexDaysBeforeIn=2&FlexDaysBeforeOut=2&IncludeConnectingFlights=false",
            async: false
        }).done(function (flightsData) {
            var trips = flightsData.trips;

            handleTrip(trips[0], "flightsOut", maxPrice, outDaysOfTheWeek, outTakeOffHours);
            handleTrip(trips[1], "flightsBack", maxPrice, inDaysOfTheWeek, inTakeOffHours);
        });
    }

    for (var i = 0; i < datesDiffInDays * 3; i++) {
        $("#flightsOut #flights").append("<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>");
    }
}

function handleTrip(trip, targetDiv, maxPrice, selectedDays, selectedHours) {
    var html = "";

    trip.dates.forEach(function (date, index) {
        date.flights.forEach(function (flight, index) {
            var takeOffTime = moment(flight.time[0]);
            
            if($.inArray(takeOffTime.day().toString(), selectedDays) !== -1 && $.inArray(takeOffTime.hour().toString(), selectedHours) !== -1){
                if (takeOffTime.day() === 0 || takeOffTime.day() === 6) {
                    html += '<tr style="font-weight: bold;">';
                } else {
                    html += '<tr>';
                }
                if (flight.regularFare !== undefined && flight.regularFare.fares[0].amount <= maxPrice && (flight.faresLeft > 0 || flight.faresLeft === -1)) {
                    var faresLeft = flight.faresLeft > 0 ? ' (' + flight.faresLeft + ')' : '';
                    html += '<td>' + takeOffTime.format('DD/MM/YYYY') + '</td><td>' + takeOffTime.format('HH:mm') + '</td><td>' + moment(flight.time[1]).format('HH:mm') + '</td><td>' + flight.flightNumber + '</td><td style="text-align: right;">€ ' + Number((flight.regularFare.fares[0].amount * 1.022).toFixed(2)) + faresLeft + '</td><td style="text-align: right;">€ ' + Number((flight.leisureFare.fares[0].amount * 1.022).toFixed(2)) + '</td><td style="text-align: right;">€ ' + Number((flight.businessFare.fares[0].amount * 1.022).toFixed(2)) + '</td></tr>';
                } else {
                    html += '<td>' + takeOffTime.format('DD/MM/YYYY') + '</td><td>' + takeOffTime.format('HH:mm') + '</td><td>' + moment(flight.time[1]).format('HH:mm') + '</td><td>' + flight.flightNumber + '</td><td style="text-align: center;">-</td><td style="text-align: center;">-</td><td style="text-align: center;">-</td></tr>';
                }
            }
        });
    });

    $("#" + targetDiv + " #flights").append(html);
}
