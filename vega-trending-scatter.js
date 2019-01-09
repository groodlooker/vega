// Contour Plot Example
// A contour plot depicts the density of data points using a set of discrete levels. Akin to contour lines on topographic maps, 
// each contour boundary is an isoline of constant density. 
// Kernel density estimation is performed to generate a continuous approximation of the sample density. 
// Vega uses the d3-contour module to perform density estimation and generate contours in the form of GeoJSON polygons.

//add ability to specify dimensions as quantitative
looker.plugins.visualizations.add({
    create: function(element, config){

        container = element.appendChild(document.createElement("div"));
        container.setAttribute("id","my-vega");
        // var input = element.appendChild(document.createElement("input"));
        // input.setAttribute("id","vega-input");
        // input.setAttribute("type","range");
        // var curVal = element.appendChild(document.createElement("p"));
        // curVal.setAttribute("id","valLabel");
  //         <p>Default range slider:</p>
  // <input type="range" min="1" max="100" value="50">

    }, 
    updateAsync: function(data, element, config, queryResponse, details, doneRendering){
 
      var myData = [];
      var dataProperties = {};
      var dims = [];
      var meas = [];
      var allFields = [];
      var chartWidth;
      var chartHeight;

      var options = createOptions(queryResponse)['options'];
      this.trigger('registerOptions', options);

      if (Object.keys(config).length > 2) {

      if (config['fixed_height'] != "" && typeof config['fixed_height'] != "undefined") {
        chartHeight = config['fixed_height'];
      } else {
        var parent = document.getElementById("my-vega").parentElement;
        chartHeight = parent.offsetHeight * 0.78;
      }

      if (config['fixed_width'] != "" && typeof config['fixed_width'] != "undefined") {
        chartWidth = config['fixed_width'];
      } else {
        chartWidth = document.getElementById("my-vega").offsetWidth * 0.81;
      }

//array to find min/max within path column
var pathArray = [];
//get the data and store the links
      for (var cell in data) {
        var obj = data[cell];
        var dataDict = {};
        dataDict['links'] = [];
        for (var key in obj){
          var shortName = key.replace(".","_");
          dataDict[shortName] = obj[key]['value'];
          if (shortName == config['path']) {pathArray.push(obj[key]['value']);}
          if (typeof obj[key]['links'] != "undefined") {

            //create array of all links for a row of data
            for(var l=0;l<obj[key]['links'].length;l++){

              //grab link label and add field name for clarity in menu
              var currentLabel = obj[key]['links'][l]['label'];
              currentLabel = currentLabel + " (" + shortName + ")";
              obj[key]['links'][l]['label'] = currentLabel;
            }
            //add links for field in row
            dataDict['links'].push(obj[key]['links']);
          }
        }
        //flatten to make single depth array
        dataDict['links'] = dataDict['links'].flat();
        myData.push(dataDict);
      }

      //create array of all measures for lookup purposes
      queryResponse.fields.measure_like.forEach(function(field){
        var fieldName = (field.name).replace(".","_");
        meas.push(fieldName);      
      });
      //create array of all dimensions for lookup purposes
      queryResponse.fields.dimension_like.forEach(function(field){
        var fieldName = (field.name).replace(".","_");
        dims.push(fieldName);      
      });

      allFields = meas.concat(dims);

      var dataFormatDict = {
        "$#,##0" : "$,.0f",
        "$#,##0.00" : "$,.2f",
        "#,##0.00%" : ",.2%",
        "#,##0.0%" : ",.1%",
        "#,##0%" : ",.0%",
        "null" : ""
      };

      //determine number format
      for (var field in allFields) {
        var lookerName = allFields[field];
        dataProperties[allFields[field]] = {};
        //get friendly names for measures
        queryResponse.fields.measure_like.forEach(function(measure){
          // var friendlyName = 
          if (lookerName == measure['name'].replace(".","_")) {
            //get label short or label to handle table calcs
            if (typeof measure['label_short'] != "undefined") {
              dataProperties[allFields[field]]['title'] = measure['label_short'];
            } else {
              dataProperties[allFields[field]]['title'] = measure['label'];
            }
            dataProperties[allFields[field]]['valueFormat'] = dataFormatDict[String(measure['value_format'])];
            if (measure['type'] == "yesno") {
              dataProperties[allFields[field]]['dtype'] = "nominal";
            } else {
              dataProperties[allFields[field]]['dtype'] = "quantitative";
            }
            
          } 
        });
        //get friendly names for dimensions
        queryResponse.fields.dimension_like.forEach(function(dimension){
          if (lookerName == dimension['name'].replace(".","_")) {
            if (typeof dimension['label_short'] != "undefined") {
              dataProperties[allFields[field]]['title'] = dimension['label_short'];
            } else {
              dataProperties[allFields[field]]['title'] = dimension['label'];
            }       
            dataProperties[allFields[field]]['valueFormat'] = dataFormatDict[String(dimension['value_format'])];
            dataProperties[allFields[field]]['dtype'] = "nominal";
          } 
        });
      }

      var maxy = Math.max.apply(Math, pathArray);
      var miny = Math.min.apply(Math, pathArray);

      if (config['set_time'] != null && typeof config['set_time']) {
        maxy = config['set_time'];
      }

      console.log(typeof document.getElementById("vega-input"));

      // document.getElementById("vega-input").setAttribute("min",miny);
      // document.getElementById("vega-input").setAttribute("max",maxy);
      // document.getElementById("vega-input").setAttribute("value",maxy);
      // document.getElementById("valLabel").innerHTML = document.getElementById("vega-input");

      if (maxy != "NaN") {
        
      

      console.log(pathArray.sort()[0]);
      console.log(pathArray.sort()[pathArray.length - 1]);

      var labelPosX = chartWidth * 0.33;
      var labelPosY = chartHeight / 2;

      //construct the tooltip with appropriate formatting
      var tooltipFields = [];

      var tipString = "{";
      for (datum in dataProperties) {
        var tip = {};
        // tip['field'] = datum;
        var fieldTip = "";
        if (dataProperties[datum]['dtype'] == "quantitative") {
          tipString += "'"+ dataProperties[datum]['title'] + "': format(datum.this."+datum+", '"+dataProperties[datum]['valueFormat']+"'),";
        } else {
          tipString += "'"+ dataProperties[datum]['title'] + "': datum.this."+datum+",";
        }
      }

      tipString += "}";


      if (config['x'] == "" || typeof config['x'] == "undefined") {
        config['x'] = defaultDim;
      }

      if (config['y'] == "" || typeof config['y'] == "undefined") {
        config['y'] = defaultDim2;
      }

      var datumX = config['x'];
      var datumY = config['y'];

      var xScale = "scale('x', datum."+datumX+")";
      var yScale = "scale('y', datum."+datumY+")";

      if (config['color_scheme'] == "") {
        config['color_scheme'] = "greenblue";
      }

      var chart = {
        "$schema": "https://vega.github.io/schema/vega/v4.json",
        "width": chartWidth,
        "height": chartHeight,
        "padding": 5,

        "data": [
          {
            "name": "inputData",
            "values": myData
          },
          {
            "name": "master_timeline",
            "source": "inputData",
            "transform": [
              {"type": "filter", "expr": "timeline && datum."+config['detail']+" == timeline."+config['detail']+""},
              {"type": "collect", "sort": {"field": config['path']}}
            ]
          },
          {
            "name": "thisYear",
            "source": "inputData",
            "transform": [
              {"type": "filter", "expr": "datum."+config['path']+" == currentYear"}
            ]
          },
          {
            "name": "prevYear",
            "source": "inputData",
            "transform": [
              {"type": "filter", "expr": "datum."+config['path']+" == currentYear - stepYear"}
            ]
          },
          {
            "name": "nextYear",
            "source": "inputData",
            "transform": [
              {"type": "filter", "expr": "datum."+config['path']+" == currentYear + stepYear"}
            ]
          },
          {
            "name": "details",
            "source": "inputData",
            "transform": [
              {"type": "aggregate", "groupby": [config['detail']]}
            ]
          },
          {
            "name": "maxStep",
            "source": "inputData",
            "transform": [
              {
                "type": "aggregate",
                "ops":["max"],
                "fields":[config['path']],
                "as":["maxVal"]
              }
            ]
          },
          {
            "name": "interpolate",
            "source": "details",
            "transform": [
              {
                "type": "lookup",
                "from": "thisYear", "key": config['detail'],
                "fields": [config['detail']], "as": ["this"],
                "default": {}
              },
              {
                "type": "lookup",
                "from": "prevYear", "key": config['detail'],
                "fields": [config['detail']], "as": ["prev"],
                "default": {}
              },
              {
                "type": "lookup",
                "from": "nextYear", "key": config['detail'],
                "fields": [config['detail']], "as": ["next"],
                "default": {}
              },
              {
                "type": "formula",
                "as": "target_"+config['x'],
                "expr": "interYear > currentYear ? datum.next."+config['x']+" : (datum.prev."+config['x']+"||datum.this."+config['x']+")"
              },
              {
                "type": "formula",
                "as": "target_"+config['y'],
                "expr": "interYear > currentYear ? datum.next."+config['y']+" : (datum.prev."+config['y']+"||datum.this."+config['y']+")"
              },
              {
                "type": "formula",
                "as": "inter_"+config['x'],
                "expr": "interYear=="+maxy+" ? datum.this."+config['x']+" : datum.this."+config['x']+" + (datum.target_"+config['x']+"-datum.this."+config['x']+") * abs(interYear-datum.this."+config['path']+")/1"
              },
              {
                "type": "formula",
                "as": "inter_"+config['y'],
                "expr": "interYear=="+maxy+" ? datum.this."+config['y']+" : datum.this."+config['y']+" + (datum.target_"+config['y']+"-datum.this."+config['y']+") * abs(interYear-datum.this."+config['path']+")/1"
              }
            ]
          },
          {
            "name": "trackCountries",
            "on": [
              {"trigger": "active", "toggle": "{country: active."+config['detail']+"}"}
            ]
          }
        ],

        "signals": [
          { "name": "minYear", "value": miny },
          { "name": "maxYear", "value": maxy },
          { "name": "stepYear", "value": 1 },
          {
            "name": "active",
            "value": {},
            "on": [
              {"events": "@point:mousedown, @point:touchstart", "update": "datum"},
              {"events": "window:mouseup, window:touchend", "update": "{}"}
            ]
          },
          { "name": "isActive", "update": "active."+config['detail']+"" },
          {
            "name": "timeline",
            "value": {},
            "on": [
              {"events": "@point:mouseover", "update": "isActive ? active : datum"},
              {"events": "@point:mouseout", "update": "active"},
              {"events": {"signal": "active"}, "update": "active"}
            ]
          },
          {
            "name": "tX",
            "on": [{
              "events": "mousemove!, touchmove!",
              "update": "isActive ? scale('x', active.this."+config['x']+") : tX"
            }]
          },
          {
            "name": "tY",
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? scale('y', active.this."+config['y']+") : tY"
            }]
          },
          {
            "name": "pX",
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? scale('x', active.prev."+config['x']+") : pX"
            }]
          },
          {
            "name": "pY",
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? scale('y', active.prev."+config['y']+") : pY"
            }]
          },
          {
            "name": "nX",
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? scale('x', active.next."+config['x']+") : nX"
            }]
          },
          {
            "name": "nY",
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? scale('y', active.next."+config['y']+") : nY"
            }]
          },
          {
            "name": "thisDist",
            "value": 0,
            "on":[{
              "events": "mousemove, touchmove",
              "update": "isActive ? sqrt(pow(x()-tX, 2) + pow(y()-tY, 2)) : thisDist"
            }]
          },
          {
            "name": "prevDist",
            "value": 0,
            "on":[{
              "events": "mousemove, touchmove",
              "update": "isActive ? sqrt(pow(x()-pX, 2) + pow(y()-pY, 2)): prevDist"
            }]
          },
          {
            "name": "nextDist",
            "value": 0,
            "on":[{
              "events": "mousemove, touchmove",
              "update": "isActive ? sqrt(pow(x()-nX, 2) + pow(y()-nY, 2)) : nextDist"
            }]
          },
          {
            "name": "prevScore",
            "value": 0,
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? ((pX-tX) * (x()-tX) + (pY-tY) * (y()-tY))/prevDist || -999999 : prevScore"
            }]
          },
          {
            "name": "nextScore",
            "value": 0,
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? ((nX-tX) * (x()-tX) + (nY-tY) * (y()-tY))/nextDist || -999999 : nextScore"
            }]
          },
          {
            "name": "interYear",
            "value": maxy,
            "on": [{
              "events": "mousemove, touchmove",
              "update": "isActive ? (min(maxYear, currentYear+1, max(minYear, currentYear-1, prevScore > nextScore ? (currentYear - 0.45*prevScore/sqrt(pow(pX-tX, 2) + pow(pY-tY, 2))) : (currentYear + 0.45*nextScore/sqrt(pow(nX-tX, 2) + pow(nY-tY, 2)))))) : interYear"
            }]
          },
          {
            "name": "currentYear",
            "value": maxy,
            "on":[{
              "events": "mousemove, touchmove",
              "update": "isActive ? (min(maxYear, max(minYear, prevScore > nextScore ? (thisDist < prevDist ? currentYear : currentYear-1) : (thisDist < nextDist ? currentYear : currentYear+1)))) : currentYear"
            }]
          }
        ],

        "scales": [
          {
            "name": "x",
            "type": "linear", "nice": true,
            "domain": {"data": "inputData", "field": config['x']},
            "range": "width"
          },
          {
            "name": "y",
            "type": "linear", "nice": true, "zero": false,
            "domain": {"data": "inputData", "field": config['y']},
            "range": "height"
          },
          {
            "name": "color",
            "type": "ordinal",
            "domain": {"data": "inputData", "field": config['color']},
            "range": {"scheme":config['color_scheme']}
          },
          {
            "name": "label",
            "type": "ordinal",
            "domain": {"data": "inputData", "field": config['color']},
            "range": {"data": "inputData", "field": config['color']}
          }
        ],

        "axes": [
          {
            "title": dataProperties[config['x']]['title'],
            "orient": "bottom", "scale": "x",
            "grid": true, "tickCount": 10
          },
          {
            "title": dataProperties[config['y']]['title'],
            "orient": "left", "scale": "y",
            "grid": true, "tickCount": 10
          }
        ],

        "legends": [
          {
            "fill": "color",
            "title": dataProperties[config['color']]['title'],
            "orient": "right",
            "encode": {
              "symbols": {
                "enter": {
                  "fillOpacity": {"value": 0.5}
                }
              },
              "labels": {
                "update": {
                  "text": {"scale": "label", "field": "value"}
                }
              }
            }
          }
        ],

        "marks": [
          {
            "type": "text",
            "encode": {
              "update": {
                "text": {"signal": "currentYear"},
                "x": {"value": labelPosX},
                "y": {"value": labelPosY},
                "fill": {"value": "grey"},
                "fillOpacity": {"value": 0.25},
                "fontSize": {"value": 100}
              }
            }
          },
          {
            "type": "text",
            "from": {"data": "master_timeline"},
            "interactive": false,
            "encode": {
              "enter": {
                "x": {"scale": "x", "field": config['x'], "offset": 5},
                "y": {"scale": "y", "field": config['y']},
                "fill": {"value": "#555"},
                "fillOpacity": {"value": 0.6},
                "text": {"field": config['path']}
              }
            }
          },
          {
            "type": "line",
            "from": {"data": "master_timeline"},
            "encode": {
              "update": {
                "x": {"scale": "x", "field": config['x']},
                "y": {"scale": "y", "field": config['y']},
                "stroke": {"value": "#bbb"},
                "strokeWidth": {"value": 5},
                "strokeOpacity": {"value": 0.5}
              }
            }
          },
          {
            "name": "point",
            "type": "symbol",
            "from": {"data": "interpolate"},
            "encode": {
              "enter": {
                "fill": {"scale": "color", "field": "this."+config['color']},
                "size": {"value": 150}
              },
              "update": {
                "x": {"scale": "x", "field": "inter_"+config['x']},
                "y": {"scale": "y", "field": "inter_"+config['y']},
                "fillOpacity": [
                  {
                    "test": "datum."+config['detail']+"==timeline."+config['detail']+" || indata('trackCountries','country', datum."+config['detail']+")",
                    "value": 1
                  },
                  {"value": 0.5}
                ]
              }
            }
          },
          {
            "type": "text",
            "from": {"data": "interpolate"},
            "interactive": false,
            "encode": {
              "enter": {
                "fill": {"value": "#333"},
                "fontSize": {"value": 14},
                "fontWeight": {"value": "bold"},
                "text": {"field": config['detail']},
                "align": {"value": "center"},
                "baseline": {"value": "bottom"}
              },
              "update": {
                "x": {"scale": "x", "field": "inter_"+config['x']},
                "y": {"scale": "y", "field": "inter_"+config['y'], "offset": -7},
                "fillOpacity": [
                  {
                    "test": "datum."+config['detail']+"==timeline."+config['detail']+" || indata('trackCountries', 'country', datum."+config['detail']+")",
                    "value": 0.8
                  },
                  {"value": 0}
                ]
              }
            }
          }
        ]
      }      

      if (config['includeTips'] == "true") {
        chart.marks[3].encode.update.tooltip = {"signal":tipString};
      } 

      

      console.log(chart);


      vegaEmbed("#my-vega", chart, {actions: false}).then(({spec, view}) => {
        view.addEventListener('click', function (event, item) {
          console.log(item);
          if (event.shiftKey) {
             LookerCharts.Utils.openDrillMenu({
              links: item.datum.this.links,
              event: event
          });
          } else {
           
          }

        });
          doneRendering();
      });
    }

    }
  }
});

