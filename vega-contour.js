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

//get the data and store the links
      for (var cell in data) {
        var obj = data[cell];
        var dataDict = {};
        dataDict['links'] = [];
        for (var key in obj){
          var shortName = key.replace(".","_");
          dataDict[shortName] = obj[key]['value'];
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

      //construct the tooltip with appropriate formatting
      var tooltipFields = [];

      var tipString = "{";
      for (datum in dataProperties) {
        var tip = {};
        // tip['field'] = datum;
        var fieldTip = "";
        if (dataProperties[datum]['dtype'] == "quantitative") {
          tipString += "'"+ dataProperties[datum]['title'] + "': format(datum."+datum+", '"+dataProperties[datum]['valueFormat']+"'),";
        } else {
          tipString += "'"+ dataProperties[datum]['title'] + "': datum."+datum+",";
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
        "autosize": "pad",
        "signals": [
          {
            "name": "Points", "value": true,
            "bind": {"input": "checkbox"}
          },
          {
            "name": "Layers", "value": 10,
            "bind": {"input": "select", "options": [1,5,10,15,20]}
          },
          {
            "name": "Sizer","value":4,
            "bind": {"input":"range","min":1,"max":25,"step":1}
          }
        ],
        "data": [
          {
            "name": "source",
            "values": myData
          },
          {
            "name": "contours",
            "source": "source",
            "transform": [
              {
                "type": "contour",
                "x": {"expr": xScale},
                "y": {"expr": yScale},
                "size": [{"signal": "width"}, {"signal": "height"}],
                "count": {"signal":"Layers"}
              }
            ]
          }
        ],

        "scales": [
          {
            "name": "x",
            "type": "linear",
            "round": true,
            "nice": true,
            "zero": config['unpin_x'],
            "domain": {"data": "source", "field": config['x']},
            "range": "width"
          },
          {
            "name": "y",
            "type": "linear",
            "round": true,
            "nice": true,
            "zero": config['unpin_y'],
            "domain": {"data": "source", "field": config['y']},
            "range": "height"
          },
          {
            "name": "color",
            "type": "sequential",
            "zero": true,
            "domain": {"data": "contours", "field": "value"},
            "range": "heatmap"
          }
        ],

        "axes": [
          {
            "scale": "x",
            "grid": true,
            "domain": false,
            "orient": "bottom",
            "title": dataProperties[config['x']]['title']
          },
          {
            "scale": "y",
            "grid": true,
            "domain": false,
            "orient": "left",
            "title": dataProperties[config['y']]['title']
          }
        ],

        "legends": [{
          "fill": "color",
          "type": "gradient"
        }],

        "marks": [
          {
            "type": "path",
            "from": {"data": "contours"},
            "encode": {
              "enter": {
                "stroke": {"value": "#888"},
                "strokeWidth": {"value": 1},
                "fill": {"scale": "color", "field": "value"},
                "fillOpacity": {"value": 0.35}
              }
            },
            "transform": [
              { "type": "geopath", "field": "datum" }
            ]
          },
          {
            "name": "marks",
            "type": "symbol",
            "from": {"data": "source"},
            "encode": {
              "update": {
                "tooltip": {"signal":tipString},
                "shape": {"value": config['mark_type']},
                "x": {"scale": "x", "field": config['x']},
                "y": {"scale": "y", "field": config['y']},
                "size": {"signal": "Sizer"},
                "fill": [
                  {"test": "Points", "value": config['fixed_color']},
                  {"value": "transparent"}
                ]
              }
            }
          }
        ],

        "config": {
          "range": {
            "heatmap": {"scheme": config['color_scheme']}
          }
        }
      }       

      // var exportableChart = chart;

      // delete exportableChart.data[0].values;

      // console.log(exportableChart);


      vegaEmbed("#my-vega", chart, {actions: false}).then(({spec, view}) => {
        var bindings = document.getElementsByClassName("vega-bindings")[0];
        var parent = document.getElementById("my-vega");
        parent.insertBefore(bindings,parent.childNodes[0]);
        var children = document.getElementsByClassName("vega-bind");
        for (el in children) {
          if (typeof children[el] != "undefined") {
            try {
              children[el].setAttribute("style","display:inline-block;padding-right:15px;");
            } catch(err){

            }
          }
        }
        view.addEventListener('click', function (event, item) {
          if (event.shiftKey) {
            //opportunity to do something different with a shift click, filter maybe??
          } else {
             LookerCharts.Utils.openDrillMenu({
              links: item.datum.links,
              event: event
          });           
          }

        });
          doneRendering();
      });

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
  // optionsResponse['options']['show_bindings'] = {
  //   label: "Show Settings in Chart",
  //   section: "3.Settings",
  //   type: "string",
  //   display: "select",
  //   default: "yes",
  //   values: [{"Yes":"yes","No":"no"}]
  // }
  // optionsResponse['options']['points'] = {
  //   label: "Show Points",
  //   section: "2.Mark",
  //   type: "string",
  //   display: "select",
  //   default: true,
  //   values: [{"Yes":true},{"No":false}]
  // }
  //Mark config options
  optionsResponse['options']['mark_type'] = {
    label: "Mark Type",
    section: "2.Mark",
    type: "string",
    order: 1,
    display: "select",
    default: "circle",
    values: [
      {"Diamond" : "diamond"},
      {"Circle" : "circle"},
      {"Cross" : "cross"},
      {"Square" : "square"}
    ]
  }
  optionsResponse['options']['color_scheme'] = {
    label: "Color Scheme",
    section: "2.Mark",
    type: "string",
    display: "select",
    order: 3,
    values: [
      {"Green Blue" : "greenblue"},
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
    default: "magma"
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
  // optionsResponse['options']['opacity'] = {
  //   label: "Opacity",
  //   section: "2.Mark",
  //   type: "number",
  //   display: "text",
  //   default: 1,
  //   min: 0,
  //   max: 1
  // }
  optionsResponse['options']['fixed_color'] = {
    label: "Fixed Color",
    section: "2.Mark",
    type: "string",
    display: "text",
    default: "black" //#4C78A8
  }
  // optionsResponse['options']['border'] = {
  //   label: "Border (Enter color)",
  //   section: "2.Mark",
  //   type: "string",
  //   display: "text",
  //   default: ""
  // }
  //axis options
  // optionsResponse['options']['row'] = {
  //   label: "Row",
  //   section: "1.Axes",
  //   type: "string",
  //   order: 3,
  //   display: "select",
  //   default: "",
  //   values: optionsResponse['dimensions']
  // }
  // optionsResponse['options']['column'] = {
  //   label: "Column",
  //   section: "1.Axes",
  //   type: "string",
  //   order: 4,
  //   display: "select",
  //   default: "",
  //   values: optionsResponse['dimensions']
  // }
  optionsResponse['options']['unpin_x'] = {
    label: "Unpin X from Zero",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 6,
    default: true,
    values: [{"Yes":false},{"No":true}]
  }
  optionsResponse['options']['unpin_y'] = {
    label: "Unpin Y from Zero",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 8,
    default: true,
    values: [{"Yes":false},{"No":true}]   
  }
  optionsResponse['options']['fixed_height'] = {
    label: "Chart Height",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: null,
  }
  optionsResponse['options']['fixed_width'] = {
    label: "Chart Width",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: null,
  }
  // optionsResponse['options']['highlight'] = {
  //   label: "Highlight Action",
  //   section: "3.Settings",
  //   type: "string",
  //   display: "select",
  //   default: "",
  //   values: optionsResponse['dimensions']
  // }
  return optionsResponse;
}



