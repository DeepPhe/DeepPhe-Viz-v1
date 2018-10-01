'use strict';

/**
 * Module dependencies.
 */





// Use neo4j-driver
const neo4j = require('neo4j-driver').v1;

// DataProcessor class with all static methods, local module
const dataProcessor = require('./dataProcessor.js');

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// neo4j bolt driver, default bolt port is 7687
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

// Neo4j queries object, local module
const neo4jBoltFunctions = require('./neo4jBoltFunctions.js');

// All routes are defined in this array
// Each route is a route configuration object
// https://hapijs.com/api#route-configuration
const routes = [
    // Default base URI route
    {
        method: 'GET',
        path: '/',
        handler: function (request, h) {
            return 'Hello, this is the default route of DeepPhe-Viz';
        }
    },

    // CSS URI route
    {
        method: 'GET',
        path:'/css/{file}', 
        handler: function (request, h) {
            // This 'file' handler is only available after registering Inert plugin
            // ../ doesn't work
            return h.file('././client/css/' + request.params.file)
        }
    },

    // JS URI route
    {
        method: 'GET',
        path:'/js/{file}', 
        handler: function (request, h) {
            // This 'file' handler is only available after registering Inert plugin
            return h.file('././client/js/' + request.params.file)
        }
    },

    // Cohort Analysis URI route
    {
        method: 'GET',
        path:'/cohortAnalysis', 
        handler: function (request, h) {
            // Render cohortAnalysis.html
            let data = {
                title: 'Cohort Analysis',
                baseUri: request.server.info.uri // Get the base uri via server.info 
            };

            return h.view('cohortAnalysis', data, {layout: 'cohort'});
        }
    },

    // All patients from all stages URI route
    {
        method: 'GET',
        path:'/cohortData', 
        handler: function (request, h) {
            var session = driver.session();
            let promise = session.readTransaction(function(tx) {
                    //return tx.run('return deepphe.getCohortData()');
                    return neo4jBoltFunctions.getCohortData(tx);
                })
                .then(function(neo4jResult) {
                    session.close();

                    let data;
                    neo4jResult.records.forEach(function(record) {
                        console.log("===========");
                        //console.log(record.get('deepphe.getCohortData()'));

                        data = record.get('getCohortData'); 
                    });

                    //console.log('response: ' + JSON.stringify(neo4jResult, null, 4));
                	// Convert the body into desired json data structure
                    return dataProcessor.getCohortData(data);
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getCohortData()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Tumor chart URI route
    {
        method: 'GET',
        path:'/tumorinfo/{patientIds}', 
        handler: function (request, h) {
            let patientIds = request.params.patientIds.split('+');
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getPatientsTumorInfo(tx,patientIds))
                .then(function(neo4jResult) {
                  session.close();

                    let data;
                    neo4jResult.records.forEach(function(record) {
                        console.log("===========");
                        //console.log(record.get('deepphe.getCohortData()'));

                        data = record.get('getPatientsTumorInfo'); 
                    });
// console.log("data============");
// console.log(data);

                    // Convert the result into desired json data structure
                    let patientsTumorInfo = dataProcessor.getPatientsTumorInfo(data);

                    // Further process the data for target chart
                    let biomarkersInfo = dataProcessor.getBiomarkersInfo(patientsTumorInfo);

                    let result = {
                    	patientsTumorInfo: patientsTumorInfo,
                    	biomarkersInfo: biomarkersInfo
                    };
                    
                    return result;
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getPatientsTumorInfo()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Diagnosis chart URI route
    {
        method: 'GET',
        path:'/diagnosis/{patientIds}', 
        handler: function (request, h) {
            let patientIds = request.params.patientIds.split('+');
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getDiagnosis(tx,patientIds))
                .then(function(neo4jResult) {
                  session.close();

                  let data;
                    neo4jResult.records.forEach(function(record) {
                        console.log("===========");
                        //console.log(record.get('deepphe.getCohortData()'));

                        data = record.get('getDiagnosis'); 
                    });

                    // Convert the body into desired json data structure
                    return dataProcessor.getDiagnosis(patientIds, data);
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getDiagnosis()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Individual patient URI route
    {
        method: 'GET',
        path:'/patient/{patientName}', 
        handler: function (request, h) {
            let patientName = request.params.patientName;

            // Render patient.html
            let data = {
                patientName: patientName,
                // Get the base uri via server.info 
                // request.server has the server object
                baseUri: request.server.info.uri 
            };

            return h.view('patient', data, {layout: 'patient'});
        }
    },

    // Patient info     -- migrated to Bolt.  Do we still want this hapi wrapping?  handler alone should suffice
    {
        method: 'GET',
        path:'/patient/{patientName}/info', 
        handler: function (request, h) {
            let patientName = request.params.patientName;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getPatientInfo(tx,patientName))
                .then(function(body) {
                  session.close();
                    session.close();
                    // Convert the body into desired json data structure
                    let patientInfo = dataProcessor.getPatientInfo(body);

                    // Render patient.html
                    let data = {
                        name: patientInfo.name,
                        firstEncounterAge: patientInfo.firstEncounterAge,
                        lastEncounterAge: patientInfo.lastEncounterAge,
                        menopausal: patientInfo.menopausal,
                    };
                    
                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    return h.view('patientInfo', data, {layout: 'empty'});
                })
                .catch(function(error) {
                    session.close();
                     console.log('Failed to make the neo4j bolt api call: getPatientInfo()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Cancer summary URI route, called by client ajax
    {
        method: 'GET',
        path:'/patient/{patientName}/cancers', 
        handler: function (request, h) {
            let patientName = request.params.patientName;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getCancerSummary(tx,patientName))
                .then(function(body) {
                  session.close();
                    // Convert the body into desired json data structure
                    let cancerSummary = dataProcessor.getCancerSummary(body);

                    // Render cancerSummary.html
                    let data = {
                        collatedFacts: cancerSummary.collatedFacts,
                        tnm: cancerSummary.tnm
                    };
                    
                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    return h.view('cancerSummary', data, {layout: 'empty'});
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getCancerSummary()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Tumors summary URI route, called by client ajax
    {
        method: 'GET',
        path:'/patient/{patientName}/tumors', 
        handler: function (request, h) {
            let patientName = request.params.patientName;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getTumorSummary(tx,patientName))
                .then(function(body) {
                  session.close();
                    // Convert the body into desired json data structure
                    let summary = dataProcessor.getTumorSummary(body);

                    // Show "Present" instead of repeating these attributes labels. Melanoma specific
                    let melanomaAttributes = [
                        "Perineural Invasion", 
                        "Vertical Growth Phase", 
                        "Radial Growth Phase", 
                        "Regression", 
                        "Ulceration", 
                        "Lymphovascular Invasion"
                    ];

                    // Render tumorSummary.html
                    let data = {
                        tumors: summary.tumors,
                        collatedFactsByCategory: summary.collatedFactsByCategory,
                        // Show "Present" instead of repeating these attributes labels. Melanoma specific
                        melanomaAttributes: melanomaAttributes
                    };

                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    return h.view('tumorSummary', data, {layout: 'empty'});
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getTumorSummary()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Reports timeline URI route, called by client ajax, no view template rendering
    {
        method: 'GET',
        path:'/patient/{patientName}/timeline', 
        handler: function (request, h) {
            let patientName = request.params.patientName;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getTimelineData(tx,patientName))
                .then(function(body) {
                  session.close();
                    //console.log('response: ' + JSON.stringify(body, null, 4));
                    let timelineData = dataProcessor.getTimelineData(body);

                    return timelineData;
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getReports()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Single report URI route, called by client ajax, no view template rendering
    {
        method: 'GET',
        path:'/reports/{reportId}',
        handler: function (request, h) {
            let reportId = request.params.reportId;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getReport(tx,reportId))
                .then(function(body) {
                  session.close();
                    let report = dataProcessor.getReport(body);

                    return report;
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getReport()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Fact information URI route, called by client ajax
    {
        method: 'GET',
        path:'/fact/{patientId}/{factId}', 
        handler: function (request, h) {
            let patientId = request.params.patientId;
            let factId = request.params.factId;
            var session = driver.session();
            let promise = session.readTransaction(tx => neo4jBoltFunctions.getFact(tx,factId))
                .then(function(body) {
                  session.close();
                    let factJson = dataProcessor.getFact(body, patientId);
 
                    // Data to render fact.html
                    let data = {
                        detail: factJson.detail,
                        ordinalInterpretations: factJson.ordinalInterpretations,
                        procedures: factJson.procedures,
                        lateralities: factJson.lateralities,
                        bodyModifiers: factJson.bodyModifiers,
                        groupedTextProvenances: factJson.groupedTextProvenances // removed duplicates
                    };
                    
                    return h.view('fact', data, {layout: 'empty'});
                })
                .catch(function(error) {
                    session.close();
                	console.log('Failed to make the neo4j rest api call: getFact()');
                    console.error(error);
                });

            return promise;
        }
    }
];

/**
 * Expose the routes array as a local module
 */
module.exports = routes;

