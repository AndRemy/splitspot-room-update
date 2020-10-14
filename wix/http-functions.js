import {ok, badRequest, notFound, serverError} from 'wix-http-functions';
import wixData from 'wix-data';

// Create our number formatter.
var formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',

  // These options are needed to round to whole numbers if that's what you want.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

// URL to call this HTTP function from the published site looks like: https://splitspot.com/_functions/test
// URL to call this HTTP function from the saved site looks like: https://splitspot.com/_functions-dev/test
export function get_test(request){
	let response = {
		"headers": {
			"Content-Type": "application/json"
		},
        "body": {
            "status": "Success!!!!"
        }
	};

    return ok(response);
}

// URL to call this HTTP function from the published site looks like: https://splitspot.com/_functions/test
// URL to call this HTTP function from the saved site looks like: https://splitspot.com/_functions-dev/test
export function post_test(request){
	let response = {
		"headers": {
			"Content-Type": "application/json"
		}
	};

    return request.body.json().then(
        (params) => {
            response.body = {
                "status": "Success!!!!",
                "unitId": params.unitId,
                "field": params.field,
                "value": params.value
            }

            return ok(response);
        }
    );
}

// URL to call this HTTP function from the published site looks like: https://splitspot.com/_functions/updateRoom
// URL to call this HTTP function from the saved site looks like: https://splitspot.com/_functions-dev/updateRoom
export function post_updateRoom(request){
    /*
    A function that (1) validates the inputs, (2) finds the data to update, (3) and performs the update.

    request: Data sent in json format to update the price of a unit or a room, or the availability of a unit or a room.

    Expected request to update Unit Price
    {
        "unitId":______,
        "field":"unitPrice",
        "value":800
    }

    Expected request to update Unit Price
    {
        "unitId":______,
        "field":"unitAvailable",
        "value":[true, "Available Now!", "5/5 Rooms Available"]
    }

    Expected request to update Unit Price
    {
        "unitId":______,
        "field":"roomAvailable",
        "value":["A", true]
    }

    Expected request to update Unit Price
    {
        "unitId":______,
        "field":"roomPrice",
        "value":["B", 1000]
    }
    */

	let response = {
		"headers": {
			"Content-Type": "application/json"
		}
	};

    // [1]: Validating the input
    return request.body.json().then(
        (params) => {
            let unitId = 0;

            try{
                unitId = params.unitId;
                if (typeof unitId==='undefined'){
                    throw Error(`Expecting unitId, but not found`);
                }

                switch (params.field) {
                    case "unitPrice":
                        break;
                    case "unitAvailable":
                        if (params.value.length !== 3){
                            throw Error(`Unexpected and array with 3 elements, but received '${params.value}'`);
                        }
                        break;
                    case "roomAvailable":
                    case "roomPrice":
                        if (params.value.length !== 2){
                            throw Error(`Unexpected and array with 2 elements, but received '${params.value}'`);
                        }
                        break;
                    default:
                        throw Error(`Unexpected field. Expecting 'unitPrice', 'unitAvailable', 'roomAvailable', 'roomPrice' but received '${params.field}'`);
                }
            } catch (err) {
                response.body = {
                    "status": "Bad Request",
                    "status_msg": err.message,
                    "details": params
                };
                return badRequest(response);
            }

            // [2]: Extracting the row to update and setting its columns with the new values
            // If you want to point to test data, use the following
            //     return wixData.get("Roomstest", unitId).then(
            return wixData.get("Team", unitId).then(
                (toUpdate) => {
                    switch (params.field) {
                        case "unitPrice":
                            toUpdate["numPrice"] = params.value;
                            toUpdate["startingPrice"] = params.value!==null?formatter.format(params.value):null; // 'formatter.format' formats the number to currency format ($2,500)
                            break;
                        case "unitAvailable":
                            toUpdate["availBool"] = params.value[0];
                            toUpdate["jobTitle"] = params.value[1];  //-- Available Now! | Not Available | Avaliable December 1st
                            toUpdate["occupancy"] = params.value[2];  //-- 1/4 Rooms Available.
                            //toUpdate["roomsAvailable"] = params.value[2];  //-- This field only exists in Roomstest and it replaces occupancy. Change it if you want to point to test.
                            break;
                        case "roomAvailable":
                            toUpdate[`bedroom${params.value[0]}Availability`] = params.value[1];
                            break;
                        case "roomPrice":
                            let bedroomPrice = `Bedroom ${params.value[0]}: ${params.value[1]!==null?formatter.format(params.value[1]):''}`;
                            toUpdate[`bedroom${params.value[0]}Price`] = bedroomPrice; // 'formatter.format' formats the number to currency format ($2,500)
                            break;
                    }

                    let options = {
                        "suppressAuth": true,
                        "suppressHooks": true
                    };

                    // [3]: Performing the update
                    // If you want to point to test data, use the following
                    //     return wixData.update("Roomstest", toUpdate, options).then(
                    return wixData.update("Team", toUpdate, options).then(
                        (result) => {
                            response.body = {
                                "status": "Success"
                            };
                            return ok(response);
                        }
                    ).catch(
                        (err) => {
                            response.body = {
                                "status": "Error",
                                "status_msg": err.message,
                                "params": toUpdate
                            };
                            return serverError(response);
                        }
                    )
                }
            ).catch(
                (err) => {
                    response.body = {
                        "status": "Not Found",
                        "status_msg": err.message,
                        "params": params
                    };
                    return notFound(response);
                }
            )
        }
    ).catch(
        (err) => {
			response.body = {
				"status": "Bad Request",
				"status_msg": err
			};
			return badRequest(response);
        }
    )
}

