/*
 PriceStatusUpdate.gs

 Created by: Andre Remy
 Creation Date: 10/02/2020
*/

var updateLiveServiceURL = 'https://splitspot.com/_functions/updateRoom';
var updateSandboxServiceURL = 'https://splitspot.com/_functions-dev/updateRoom';

function doPriceAndStatusUpdate(e) {
  /*
  Function that is executed everytime there is a change in any column.

  It will only run when there's a change in the sheet called "List" and when the change was made in the columns of "Price" and "Status".
  If there is a change in price of a room,
    It will update the price of that room on Wix. If the room is not available, it will set the price of the room to "0" regardless of the price set in the spreadsheet.
    It will update the price of the whole unit on Wix with the lowest price among all the active rooms in that specific Unit.
    If no room is available, the Unit will be update with the price "0".

  If there is a change in status,
    It will update the status of that room. If the room is not available, it will set the price of the room to "0".
    It will update the status of the Unit where the modified room belongs
    It will update the price of the Unit where the modified room belongs. If no active room is found, it will update the price of the Unit to "0".

  An available room is one with any of the following status
    "Upcoming Vacancy", "Vacant", "Roommate Introduction", "Lease Sent", "On-boarding":

  A non-available room is one with any of the following status
    "Occupied", "Lease Signed", "Deposits Complete", "Off-boarding":

  If a unit has at least one active room, the whole unit will figure as active.
    When a room is in Upcoming Vacancy, it will receive an additional text indicating when will it be available based column "Date" on the sheet List.
    When the unit is active but all of its active room are shown as "Upcoming Vacancy", the unit will recive a text indicating that it will be available on 1st day of the closest month.
    The closest month will be selected from the column "Date" of the rooms that belongs to the unit.

  e: Event object that has the information about the modified cell (https://developers.google.com/apps-script/guides/triggers/events).

  (returns): Returns nothing.

  Request example to update Unit Price
  {
      "unitId":______,
      "field":"unitPrice",
      "value":800
  }

  Request example to update Unit Availability
  {
      "unitId":______,
      "field":"unitAvailable",
      "value":[true, "Available Now!", "5/5 Rooms Available"]
  }

  Request example to update Room Availability
  {
      "unitId":______,
      "field":"roomAvailable",
      "value":["A", true]
  }

  Request example to update Room Availability
  {
      "unitId":______,
      "field":"roomPrice",
      "value":["B", 1000]
  }
  */
  let activeSheet = e.source.getActiveSheet();
  let range = activeSheet.getActiveRange();
  let col = range.getColumn() - 1;

  if ((activeSheet.getName() == "List" && (col == listColumns.status || col == listColumns.upcomingDate)) || (activeSheet.getName() == "Pricing Updates" && col == priceUpdateColumns.currentPrice)) {
    let row = range.getRow();
    let unitId;
    let roomPrice;

    if (activeSheet.getName() == "Pricing Updates"){
      // Retrieving Sheet Row ID to match with the row in the List Sheet
      unitId = activeSheet.getRange(row, priceUpdateColumns.sheetUnitID + 1).getValue();

      // Retrieving the price of the room from the Pricing Updates Sheet
      roomPrice = activeSheet.getRange(row, priceUpdateColumns.currentPrice + 1).getValue();

      activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("List");

      let i = 0;
      row = 1;
      activeSheet.getDataRange().getValues().filter(
        function(data_row){
          i += 1;
          if(data_row[listColumns.sheetUnitID] == unitId)
            row = i;
        }
      );
    }
    else{
      // Retrieving the price of the room from the List Sheet when the event wasn't triggered by a change in price
      roomPrice = activeSheet.getRange(row, listColumns.price + 1).getValue();
    }

    // Retrieving Wix ID, which is the one needed to perform the update
    unitId = activeSheet.getRange(row, listColumns.wixUnitID + 1).getValue();

    if(unitId !== null && unitId.length > 0){
      let filteredUnits = activeSheet.getDataRange().getValues().filter(
        function(data_row){
          if (data_row[listColumns.wixUnitID] == unitId)
            return data_row;
        }
      );

      let room = activeSheet.getRange(row, listColumns.roomLetter + 1).getValue();

      let filteredRooms = filteredUnits.filter(
        function(data_row){
          if (data_row[listColumns.roomLetter] == room)
            return data_row;
        }
      )[0];

      switch(col){
        case priceUpdateColumns.currentPrice:
          updateRoomPrice(unitId, roomPrice, filteredRooms);
          updateUnitPrice(unitId, roomPrice, filteredUnits);
          break;
        case listColumns.status:
        case listColumns.upcomingDate:
          updateStatus(unitId, filteredRooms, filteredUnits);
          updateUnitPrice(unitId, roomPrice, filteredUnits);
          break;
        default:
          // Do Nothing
          return;
      }
    }
    else{
      Logger.log("Row with no Wix ID");
    }
  }
}

