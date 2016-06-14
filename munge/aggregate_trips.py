'''Aggregates individual trips to get trip-counts from A-to-B. Makes csv for web.
'''

import numpy as np
import csv
import sys
import json
import os

from itertools import izip

# data_dir = "data/Divvy_Stations_Trips_2013"
data_dir = "data/divvy_data_challenge_2014"
web_dir = "web/data"

def read_stations():
    stations = {}
    for filename in os.listdir("%s/stations" % data_dir):
        with open("%s/stations/%s"%(data_dir, filename), 'r') as f:
            r = csv.DictReader(f)
            for index,line in enumerate(r):
                if "id" not in line:
                    import ipdb
                    ipdb.set_trace()
                stations[line['id']] = line
    id2index = {}
    for index, _id in enumerate(stations):
        id2index[_id] = index
    return stations, id2index

def read_trips():
    for filename in os.listdir("%s/trips/" % data_dir):
        if "Divvy" not in filename: 
            continue
        file_name = "%s/trips/%s"%(data_dir, filename)
        with open(file_name, 'r') as f:
            stream = csv.DictReader(f)
            for ind, line in enumerate(stream):
                start = line["from_station_id"]
                stop  = line["to_station_id"]
                yield start, stop, line

def get_counts(id2row):
    n = len(id2row)
    A = np.array(np.zeros((n,n)))

    for start,stop,_ in read_trips():
        x,y = id2row.get(start), id2row.get(stop)
        if None in (x,y):
            print "FUCK"
            import ipdb
            ipdb.set_trace()
        else:
            A[x,y] += 1
    return A

def write(id2station, counts):
    file_name = "%s/Station_Data.csv" % web_dir
    old_file_name = "%s/Divvy_Stations_2013.csv" % data_dir
    with open(old_file_name, "r") as f:
        fieldnames = csv.reader(f).next() 
    fieldnames.append("outCounts")
   
    with open(file_name,"w") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, 
                                extrasaction="ignore")
        writer.writeheader()

        for line,station_counts in izip(id2station.values(),counts):
            line["outCounts"] = list(station_counts)
            writer.writerow(line)

def tests():
    id2station, id2row = read_stations()
    counts = get_counts(id2row)
    # assert sum(counts[name2row["Normal Ave & Archer Ave"]]) == 425

    # assert counts[name2row["Lake Shore Dr & Monroe"],
    #        name2row["Streeter Dr & Illinois St"]] == 1297

    return id2station, counts

def main():
    write(*tests())

if __name__=="__main__":
    main()