// URL to call this HTTP function from the published site looks like: https://splitspot.com/_functions/batchUpdate
// URL to call this HTTP function from the saved site looks like: https://splitspot.com/_functions-dev/batchUpdate
export function post_batchUpdate(request){
	let response = {
		"headers": {
			"Content-Type": "application/json"
		}
	};

    return request.body.json().then(
        (params) => {
            let unitId = params.unitId;

            return wixData.get("Team", unitId).then(
                (toUpdate) => {
                    if (toUpdate !== null){
                        toUpdate["numPrice"] = params.unitPrice;
                        toUpdate["startingPrice"] = params.unitPrice!==null?formatter.format(params.unitPrice):null;
                        toUpdate["availBool"] = params.unitAvailability[0];
                        toUpdate["jobTitle"] = params.unitAvailability[1];
                        toUpdate["occupancy"] = params.unitAvailability[2];

                        let numberOfRooms = params.rooms.length;
                        for(let i = 0; i<numberOfRooms; i++){
                            let bedroomPrice = `Bedroom ${params.rooms[i]}: ${params.roomsPrice[i]!==null?formatter.format(params.roomsPrice[i]):''}`;
                            toUpdate[`bedroom${params.rooms[i]}Price`] = bedroomPrice;
                            toUpdate[`bedroom${params.rooms[i]}Availability`] = params.roomsAvailability[i];
                        }

                        let options = {
                            "suppressAuth": true,
                            "suppressHooks": true
                        };

                        return wixData.update("Team", toUpdate, options).then(
                            (result) => {
                                response.body = {
                                    "status": "Success"
                                };
                                return ok(response);
                            }
                        ).catch(
                            (err) => {
                                response.body = {
                                    "status": "Error",
                                    "status_msg": err.message,
                                    "params": params
                                };
                                return serverError(response);
                            }
                        );
                    }
                    else{
                        response.body = {
                            "status": "Not Found",
                            "status_msg": `Unit ${unitId} not found`,
                            "params": params
                        };
                        return serverError(response);
                    }
                }
            ).catch(
                (err) => {
                    response.body = {
                        "status": "Error",
                        "status_msg": err.message,
                        "params": params
                    };
                    return serverError(response);
                }
            );
        }
    );
}