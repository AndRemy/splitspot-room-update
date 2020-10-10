import requests
import time
import math
import pandas as pd
from datetime import datetime as dt


# [1] Functions
def get_month_distance(destination_month):
    """
    Function that calculate the distance between one month and another one (destinationMonth - currentMonth).
    If the destination month is greater that the current month, it assumes that the destination month belongs
    to the next year.

    :param destination_month: Month from where the calculation will end.
    :return: The distance in number of months between the two months.
    """
    dest_month = monthNumber[destination_month]
    if dest_month < currentMonth:
        return (dest_month + len(monthNumber.keys())) - currentMonth
    else:
        return dest_month - currentMonth


def get_room_active_text(room_row):
    """

    :param room_row:
    :return:
    """
    if bool(room_row["IsRoomActive"]):
        if room_row["Status"] == "Upcoming Vacancy":
            return f"Available {room_row['Date']} 1st"
        else:
            return "Available Now!"
    else:
        return "Not Available"


def complete_unit_data(unit_df):
    """

    :param unit_df:
    :return:
    """
    is_unit_active = bool(unit_df["IsRoomActive"].sum())
    unit_df["IsUnitActive"] = is_unit_active

    available_now = unit_df.loc[
        (unit_df["IsRoomActive"] == True) & (unit_df["Status"] != "Upcoming Vacancy")
    ]

    if is_unit_active:
        if len(available_now.index) > 0:
            unit_df["UnitActiveText"] = "Available Now!"
            unit_df["UnitPrice"] = available_now["Price"].min()
        elif len(available_now.index) == 0:
            month = unit_df.loc[unit_df["MonthDistance"] == unit_df["MonthDistance"].min(), "Date"].iloc[0]
            unit_df["UnitActiveText"] = f"Available {month} 1st"
            unit_df["UnitPrice"] = unit_df.loc[unit_df["IsRoomActive"], "Price"].min()
        else:
            unit_df["UnitActiveText"] = "Undefined"
            unit_df["UnitPrice"] = None
    elif ~is_unit_active:
        unit_df["UnitActiveText"] = "Not Available"
        unit_df["UnitPrice"] = None
    else:
        unit_df["UnitActiveText"] = "Undefined"
        unit_df["UnitPrice"] = None

    available = len(unit_df.loc[unit_df["IsRoomActive"] == True].index)
    total_rooms = len(unit_df.index)
    unit_df["UnitOccupancy"] = f"{available}/{total_rooms} Rooms Available"

    return unit_df


def get_rooms_data(room_row):
    result = [
        room_row["Room"],
        room_row["IsRoomActive"],
        room_row["Price"],
        room_row["RoomActiveText"]
    ]

    # for price in result[2]:  # Price List
    #     price = price if price != np.nan else None

    return result


def get_request_parameters(unit_df):
    """
    {
        "unitId":____,
        "unitPrice":750,
        "unitAvailability":[true, "Available Now!", "5/5 Rooms Available"],
        "rooms":["A", "B", "C", "D", ...],
        "roomsPrice":[800, 1000, 950, 750, ...],
        "roomsAvailability":["Available Now!", "Available November 1st", "Not Available", "Not Available", ...]
    }
    :param unit_df:
    :return:
    """
    unit_data = unit_df.iloc[0, :]

    result = {
        "unitId": unit_data["Wix ID"],
        "unitPrice": unit_data["UnitPrice"] if not unit_data.isna()["UnitPrice"] else None,  # Replacing nan with None. Nan generates a bad request after parsing the parameters to json
        "unitAvailability": [
            True if unit_data["IsUnitActive"] else False,  # This is done to transform numpy bool to python bool because numpy bool cannot be parsed to JSON format (which is needed to perform the request)
            unit_data["UnitActiveText"],
            unit_data["UnitOccupancy"]
        ],
        "rooms": [],
        "roomsPrice": [],
        "roomsAvailability": []
    }

    rooms_data = unit_df.apply(get_rooms_data, axis=1).values
    for room in rooms_data:
        result["rooms"].append(room[0])  # Room
        result["roomsPrice"].append(room[2] if (room[1]) and (not math.isnan(room[2])) else None)  # If room is active, set as Room Price, otherwise, set as None
        result["roomsAvailability"].append(room[3])  # Room Availability Text

    return result


def request_post_service(params, service_url):
    tries = 0
    success = False

    try:
        while tries < max_retry:
            response = requests.post(service_url, json=params)

            if response.status_code == 200:
                tries = max_retry
                success = True
            elif response.status_code == 503 and tries < max_retry:
                tries += 1
                time.sleep(sleep_time)
            else:
                tries = 3
                success = False
                response_body = response.json()
                print(f"Error! Response Code {response.status_code}: {response_body['status_msg'] if len(response_body.keys()) > 0 else ''}")
                print(f"\tRequest: {response.request.body}")
    except Exception as ex:
        print(f"An Exception occurred: {ex}")
        success = False

    return success


# [2] Global variables
sleep_time = 1
max_retry = 3

liveServiceURL = "https://splitspot.com/_functions/batchUpdate"
sandboxServiceURL = "https://splitspot.com/_functions-dev/batchUpdate"

currentMonth = dt.today().month

status = {
    "Upcoming Vacancy": True,
    "Vacant": True,
    "Roommate Introduction": True,
    "Lease Sent": True,
    "On-boarding": True,
    "Occupied": False,
    "Lease Signed": False,
    "Deposits Complete": False,
    "Off-boarding": False
}

monthNumber = {
  "January": 1,
  "February": 2,
  "March": 3,
  "April": 4,
  "May": 5,
  "June": 6,
  "July": 7,
  "August": 8,
  "September": 9,
  "October": 10,
  "November": 11,
  "December": 12
}

# [3] Process
start_time = dt.now()
print(dt.strftime(dt.now(), '%Y-%m-%d %H:%M'))

# Importing most recent data from downloaded excel
data_df = pd.read_excel("data/Rooms Status - Master.xlsx", sheet_name="List")
data_df = data_df[~data_df["Wix ID"].isna()]

# Transforming data
data_df = data_df.loc[:, ["Wix ID", "Room", "Price", "Status", "Date"]]
data_df["IsRoomActive"] = data_df["Status"].map(status)
data_df["MonthDistance"] = data_df.loc[data_df["Date"].notna(), "Date"].apply(get_month_distance)
data_df["RoomActiveText"] = data_df.apply(get_room_active_text, axis=1)

# Transforming data by group
grouped_df = data_df.groupby("Wix ID")
final_df = grouped_df.apply(complete_unit_data)

# Structuring request parameters
grouped_df = final_df.groupby("Wix ID")
final_structure = grouped_df.apply(get_request_parameters)  # Returns a pandas.Series

# Performing the update
print(f"Updating on Live...")
result = final_structure.apply(request_post_service, service_url=liveServiceURL)  # Returns a pandas.Series
print("\nWix Id successfully updated to Live:")
print(*result[result == True].index.tolist(), sep="\n")
print("\nWix Id with an error during updated to Live:")
print(*result[result == False].index.tolist(), sep="\n")

print(f"\nUpdating on Sandbox...")
result = final_structure.apply(request_post_service, service_url=sandboxServiceURL)  # Returns a pandas.Series
print("\nWix Id successfully updated to Sandbox:")
print(*result[result == True].index.tolist(), sep="\n")
print("\nWix Id with an error during updated to Sandbox:")
print(*result[result == False].index.tolist(), sep="\n")

end_time = dt.now()
ttr = end_time-start_time
print(f"\nBatch Update Runtime: {ttr.seconds/60} min, {ttr.seconds%60} sec")