//use measures by default, grab dimensions otherwise
var defaultDim;
var defaultDim2;
var defaultMes;
var defaultMes2;
////////////////////////////////////////////////////

function createOptions(queryResponse){

  var masterList = [];
  var dimensionList = [];
  var measureList = [];
  var options = {};

  var optionsResponse = {};
  optionsResponse['options'] = {};
  optionsResponse['measures'] = [];
  optionsResponse['dimensions'] = [];
  optionsResponse['masterList'] = [];

  var dimCounter = 1;
  var mesCounter = 1;

  queryResponse.fields.dimension_like.forEach(function(field){
    var dimLib = {};
    var fieldName = (field.name).replace(".","_");
    if (typeof field.label_short != "undefined") {
      dimLib[field.label_short] = fieldName; //store friendly label & field name
    } else {
      dimLib[field.label] = fieldName; //capture label, mainly for table calcs
    }
    if (dimCounter == 1) {
      defaultDim = fieldName; //grab first dimension to use as default X value
    } else if (dimCounter == 2) {
      defaultDim2 = fieldName;
    }
    optionsResponse['masterList'].push(dimLib); //add to master list of all fields
    optionsResponse['dimensions'].push(dimLib);
    dimCounter += 1;
  });

  queryResponse.fields.measure_like.forEach(function(field){
    var mesLib = {};
    var fieldName = (field.name).replace(".","_");
    if (typeof field.label_short != "undefined") {
      mesLib[field.label_short] = fieldName;
      optionsResponse['measures'].push(mesLib);
    } else {
      mesLib[field.label] = fieldName;
      if (field.type == "yesno") {
        optionsResponse['dimensions'].push(mesLib);
      } else {
        optionsResponse['measures'].push(mesLib);
      }
    }
    if (mesCounter == 1) {
      defaultMes = fieldName; //grab first measure as default Y value
    } else if (mesCounter == 2) {
      defaultMes2 = fieldName;
    }
    optionsResponse['masterList'].push(mesLib);
    
    mesCounter += 1;
  });

  if (typeof defaultMes == "undefined") {
    defaultMes = defaultDim;
  }

  if (typeof defaultMes2 == "undefined") {
    defaultMes2 = defaultDim2;
  }

  optionsResponse['options']['x'] = {
    label: "X",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 1,
    values: optionsResponse['masterList'],
    default: defaultMes
  }
  optionsResponse['options']['y'] = {
    label: "Y",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 2,
    values: optionsResponse['masterList'],
    default: defaultMes2
  }
  optionsResponse['options']['detail'] = {
  label: "Detail",
  section: "1.Axes",
  type: "string",
  display: "select",
  order: 3,
  values: optionsResponse['dimensions'],
  default: defaultMes2
  }
  optionsResponse['options']['path'] = {
  label: "Path",
  section: "1.Axes",
  type: "string",
  display: "select",
  order: 4,
  values: optionsResponse['dimensions'],
  default: defaultMes2
  }
  optionsResponse['options']['color'] = {
    label: "Color",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 5,
    values: optionsResponse['dimensions'],
    default: defaultMes
  }
  //Mark config options
  // optionsResponse['options']['mark_type'] = {
  //   label: "Mark Type",
  //   section: "2.Mark",
  //   type: "string",
  //   order: 1,
  //   display: "select",
  //   default: "circle",
  //   values: [
  //     {"Diamond" : "diamond"},
  //     {"Circle" : "circle"},
  //     {"Cross" : "cross"},
  //     {"Square" : "square"}
  //   ]
  // }
  optionsResponse['options']['color_scheme'] = {
    label: "Color Scheme",
    section: "2.Mark",
    type: "string",
    display: "select",
    order: 3,
    values: [
      {"Default 10 (Categorical)" : "tableau10"},
      {"Default 20 (Categorical)" : "tableau20"},
      {"Dark 8 (Categorical)" : "dark2"},
      {"Dark 20 (Categorical)" : "category20b"},
      {"Light 8 (Categorical)" : "set2"},
      {"Blues (Sequential)" : "blues"},
      {"Greens (Sequential)" : "greens"},
      {"Grays (Sequential)" : "greys"},
      {"Purples (Sequential)" : "purples"},
      {"Oranges (Sequential)" : "oranges"},
      {"Viridis (Sequential Multi)" : "viridis"},
      {"Inferno (Sequential Multi)" : "inferno"},
      {"Magma (Sequential Multi)" : "magma"},
      {"Plasma (Sequential Multi)" : "plasma"},
      {"Blue Purple (Sequential Multi)" : "bluepurple"},
      {"Purple Red (Sequential Multi)" : "purplered"},
      {"Spectral (Diverging)" : "spectral"},
      {"Red Blue (Diverging)" : "redblue"},
      {"Red Gray (Diverging)" : "redgrey"},
      {"Red Green (Diverging)" : "redyellowgreen"},
      {"Brown Green (Diverging)" : "brownbluegreen"}
    ],
    default: "dark2"
  }
  // optionsResponse['options']['shape'] = {
  //   label: "Shape",
  //   section: "2.Mark",
  //   order: 6,
  //   type: "string",
  //   display: "select",
  //   values: optionsResponse['dimensions'],
  //   default: ""
  // }
  // optionsResponse['options']['fixed_size'] = {
  //   label: "Fixed Size",
  //   section: "2.Mark",
  //   type: "number",
  //   display: "range",
  //   default: 4,
  //   min: 1,
  //   max: 25
  // }
  optionsResponse['options']['fixed_color'] = {
    label: "Fixed Color",
    section: "2.Mark",
    type: "string",
    display: "text",
    default: "black" //#4C78A8
  }
  // optionsResponse['options']['slide'] = {
  //   label: "Slide Through Time",
  //   section: "2.Mark",
  //   type: "number",
  //   display: "range",
  //   default: -1,
  // }
  // optionsResponse['options']['border'] = {
  //   label: "Border (Enter color)",
  //   section: "2.Mark",
  //   type: "string",
  //   display: "text",
  //   default: ""
  // }
  //axis options
  // optionsResponse['options']['unpin_x'] = {
  //   label: "Unpin X from Zero",
  //   section: "1.Axes",
  //   type: "string",
  //   display: "select",
  //   order: 6,
  //   default: true,
  //   values: [{"Yes":false},{"No":true}]
  // }
  // optionsResponse['options']['unpin_y'] = {
  //   label: "Unpin Y from Zero",
  //   section: "1.Axes",
  //   type: "string",
  //   display: "select",
  //   order: 8,
  //   default: true,
  //   values: [{"Yes":false},{"No":true}]   
  // }
  optionsResponse['options']['fixed_height'] = {
    label: "Chart Height",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: 580,
  }
  optionsResponse['options']['fixed_width'] = {
    label: "Chart Width",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: 800,
  }
  optionsResponse['options']['set_time'] = {
    label: "Set Start",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: null,
  }
  optionsResponse['options']['includeTips'] = {
    label: "Show Tooltips?",
    section: "3.Settings",
    type: "string",
    display: "select",
    default: "true",
    values: [{"Yes":"true"},{"No":"false"}]
  }

  return optionsResponse;
}