function updateRoomPrice(unitId, roomPrice, roomRow){
  /*
  Function that updates on Wix the price of a room.

  unitId: The Wix ID of the Unit where the room belongs to
  roomRow: The row that contains the data of the room to update

  (returns): Nothing
  */
  var isRoomActive = isActive(roomRow[listColumns.status]);
  var params = {
    "unitId":unitId,
    "field":"roomPrice",
    "value":[roomRow[listColumns.roomLetter], isRoomActive?roomPrice:null]
  };

  Logger.log(`Updating Room Price: ${JSON.stringify(params)}`);
  callServicePost(updateLiveServiceURL, params);  // Updating information in the Live dataset
  callServicePost(updateSandboxServiceURL, params);  // Updating information in the Sandbox dataset
}

function updateUnitPrice(unitId, newRoomPrice, units){
  /*
  It updates on Wix the price of the unit with the minum price of its available rooms. If no room is available, it will set the price with 0.


  unitId: The id of the Unit that will be updated.
  units: The list of rooms that belong to one specific unit.

  (return): Returns nothing.
  */
  var activeUnits = units.filter(
    function(row){
      if (isActive(row[listColumns.status]))
        return row;
    }
  );

  var newPrice;
  if (activeUnits.length > 0){
    newPrice = findMinPrice(activeUnits, newRoomPrice);
  }
  else{
    newPrice = null;
  }

  var params = {
    "unitId":unitId,
    "field":"unitPrice",
    "value":newPrice
  };
  Logger.log(`Updating Unit Price: ${JSON.stringify(params)}`); // REMOVE

  callServicePost(updateLiveServiceURL, params);  // Updating information in the Live dataset
  callServicePost(updateSandboxServiceURL, params);  // Updating information in the Sandbox dataset
}

function updateStatus(unitId, roomRow, units){
  /*
  Function that determines if the status of a unit is active or not base on the status of its rooms and performs the update using a Wix http-function.
  If all the rooms are available: The unit is available,
  If at least one room is available: The unit is available.
  If no room is available: The unit is NOT available.

  unitId: The id of the Unit that will be updated.
  roomRow: Row containing the information that of the room that caused the trigger
  units: The list of rooms that belong to one specific unit.

  (return): Returns nothing.
  */
  var params = {};
  var activeRooms = [];
  var isUnitActive = false;
  var isRoomActive = false;

  // Updating Unit Availability
  units.forEach(
    function(row, index){
      var isRowActive = isActive(row[listColumns.status])
      isUnitActive = isUnitActive || isRowActive;
      if (isRowActive)
        activeRooms.push(row);
    }
  );
  var activeText = isUnitActive?getActiveText(activeRooms):"Not Available";
  var occupancyText = `${activeRooms.length}/${units.length} Rooms Available`;

  params = {
      "unitId":unitId,
      "field":"unitAvailable",
      "value":[isUnitActive, activeText, occupancyText]
  };
  Logger.log(`Updating Unit Availability: ${JSON.stringify(params)}`); // REMOVE
  callServicePost(updateLiveServiceURL, params);  // Updating information in the Live dataset
  callServicePost(updateSandboxServiceURL, params);  // Updating information in the Sandbox dataset


  // Updating Room Availability
  isRoomActive = isActive(roomRow[listColumns.status]);
  activeText = isRoomActive?getActiveText([roomRow]):"Not Available";
  var roomPrice = roomRow[listColumns.price];

  params = {
    "unitId":unitId,
    "field":"roomAvailable",
    "value":[roomRow[listColumns.roomLetter], activeText]
  };
  Logger.log(`Updating Room Availability: ${JSON.stringify(params)}`); // REMOVE
  callServicePost(updateLiveServiceURL, params);  // Updating information in the Live dataset
  callServicePost(updateSandboxServiceURL, params);  // Updating information in the Sandbox dataset

  updateRoomPrice(unitId, roomPrice, roomRow);
}

