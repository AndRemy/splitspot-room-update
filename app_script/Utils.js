/*
 Utils.gs
 
 Created by: Andre Remy
 Creation Date: 10/02/2020
*/

// A dictionary that helps obtain the month number from a respective month name
var monthNumber = {
  'January':1,
  'February':2,
  'March':3,
  'April':4,
  'May':5,
  'June':6,
  'July':7,
  'August':8,
  'September':9,
  'October':10,
  'November':11,
  'December':12
};

// An enum that help access the columns of the "List" sheet 
const listColumns = {
  apartment: 0, // Column A
  street: 1, // Column B
  unit: 2, // Column C
  addressAndUnit: 3, // Column D
  city: 4, // Column E
  neighborhood: 5, // Column F
  roomNumber: 6, // Column G
  roomLetter: 7, // Column H
  sheetUnitID: 8, // Column I
  wixUnitID: 9, // Column J
  price: 10, // Column K
  territory: 11, // Column L
  activeShowing: 12, // Column M
  furnished: 13, // Column N
  status: 14, // Column O
  upcomingDate: 15, // Column P
  moveOutDate: 16, // Column Q
  moveInDate: 17, // Column R
  petRule: 18, // Column S
  petSituation: 19, // Column T
  webSite: 20, // Column U
  couplesAllowed: 21, // Column V
  prospectiveRoommate: 22, // Column W
  prospectiveRoommateEmail: 23, // Column X
  currentRoommate: 24, // Column Y
  currentRoommateEmail: 25, // Column Z
  mostRecentComment: 26, // Column AA
  backupOptions: 27, // Column AB
  notes: 28 // Column AC
};


const priceUpdateColumns = {
  address: 0, // Column A
  street: 1, // Column B
  unit: 2, // Column C
  city: 3, // Column D
  neighborhood: 4, // Column E
  roomNumber: 5, // Column F
  roomLetter: 6, // Column G
  sheetUnitID: 7, // Column H
  originalPrice: 8, // Column I
  currentPrice: 9, // Column J
  territory: 10, // Column K
  status: 11, // Column L
  date: 12, // Column M
  //--- Column N is Empty
  website: 14, // Column O
  apartmentsCom: 15, // Column P
  zillow: 16, // Column Q
  craigslist: 17, // Column R
  partnerSites: 18, // Column S
  social: 19 // Column T
};

function sleep(ms) {
  /*
  Function that allows the program to stop its execution by an "ms" period of time
  
  ms: Number of milliseconds that the program will stop
  */
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}