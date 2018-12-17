/* Dependencies
https://cdn.jsdelivr.net/npm/vega@4.3.0/build/vega.js,
https://cdn.jsdelivr.net/npm/vega-lite@3.0.0-rc8/build/vega-lite.js,
https://cdn.jsdelivr.net/npm/vega-embed@3.20.0/build/vega-embed.js
*/

looker.plugins.visualizations.add({
  create: function(element, config) {

    container = element.appendChild(document.createElement("div"));
    container.setAttribute("id","my-vega");

  },
  updateAsync: function(data, element, config, queryResponse, details, doneRendering) {

    //ensure options have emptied
    var myOptions = {};

    //get metadata and config into master object
    var metaConfig = createMetaData(queryResponse);

    //get the options you want available to end user
    myOptions = createConfig(metaConfig['optionsConfig']);

    //register the options to the ui
    //for example, choose what goes on X axis and what goes on Y axis
    this.trigger('registerOptions', myOptions); 

    //optional but recommended, wait for options to register before proceeding
    if (Object.keys(config).length > 2) {

        if (config['x'] != "") {



      //get data in vega-easy consumption format
      //access the fields via the config, eg config['x']
      var myData = getVegaData(data);

      //translate looker metadata to vega metadata (nominal,quantitative,$##,$.f, etc)
      //returns an object with 'dtype','title','format'
      //access with a config selection, eg metaData[config['x']]['dtype']
      var metaData = metaConfig['dataProperties'];

      //construct the tooltip with appropriate formatting
      var tooltips = constructTooltips(metaData);

      console.log(tooltips);

      //positions for x axis
      var plabelx = 150;
      var pvaluex = 195;
      var flabelx = 150;
      var fvaluex = 195;

      plabelx = (config['width'] * plabelx) / 220;
      pvaluex = (config['width'] * pvaluex) / 220;
      flabelx = (config['width'] * flabelx) / 220;
      fvaluex = (config['width'] * fvaluex) / 220;

      //positions for y axis
      var plabely = 15;
      var pvaluey = 15;
      var flabely = -3;
      var fvaluey = -3;



      if (config['swap'] == "yes") {
          plabelx = 0;
          pvaluex = 40;
          flabelx = 0;
          fvaluex = 40;

          plabely = -50;
          pvaluey = -50;
          flabely = -65;
          fvaluey = -65;
          plabely = (config['height'] * plabely) / 90;
          pvaluey = (config['height'] * pvaluey) / 90;
          flabely = (config['height'] * flabely) / 90;
          fvaluey = (config['height'] * fvaluey) / 90;
      }

      var groupbyArray = [];
      groupbyArray.push(config['facet']);
      if (config['facet2'] != "" && typeof config['facet2'] != "undefined") {
        groupbyArray.push(config['facet2']);
      }

      var chart = {
          "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
          "data": {"values": myData},
          "transform": [
            {
                "calculate": "max(datum."+config['y']+")","as":"max"
            },
            {
                "window":[{
                    "op":"max",
                    "field":"max",
                    "as":"wmax"
                    }],
                "groupby":groupbyArray,
                "frame":[null,null]
            },
            {
                "calculate": "min(datum."+config['y']+")","as":"min"
            },
            {
                "window":[{
                    "op":"min",
                    "field":"min",
                    "as":"wmin"
                    }],
                "groupby":groupbyArray,
                "frame":[null,null]
            },
            {
                "window":[{
                    "op":"last_value",
                    "field":config['y'],
                    "as":"lastval"
                    }],
                "groupby":groupbyArray,
                "frame":[null,null]
            },
            {
                "window":[{
                    "op":"first_value",
                    "field":config['y'],
                    "as":"firstval"
                    }],
                "groupby":groupbyArray,
                "frame":[null,null]
            },
            {
                "window":[{
                    "op":"row_number",
                    "field":config['x'],
                    "as":"rnum"
                }],
                "groupby":groupbyArray,
                "sort": "ascending"
            },
            {
                "window":[{
                    "op":"max",
                    "field":"rnum",
                    "as":"maxrnum"
                }],
                "groupby":groupbyArray,
                "frame":[null,null]
            },
            {
                "window":[{
                    "op":"lag",
                    "field":config['y'],
                    "as":"pval"
                }],
                "groupby":groupbyArray
            },
            {
                "calculate": "(datum.lastval - datum.firstval) / datum.firstval ","as":"changeFromFirst"
            },
            {
                "calculate": "datum.rnum === datum.maxrnum ? (datum."+config['y']+" - datum.pval) / datum.pval : null",
                "as": "changeFromPrevious"
            }
          ],
          "spacing": 0,
          "hconcat":[
        {
            "bounds": "full",
            "facet": {
            },
            "resolve": {"scale":{"y":config['indY']}},
            "spec": {
                    "height": config['height'],
                    "width":config['width'],
                    "layer": [
                        {
                        "mark": {
                            "type":"line",
                            "point":"transparent"
                        },
                        "encoding": {
                            "tooltip": tooltips,
                            "x": {"field": config['x'],"type":"temporal","axis":{"grid":false,"labelFont":"trebuchetms","titleFont":"trebuchetms"},"title":metaData[config['x']]['title']},
                            "y": {"field": config['y'],"type":"quantitative","axis": {"grid":false,"title":null,"labelFont":"trebuchetms"}},
                            "color": {"value":config['lineColor']}
                        }
                        },
                        {
                        "transform": [
                            {
                                "filter": "datum."+config['y']+" >= datum.wmax"
                            }
                        ],
                        "mark": {"type":"circle","opacity":1},
                        "encoding": {
                            "tooltip": tooltips,
                            "x": {"field": config['x'], "type": "temporal"},
                            "y": {"field": "wmax", "type": "quantitative","axis": {"title":null}},
                            "color": {"value":config['posColor']},
                            "size": {"value":60}
                            }
                        },
                        {
                        "transform": [
                            {
                                "filter": "datum."+config['y']+" <= datum.wmin"
                            }
                        ],
                        "mark": {"type":"circle","opacity":1},
                        "encoding": {
                            "tooltip": tooltips,
                            "x": {"field": config['x'], "type": "temporal"},
                            "y": {
                                "field": "wmin", 
                                "type": "quantitative",
                                "axis": {"title":null}
                                },
                            "color": {"value":config['negColor']},
                            "size": {"value":60}
                            }
                        }
                        //peel off calcs here
                    ]
            }
          }
        ]
      };

      if (config['showRef'] != "") {
        chart.hconcat[0].spec.layer.push(
                        {
                        "mark": {"type":"rule"},
                        "encoding": {
                            "y": {"field": config['y'],"type":"quantitative","aggregate":config['showRef'],"axis": {"title":null}},
                            "color": {"value":config['refColor']}
                        }
                        }
        );
      }

      if (config['showCalcs'] == "yes") {
        chart.hconcat[0].spec.layer.push(
                        {
                        "transform": [
                            {
                                "filter": "datum.rnum === 1"
                            }
                        ],
                        "mark": {
                            "type": "text", 
                            "dx": fvaluex,
                            "dy": fvaluey,
                            "font": "trebuchetms"
                            },
                        "encoding": {
                            "text":{
                                "field":"changeFromFirst",
                                "type":"quantitative",
                                "format":",.1%"
                                },
                            "color": {
                                "condition":[
                                    {
                                        "test": "datum.changeFromFirst >= 0",
                                        "value": config['posColor']
                                    }
                                ],
                                "value": config['negColor']
                                    },
                            "size": {"value":12}
                            }
                        },
                        {
                        "transform": [
                            {
                                "filter": "datum.rnum === datum.maxrnum"
                            }
                        ],
                        "mark": {
                            "type": "text", 
                            "dx": pvaluex,
                            "dy": pvaluey,
                            "font": "trebuchetms"
                            },
                        "encoding": {
                            "text":{
                                "field":"changeFromPrevious",
                                "type":"quantitative",
                                "format":",.1%"
                                },
                            "color": {
                                "condition":[
                                    {
                                        "test": "datum.changeFromPrevious >= 0",
                                        "value": config['posColor']
                                    }
                                ],
                                "value": config['negColor']
                                    },
                            "size": {"value":12}
                            }
                        },
                        {
                        "transform": [
                            {
                                "filter": "datum.rnum === datum.maxrnum"
                            }
                        ],
                        "mark": {
                            "type": "text", 
                            "dx": plabelx,
                            "dy": plabely,
                            "text": "vs prev:",
                            "fontSize":12,
                            "font": "trebuchetms"
                            }
                        },
                        {
                        "transform": [
                            {
                                "filter": "datum.rnum === datum.maxrnum"
                            }
                        ],
                        "mark": {
                            "type": "text", 
                            "dx": flabelx,
                            "dy": flabely,
                            "text": "vs first:",
                            "fontSize":12,
                            "font": "trebuchetms"
                            }
                        }
                    );
      }

      if (config['swap'] == "yes") {
        chart.hconcat[0].facet.column = {
                "field":config['facet'],
                "type":"nominal",
                "title":metaData[config['facet']]['title'],
                "header":{
                    "labelFontSize":12,
                    "labelFont":"trebuchetms",
                    "titleFont":"trebuchetms"
                }
        };
      } else {
        chart.hconcat[0].facet.row = {
                "field":config['facet'],
                "type":"nominal",
                "title":metaData[config['facet']]['title'],
                "header":{
                    "labelFontSize":12,
                    "labelFont":"trebuchetms",
                    "titleFont":"trebuchetms"
                }
        };
      }

      if (config['facet2'] != "" && typeof config['facet2'] != "undefined") {
        if (config['swap'] == "yes") {
            chart.hconcat[0].facet.column = {
                    "field":config['facet'],
                    "type":"nominal",
                    "title":metaData[config['facet']]['title'],
                    "header":{
                        "labelFontSize":12,
                        "labelFont":"trebuchetms",
                        "titleFont":"trebuchetms"
                    }
            };   
            chart.hconcat[0].facet.row = {
                "field":config['facet2'],
                "type":"nominal",
                "title":metaData[config['facet2']]['title'],
                "header":{
                    "labelFontSize":12,
                    "labelFont":"trebuchetms",
                    "titleFont":"trebuchetms"
                }
            };       
        } else {
            chart.hconcat[0].facet.row = {
                    "field":config['facet'],
                    "type":"nominal",
                    "title":metaData[config['facet']]['title'],
                    "header":{
                        "labelFontSize":12,
                        "labelFont":"trebuchetms",
                        "titleFont":"trebuchetms"
                    }
            };   
            chart.hconcat[0].facet.column = {
                "field":config['facet2'],
                "type":"nominal",
                "title":metaData[config['facet2']]['title'],
                "header":{
                    "labelFontSize":12,
                    "labelFont":"trebuchetms",
                    "titleFont":"trebuchetms"
                }
            }; 
        }

      }

      console.log(chart);

      //embed the chart and optionally initialize drilldown
      vegaEmbed("#my-vega", chart, {actions: false}).then(({spec, view}) => {
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

}

});

function getVegaData(data) {
  var myData = [];
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
  return myData;
};

function createMetaData(queryResponse) {

  var dataFormatDict = {
    "$#,##0" : "$,.0f",
    "$#,##0.00" : "$,.2f",
    "#,##0.00%" : ",.2%",
    "#,##0.0%" : ",.1%",
    "#,##0%" : ",.0%",
    "null" : ""
  };

  var dateFields = ["date_date", "date_month", "date_quarter", "date_week"];

  var dataProperties = {};
  var optionsConfig = {
    "measures": [],
    "dimensions": [],
    "master": [],
    "lookup": []
  };
  var masterMeta = {
    "dataProperties": {},
    "optionsConfig": {}
  };

  //determine number format
    //get friendly names for measures
    queryResponse.fields.measure_like.forEach(function(measure){
      var lookerName = measure.name.replace(".","_");
      dataProperties[lookerName] = {};
        //get label short or label to handle table calcs
        if (typeof measure['label_short'] != "undefined") {
          var miniObj = {};
          miniObj[measure['label_short']] = lookerName;
          dataProperties[lookerName]['title'] = measure['label_short'];
        } else {
          var miniObj = {};
          miniObj[measure['label']] = lookerName;
          dataProperties[lookerName]['title'] = measure['label'];
        }
        dataProperties[lookerName]['valueFormat'] = dataFormatDict[String(measure['value_format'])];
        if (measure['type'] == "yesno") {
          dataProperties[lookerName]['dtype'] = "nominal";
        } else {
          dataProperties[lookerName]['dtype'] = "quantitative";
        }
        if (measure['type'] == 'yesno') {
          optionsConfig['dimensions'].push(miniObj);
        } else {
          optionsConfig['measures'].push(miniObj);
        }
        optionsConfig['lookup'].push(lookerName); 
        optionsConfig['master'].push(miniObj);
    });
    //get friendly names for dimensions
    queryResponse.fields.dimension_like.forEach(function(dimension){
      var lookerName = dimension.name.replace(".","_");
      dataProperties[lookerName] = {};
        if (typeof dimension['label_short'] != "undefined") {
          var miniObj = {};
          miniObj[dimension['label_short']] = lookerName;
          dataProperties[lookerName]['title'] = dimension['label_short'];
        } else {
          var miniObj = {};
          miniObj[dimension['label']] = lookerName;
          dataProperties[lookerName]['title'] = dimension['label'];
        }       
        dataProperties[lookerName]['valueFormat'] = dataFormatDict[String(dimension['value_format'])];
        if (dateFields.includes(dimension.type)) {
          dataProperties[lookerName]['dtype'] = "temporal";
        } else {
          dataProperties[lookerName]['dtype'] = "nominal";
        }
        optionsConfig['dimensions'].push(miniObj);
        optionsConfig['master'].push(miniObj);
        optionsConfig['lookup'].push(lookerName);
    });
    optionsConfig['master'].push({"NA":""});
    optionsConfig['dimensions'].push({"NA":""});
    optionsConfig['measures'].push({"NA":""});
    optionsConfig['lookup'].push("query_fields");
    masterMeta['dataProperties'] = dataProperties;
    masterMeta['optionsConfig'] = optionsConfig;

  return masterMeta;
};

function constructTooltips(dataProperties) {

  var tooltipFields = [];

  for (datum in dataProperties) {
    var tip = {};
    tip['field'] = datum;
    tip['type'] = dataProperties[datum]['dtype'];
    tip['format'] = dataProperties[datum]['valueFormat'];
    tip['title'] = dataProperties[datum]['title'];
    tooltipFields.push(tip);
  }
  return tooltipFields;
};

//this will likely be the only part of the script outside of the viz you need to edit
//you can add your own config options
//to create a dropdown of all fields use fields['master'], all dimensions fields['dimensions']
//all measures fields['measures']
function createConfig(fields) {

  var vizOptions = {};

  vizOptions['x'] = {
    label: "X",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 1,
    values: fields['master'],
    default: ""
  }
  vizOptions['y'] = {
    label: "Y",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 2,
    values: fields['master'],
    default: ""
  }
  vizOptions['facet'] = {
    label: "Facet",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 3,
    values: fields['master'],
    default: "" 
  }
  vizOptions['facet2'] = {
    label: "2nd Facet",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 4,
    values: fields['master'],
    default: ""   
  }
  vizOptions['indY'] = {
    label: "Independent Y?",
    section: "1.Axes",
    type: "string",
    display: "select",
    order: 5,
    values: [{"Yes":"independent"},{"No":"shared"}],
    default: "independent"    
  }
  vizOptions['posColor'] = {
    label: "Positive Color",
    section: "2.Mark",
    type: "array",
    display: "color",
    order: 1,
    default: "#587ebc"   
  }
  vizOptions['negColor'] = {
    label: "Negative Color",
    section: "2.Mark",
    type: "array",
    display: "color",
    order: 2,
    default: "#e09123"   
  }
  vizOptions['lineColor'] = {
    label: "Line Color",
    section: "2.Mark",
    type: "array",
    display: "color",
    order: 3,
    default: "lightgray"   
  }
  vizOptions['refColor'] = {
    label: "Reference Line Color",
    section: "2.Mark",
    type: "array",
    display: "color",
    order: 4,
    default: "gray"   
  }
  vizOptions['swap'] = {
    label: "Swap?",
    section: "3.Settings",
    type: "string",
    display: "select",
    order: 1,
    values: [{"Yes":"yes"},{"No":"no"}],
    default: "no" 
  }
  vizOptions['height'] = {
    label: "Height",
    section: "3.Settings",
    type: "number",
    display: "text",
    order: 2,
    default: 90
  }
  vizOptions['width'] = {
    label: "width",
    section: "3.Settings",
    type: "number",
    display: "text",
    order: 3,
    default: 220
  }
  vizOptions['showCalcs'] = {
    label: "Show Change",
    section: "3.Settings",
    type: "string",
    display: "select",
    order: 4,
    values: [{"Yes":"yes"},{"No":"no"}],
    default: "yes" 
  }
  vizOptions['showRef'] = {
    label: "Show Reference Line?",
    section: "3.Settings",
    type: "string",
    display: "select",
    order: 5,
    values: [{"Mean":"mean"},{"Median":"median"},{"No":""}],
    default: "mean" 
  }



  return vizOptions;
};