function findMinPrice(units, newRoomPrice){
  /*
  Function that finds the minimum price among the rooms that are part of a unit.

  units: The list of rooms that belong to a unit

  (return): The minimum price among the units send.
  */
  var min = newRoomPrice;
  units.forEach(
    function(row, index){
      if (row[listColumns.price] !== null && row[listColumns.price] < min)
        min = row[listColumns.price];
    }
  );
  return min;
}

function isActive(status){
  /*
  Function that, given the value of a status, returns if the room is available or not.
      The room is available when status is: Upcoming Vacancy, Vacant, Roommate introduction, or Lease Sent.
      The room is NOT available when status is:Occupied, Lease Signed, Deposits Complete, On-boarding or. Off-boarding

  status: The status according to the spreadsheet.

  (returns): True if the status sent means that the room is available. False if not. It will return false if the function receives an unspecified status.
  */
  var value = false;

  switch(status){
    case "Upcoming Vacancy":
    case "Vacant":
    case "Roommate Introduction":
    case "Lease Sent":
    case "On-boarding":
      value = true;
      break;
    case "Occupied":
    case "Lease Signed":
    case "Deposits Complete":
    case "Off-boarding":
      // If it's blank, it's not available
      value = false;
      break;
    default:
      value = null;
      Logger.log(`Unidentified status '${status}'`);
  }
  return value;
}

function getMonthDistance(currentMonth, destinationMonth){
  /*
  Function that calculate the distance between one month and another one (destinationMonth - currentMonth).
  If the destination month is greater that the current month, it assumes that the destination month belongs to the next year.

  currentMonth: Month from where the calculation will start.
  destinationMonth: Month from where the calculation will end.

  (returns): The distance between the two months.
  */
  let destMonth = monthNumber[destinationMonth] - 1;
  if (destMonth < currentMonth){
    return (destMonth + Object.keys(monthNumber).length) - currentMonth;
  } else{
    return destMonth - currentMonth;
  }
}

function getNearestMonth(currentMonth, monthList){
  /*
  Function that calculates which is the closest month given a list of months.

  currentMonth: Month of the date when the execution is made.
  monthList: List of months that the algorithm will need to pick one from.

  (returns): The month from the monthList that is closest to the currentMonth
  */
  var i = 0;
  var distance = 0;

  let minDistance = getMonthDistance(currentMonth, monthList[0]);
  let result = monthList[0];

  for(i = 1; i<monthList.length; i++){
    distance = getMonthDistance(currentMonth, monthList[i]);
    if (distance < minDistance){
      minDistance = distance;
      result = monthList[i];
    }
  }
  return result;
}

function getActiveText(units){
  /*
  Function that determines what text represents better the status of a unit or room

  units: An array with the data of all the rooms that belongs to a unit

  (returns): The text that represent the new status of the unit or room.
  */
  var result = "";
  var upcomingMonths = [];
  var countUpcoming = 0;

  units.forEach(
    function(row){
      if(row[listColumns.status] == "Upcoming Vacancy"){
        countUpcoming++;
        if (row[listColumns.upcomingDate].length > 0){
          upcomingMonths.push(row[listColumns.upcomingDate]);
        }
      }
    }
  );

  if (upcomingMonths.length == 0 || countUpcoming < units.length){
    result = "Available Now!";
  } else {
    result = `Available ${getNearestMonth((new Date()).getMonth(), upcomingMonths)} 1st`;
  }
  return result;
}

async function callServicePost(serviceURL, params){
  /*
  Function that makes the post request to a URL sending the given parameters in json format.
  serviceURL: URL to where the request will be made.

  params: Parameters to be used

  (returns): Returns nothing.
  */

  var to_print;
  var nTries = 0;
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    // Converting the JavaScript object to a JSON string
    'payload': JSON.stringify(params)
  };

  while (nTries < 3){
    var response = UrlFetchApp.fetch(serviceURL, options);

    if (response.getResponseCode() == 200){
      let json = response.getContentText();
      let data = JSON.parse(json);
      to_print = data.status;
      nTries = 3;
    }
    else {
      nTries++;
      to_print = `Try ${nTries}. Response Status Code: ${response.getResponseCode()} - ${response.getContentText()}`;
    }
  }
  Logger.log(`Service Executed: ${serviceURL}`);
  Logger.log(`Service Result: ${to_print}`);
}
