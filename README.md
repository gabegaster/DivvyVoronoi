DivvyVoronoi
============

A visualization of bike trips in Chicago. See what Divvy data can say about Chicago's geography.

Uses [D3js](http://d3js.org/) and [Leaflet](http://leafletjs.com/) to visualize a heatmap over voronoi tiles around the City of Chicago's [Divvy](http://divvybikes.com/) Stations.

Feedback, fixes and suggestions are most welcome! Thanks for checking it out.

Getting Started
===============
Uses [data-workflow](https://github.com/deanmalmgren/data-workflow.git) to automate the entire data workflow, from munging to running the server locally. 

Requires numpy and data-workflow.

If you have data-workflow and numpy, all you need to do is git clone, type `workflow` in the command-line, wait ~90 seconds for the data crunching, and goto `localhost:8000` in your web-browser to see the locally hosted version of the visualization. 
