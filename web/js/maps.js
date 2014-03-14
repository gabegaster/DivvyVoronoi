// replace "toner" here with "terrain" or "watercolor"
var layer = new L.StamenTileLayer("toner");
var lat = 41.88362062793376, 
    lon = -87.64411926269531; // the coordinates of Chicago

var map = new L.Map("map", {
    center: new L.LatLng(lat,lon),
    zoom: 12,
    minZoom: 11,
    maxZoom: 15,
    doubleClickZoom: false,
});
map.addLayer(layer);

var corners_of_map = [[42.,-87.75],
		      [41.75,-87.55]];

var svg = d3.select(map.getPanes().overlayPane).append("svg");
var g     = svg.append("g").attr("class", "leaflet-zoom-hide");
var clips = svg.append("g").attr("id","point-clips");
var svg_legend = d3.select("#legend").append("svg")

var blues = colorbrewer.Blues[6].slice()
blues[0] = "transparent"
var side_length = 60;
var padding = 1;
// make the legend
svg_legend.selectAll("rect")
    .data(blues.slice(1,7))
    .enter()
    .append("rect")
    .style("fill",function(d){return d;})
    .attr("width", side_length)
    .attr("height", side_length)
    .attr("x", function(d,i){
	return (padding + side_length)*i;})
    .attr("y",0);
svg_legend.selectAll("text")
    .data([0,0,0])
    .enter()
    .append("text")

// These are transformation functions for d3, that allow my lat long
// data to interface with leaflet
function projectPoint(x, y) {
    // var point = latLng2point(x,y);
    // this.stream.point(point.x, point.y);
    this.stream.point(x,y);
}
function latLng2point(x,y){
    return map.latLngToLayerPoint(new L.LatLng(y, x));
}
function d2point(d){
    return latLng2point(d.longitude,d.latitude);
}

var transform = d3.geo.transform({point: projectPoint});
var path = d3.geo.path().projection(transform);

var station_detail = d3.select("#station_detail");
station_detail.append("text")
    .text("Mouse over a station: where do they go?");

function polygon2geoJsonFeature(polygon){
    // geo_json polygons need to start and stop at the same point
    polygon.push(polygon[0]) 
    return {
	"type": "Feature",
	"properties": {
	    "name": polygon.point.name,
	    "outCounts": $.parseJSON(polygon.point.outCounts),

	    // keeps track of initial index, never changes.
	    "index":polygon.point.index, 

	    // keeps track of which tile should be on top. An int,
	    // inititalized at 0. Each recoloring, this.top++
	    "top":polygon.point.top,
	},
	"geometry": {
	    "type": "Polygon",
	    "coordinates": [polygon]
	}
    };
}

function data2geo_json(data){
    // makes the voronoi and returns a geo_json structure

    polygons = voronoi(data); // this is the voronoi polygons
    geo_json = {type: "FeatureCollection",
		features: _.map(polygons, // this is not a geojson
				// but a plane json.
				// TODO:convert these back
				// to the sphere....that
				// might be difficult... ?
				polygon2geoJsonFeature)
	       };
    return geo_json;
}

var voronoi = d3.geom.voronoi()
    .x(function(d) { return d.x() })
    .y(function(d) { return d.y() })

function how_far_to_walk(){
    // number of pixels ~= .6miles
    return Math.pow(2,map.getZoom()-7);
}

