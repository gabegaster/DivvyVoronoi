'''Aggregates individual trips to get trip-counts from A-to-B. Makes csv for web.
'''

import numpy as np
import csv
import sys
import json
from itertools import izip

data_dir = "data/Divvy_Stations_Trips_2013"
web_dir = "web/data"

def read_stations():
    stations = {}
    with open("%s/Divvy_Stations_2013.csv"%data_dir,'r') as f:
        f.next()
        r = csv.reader(f)
        for index,line in enumerate(r):
            stations[line[1]] = index-1
    return stations

def read_trips():
    with open("%s/Divvy_Trips_2013.csv"%data_dir,'r') as f:
        stream = csv.reader(f)
        stream.next()
        for ind,line in enumerate(stream):
            start = line[6]
            stop  = line[8]
            yield start,stop

def get_counts(name2row):
    n = len(name2row)
    A = np.array(np.zeros((n,n)))

    for trip in read_trips():
        x,y = map(name2row.get, trip)
        A[x,y] += 1
    return A

def main():
    name2row = read_stations()
    counts = get_counts(name2row)
    old_file_name = "%s/Divvy_Stations_2013.csv" % data_dir
    new_file_name = "%s/Station_Data.csv" % web_dir

    with open(old_file_name,'r') as old, open(new_file_name,"w") as new:
        reader = csv.reader(old)
        writer = csv.writer(new)

        header = reader.next()
        header.append("outCounts")
        writer.writerow(header)
        for line,station_data in izip(reader,counts):
            line.append(list(station_data))
            writer.writerow(line)

if __name__=="__main__":
    main()
