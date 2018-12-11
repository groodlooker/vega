

looker.plugins.visualizations.add({
  create: function(element, config) {

    container = element.appendChild(document.createElement("div"));
    container.setAttribute("id","my-vega");

  },
  updateAsync: function(data, element, config, queryResponse, details, doneRendering) {

    var myData = [];
    var dataProperties = {};
    var dims = [];
    var meas = [];
    var allFields = [];

    var options = createOptions(queryResponse)['options'];
    this.trigger('registerOptions', options);


    if (typeof config['x'] != "undefined" && typeof config['y'] != "undefined" && config['x'] != "" && config['y'] != "") {


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
            currentLabel = currentLabel + " (" + key.substring(key.indexOf(".")+1) + ")";
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

    for (datum in dataProperties) {
      var tip = {};
      tip['field'] = datum;
      tip['type'] = dataProperties[datum]['dtype'];
      tip['format'] = dataProperties[datum]['valueFormat'];
      tip['title'] = dataProperties[datum]['title'];
      tooltipFields.push(tip);
    }

    //end section of prepping the data
    var chart = {
      "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
      "data": {"values": myData},
      "spacing": 15,
      "bounds": "flush",
      "vconcat": [{
        "mark": {"type":"bar","color":config['fixed_color']},
        "height": 60,
        "width": config['fixed_width'],
        "encoding": {
          "x": {
            "bin": {"maxbins":config['num_bins']},
            "field": config['x'],
            "type": "quantitative",
            "axis": null
          },
          "y": {
            "aggregate": "count",
            "type": "quantitative",
            "scale": {
              // "domain": [0,1000]
            },
            "title": ""
          }
        }
      }, {
        "spacing": 15,
        "bounds": "flush",
        "hconcat": [{
          "layer": [{
            "mark": {"type":"rect","stroke":config['border']},
            "height": config['fixed_height'],
            "width": config['fixed_width'],
            "encoding": {
              "x": {
                "bin": {"maxbins":config['num_bins']},
                "field": config['x'],
                "type": "quantitative",
                "title":dataProperties[config['x']]['title']
              },
              "y": {
                "bin": {"maxbins":config['num_bins']},
                "field": config['y'],
                "type": "quantitative",
                "title":dataProperties[config['y']]['title']
              },
              "color": {
                "aggregate": "count",
                "type": "quantitative"
              }
            }            
          }]
        }, {
          "mark": {"type":"bar","color":config['fixed_color']},
          "width": 60,
          "height": config['fixed_height'],
          "encoding": {
            "y": {
              "bin": {"maxbins":config['num_bins']},
              "field": config['y'],
              "type": "quantitative",
              "axis": null
            },
            "x": {
              "aggregate": "count",
              "type": "quantitative",
              "scale": {
                // "domain": [0,1000]
              },
              "title": ""
            }
          }
        }]
      }],
      "config": {
        "range": {
          "heatmap": {
            "scheme": config['color_scheme']
          }
        },
        "view": {
          "stroke": "transparent"
        }
      }
    }

    if (config['layer_points'] != "" && typeof config['layer_points'] != "undefined") {

      chart.vconcat[1].hconcat[0].layer[1] = {
            "mark": {"type":"circle","color":"black","opacity":0.1},
            "height": config['fixed_height'],
            "width": config['fixed_width'],
            "encoding": {
              "tooltip":tooltipFields,
              "x": {
                "field": config['x'],
                "type": "quantitative"
              },
              "y": {
                "field": config['y'],
                "type": "quantitative"
              },
            }            
          };

          if (config['size'] != "" && typeof config['size'] != "undefined") {
            chart.vconcat[1].hconcat[0].layer[1].encoding.size = {"field": config['size'], "type":"quantitative", "title":dataProperties[config['size']]['title']};
          }
    }

    console.log(chart);

    vegaEmbed("#my-vega", chart, {actions: false}).then(({spec, view}) => {
      view.addEventListener('click', function (event, item) {
        if (event.shiftKey) {
          //opportunity to do something different with a shift click, filter maybe??
        } else {
          if (config['layer_points'] != "" && typeof config['layer_points'] != "undefined") {
             LookerCharts.Utils.openDrillMenu({
              links: item.datum.links,
              event: event
             });             
          }
          
        }

      });
        doneRendering();
    });


  }//end if statement checking for config to load



  }//end update async
});

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

  console.log(defaultMes);

  console.log(defaultMes2);

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
    default: "blues"
  }
  optionsResponse['options']['fixed_color'] = {
    label: "Bar Color",
    section: "2.Mark",
    type: "array",
    display: "color",
    default: "#4C78A8" //#4C78A8
  }
  optionsResponse['options']['border'] = {
    label: "Border?",
    section: "2.Mark",
    type: "array",
    display: "color",
    default: ""
  }
  optionsResponse['options']['fixed_height'] = {
    label: "Chart Height",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: 400,
  }
  optionsResponse['options']['fixed_width'] = {
    label: "Chart Width",
    section: "3.Settings",
    type: "number",
    display: "text",
    default: 400,
  }
  optionsResponse['options']['num_bins'] = {
    label: "Number of Bins",
    section: "1.Axes",
    type: "number",
    display: "text",
    default: 10
  }
  optionsResponse['options']['layer_points'] = {
    label: "Show Points?",
    section: "2.Mark",
    type: "string",
    display: "select",
    values:[{"Yes":"yes"},{"No":""}],
    default: ""
  }
  optionsResponse['masterList'].push({"NA":""});
  optionsResponse['options']['size'] = {
    label: "Size",
    section: "2.Mark",
    type: "string",
    display: "select",
    values: optionsResponse['masterList'],
    default: ""
  }
  return optionsResponse;
}