d3.csv("data/Station_Data.csv", function(data){
    // so that each data point remembers it place in the ordering
    _.each(data,function(e,i){ 
	e.longitude = +e.longitude;
	e.latitude = +e.latitude;
	e.index=i; // set index, never change it.
	e.top=0;   // init top, it will change.
	e.x = function(){ return d2point(e).x};
	e.y = function(){ return d2point(e).y};
    });
    // get_totals(data);
    // var colorScale = d3.scale.quantize()
    // 	.domain(d3.extent(data, function(d){
    // 	    return d.in_out;
    // 	}))
    // 	.range(blues);

    global_data = data;

    clips.selectAll("clipPath")
	.data(data)
	.enter().append("clipPath")
	.attr("id", function(d, i) { return "clip-"+i;})
	.append("circle")
	.attr('cx', function(d) { 
	    return d.x(); })
	.attr('cy', function(d) { 
	    return d.y(); })
	.attr('r', how_far_to_walk);

    g.selectAll(".centers")
	.data(data)
	.enter()
	.append("circle")
	.attr("class","centers")
	.attr('cx', function(d) { 
	    return d.x(); })
	.attr('cy', function(d) { 
	    return d.y(); })
	.attr('r', how_far_to_walk() / 32)
	.attr("fill","#196E82")
	.attr("stroke","black");

    map.setMaxBounds(
	L.latLngBounds(corners_of_map.map(function(d){
	    return new L.LatLng(d[0],d[1]);})))

    geo_json = data2geo_json(data);
    number_of_choices = 1; // global variable to keep track of how
			   // many times i've recolored tiles. This
			   // will ensure that the last tile has the
			   // biggest top value, so it'll be on top.
    
    var mouseover_enabled = true;

    var feature = g.selectAll("path")
    	.data(geo_json.features)
    	.enter().append("path")
        .attr("clip-path", 
	      function(d,i) { return "url(#clip-"+i+")"; })
	// .style("fill", function(d){
	//     return colorScale(d.in_out);})
       .on("click", on_click)         
	.on("mouseover", on_mouseover); 
    // mouse_over works inititally, until there's been a click. When
    // there's been a click -- mouse_over is disabled.

    map.on("viewreset", reset);
    reset();

    function on_mouseover(d,i){
	var that = this;
	if (mouseover_enabled){
	    color_tiles(d,i,that);
	}
    }

    function on_click(d,i){
	var that = this;
	mouseover_enabled = !mouseover_enabled;
	color_tiles(d,i,that);
    }

    function color_tiles(geo_feature,index,that){
	// update scale and recolors tiles according to dynamic scale
	geo_feature.properties.top = number_of_choices++;
	
	station_detail.selectAll("text").remove();
	station_detail
	    .append("text")
	    .text(geo_feature.properties.name);

	var extent = d3.extent(geo_feature.properties.outCounts);
	colorScale = d3.scale.quantize()
	    .domain(extent)
	    .range(blues);
	var small = extent[1]/6; //  *3/2;
	var middle= small * 3;
	var big   = extent[1];
	var text_extent = [small,middle,big]
	    .map(Math.round)
	    .map(numberWithCommas)
	svg_legend.selectAll("text")
	    .data(text_extent)
	    .text(function(d){return d;})
	    .attr("y", side_length + 20) // /2+5)
	    .attr("x", function(d,i){
		return (padding + side_length)*i*2+side_length/2;})
	    .attr("text-anchor", "middle");

	// divvy: 5DBCD2
	// darker 196E82
	g.selectAll("path")
	    .sort(function(a,b){ 
		return a.properties.top-b.properties.top; })
	    .style("stroke","white")
	    .style("stroke-width",function(d){
		if (geo_feature.properties.outCounts[d.properties.index]>small){
		    return .3;
		} else {
		    return 0;
		}
	    });

	d3.select(that)
	    .style("stroke","black")
	    .style("stroke-width","2.1");

	g.selectAll("path")
	    .style("fill", function(d){
		return colorScale(geo_feature
				  .properties
				  .outCounts[d.properties.index]);
	    }); // Assumes the ordering in outCounts matches the
		// INITIAL ordering of the paths. This ordering can
		// change, but index doesn't.

	//d3.select("legend")
	var top3_indices = argSort(geo_feature.properties.outCounts);
	top3_originate = [];
	_.each( top3_indices.sortIndices.slice(0,3), function(d,i) {
	    top3_originate.push({
		rank:i+1,
		name:data[d].name,
		count:top3_indices[i]
	    });
	});
	
	top3_terminate = data.map(function(d,i){
	    return {name:d.name,
		    count:$.parseJSON(d.outCounts)[geo_feature.properties.index]
		   };})
	    .sort(function(a,b){ return b.count - a.count})
	    .slice(0,3)
	_.each(top3_terminate, function(d,i){
	    d.rank = i+1;
	});

	original_total = geo_feature.properties.outCounts
	    .reduce(function(pv, cv) { return pv + cv; }, 0);
	terminal_total = geo_json.features
	    .map(function(x){
		return x.properties.outCounts[geo_feature.properties.index]})
	    .reduce(function(a,b){return a+b});

	top3_originate.push({rank:"TOTAL",
			     name:"all stations",
			     count:original_total});
	top3_terminate.push({rank:"TOTAL",
			     name:"all stations",
			     count:terminal_total});

	$("span.station-name").html(geo_feature.properties.name)
	update_table("terminate",top3_terminate,"to");
	update_table("originate",top3_originate,"from");
    };

    function update_table(direction, data,text){
	function td(stuff,class_name){
	    class_name = class_name || "";
	    return "<td class='"+class_name+"'>"+stuff+"</td>";
	}
	function span(stuff,class_name){
	    class_name = class_name || "";
	    return "<span class='"+class_name+"'>"+stuff+"</span>";
	}
	var html = ""

	_.each(data, function(d){
	    var tds = td(numberWithCommas(d.count),     "NTrips");
	    tds +=    td("&nbsp;"+text+" "+nice_name(d),"RowStationName");
	    html += "<tr>"+ tds +"</tr>";
	});

	$("#"+direction +">tbody").html(html)
    }

    function nice_name(d){
	return d.name
	    .replace(/ & /g,"/")
	    .replace(/ St/g,"")
	    .replace(/ Dr/g,"")
	    .replace(/ Ave/g,"")
	    .replace(/ Pkwy/g,"")
	    .replace(/ Rd/g,"")
	    .replace(/ Blvd/g,"")
	    .replace(/ Way/g,"")
	    .replace(/ Ln/g,"")
	    .replace(/ Ct/g,"")
	    .replace(/ Plaza/g,"")
	    .replace(/ Pl/g,"")
	    .replace(/Merchandise Mart/g,"MerchMart")
    }

    function reset(){
	// even though geo_json doesn't change, since path is a
	// function that depends on the map boundaries (zoom level,
	// position), the path function needs to be reset
	geo_json = data2geo_json(data);
	feature.data(geo_json.features); // updates the features w new data
	
	var bounds      = path.bounds(geo_json);
	var topLeft     = bounds[0];
    	var bottomRight = bounds[1];

    	svg .style("width", bottomRight[0] - topLeft[0] + "px")
    	    .style("height", bottomRight[1] - topLeft[1] + "px")
    	    .style("left", topLeft[0] + "px")
    	    .style("top", topLeft[1] + "px")
	
    	g   .attr("transform", 
    		  "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

	// update the coordinates of the voronoi polygons
	feature.attr("d",path);

	// update the coordinates of the circles
	clips.selectAll("circle")
	    .attr('cx', function(d) { 
		return d.x(); })
	    .attr('cy', function(d) { 
		return d.y(); })
	    .attr('r', how_far_to_walk());
	
	g.selectAll(".centers")
	    .attr("class","centers")
	    .attr('cx', function(d) { 
		return d.x(); })
	    .attr('cy', function(d) { 
		return d.y(); })
	    .attr('r', how_far_to_walk() /32)
	    .attr("fill","#196E82")
	    .attr("stroke","black");
    };
})

function argSort(toSort) {
    var out = new Array(300);
    for (var i = 0; i < toSort.length; i++) {
	out[i] = [toSort[i], i];
    }
    out.sort(function(a, b)
	     {
		 return b[0]-a[0];	
	     });
    // out.map(function(x){return x[1];});

    out.sortIndices = [];
    for (var j = 0; j < toSort.length; j++) {
	out.sortIndices.push(out[j][1]);
	out[j] = out[j][0];
    }
    return out;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// function get_totals(data){
//     _.each(data, function(row){
//  	original_total = $.parseJSON(row.outCounts)
// 	    .reduce(function(pv, cv) { return pv + cv; }, 0);
// 	terminal_total = data
// 	    .map(function(column){
// 		return $.parseJSON(column.outCounts)[row.index];})
// 	    .reduce(function(a,b){return a+b;});
// 	row.in_out = original_total + terminal_total;
//     });
// }
	  
/// MARGIN STUFF -- because leaflet seems to ignore/override
/// bootstrap. adapted from
/// http://gis.stackexchange.com/questions/62491/sizing-leaflet-map-inside-bootstrap/62663#62663

var mapmargin = 70;
$(window).on("resize", resize);
resize();
function resize(){

    if($(window).width()>=980){
        $('#map_wrapper').css("padding-left", mapmargin);
    }else{
        $('#map_wrapper').css("padding-left", 0);
    }

}