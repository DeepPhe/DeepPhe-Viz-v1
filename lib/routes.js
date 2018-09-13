'use strict';

/**
 * Module dependencies.
 */

// The simplified HTTP request client 'request' with Promise support
const httpRequestPromise = require('request-promise');

// Neo4j queries object, local module
const neo4jCypherQueries = require('./neo4jCypherQueries.js');

// Utility class for converting the raw neo4j JSON to client JSON, local module
//const DataProcessor = require('./dataProcessor.js');

// DataProcessor class with all static methods, local module
const dataProcessor = require('./dataProcessor.js');

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

const neo4jRestCall = function(neo4jCypherQuery) {
	// Neo4j REST API cypher endpoint with basic auth
    // REST API call: https://neo4j.com/docs/rest-docs/current/
    const options = {
        uri: neo4jConfig.uri,
        auth: {
		    'user': neo4jConfig.username,
		    'pass': neo4jConfig.password
		},
        method: "POST",
        headers: {
            // Enable streaming
            // Responses from the HTTP API can be transmitted as JSON streams, 
            // resulting in better performance and lower memory overhead on the server side.
            'X-Stream': true
        },
        json: {
            // Neo4j Transactional Cypher HTTP request body
            // "statements" is an array of statements, we only have one statement/query per request
            'statements': [neo4jCypherQuery]
        }
    };

    return options;
};

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
            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getAllPatients()))
                .then(function(body) {
                    //console.log('response: ' + JSON.stringify(body, null, 4));
                	// Convert the body into desired json data structure
                    return dataProcessor.getCohortData(body);
                })
                .catch(function(error) {
                	console.log('Failed to make the neo4j rest api call: getAllPatients()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Tumor chart URI route
    {
        method: 'GET',
        path:'/tumorinfo/{patientNames}', 
        handler: function (request, h) {
            let patientNames = request.params.patientNames.split('+');

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getPatientsTumorInfo(patientNames)))
                .then(function(body) {
                    // Convert the body into desired json data structure
                    let patientsTumorInfo = dataProcessor.getPatientsTumorInfo(body);

                    // Further process the data for target chart
                    let biomarkersInfo = dataProcessor.getBiomarkersInfo(patientsTumorInfo);

                    let result = {
                    	patientsTumorInfo: patientsTumorInfo,
                    	biomarkersInfo: biomarkersInfo
                    };
                    
                    return result;
                })
                .catch(function(error) {
                	console.log('Failed to make the neo4j rest api call: getPatientsTumorInfo()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Diagnosis chart URI route
    {
        method: 'GET',
        path:'/diagnosis/{patientNames}', 
        handler: function (request, h) {
            let patientNames = request.params.patientNames.split('+');

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getDiagnosis(patientNames)))
                .then(function(body) {
                    // Convert the body into desired json data structure
                    return dataProcessor.getDiagnosis(patientNames, body);
                })
                .catch(function(error) {
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

    // Patient info
    {
        method: 'GET',
        path:'/patient/{patientName}/info', 
        handler: function (request, h) {
            let patientName = request.params.patientName;

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getPatientInfo(patientName)))
                .then(function(body) {
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
                	console.log('Failed to make the neo4j rest api call: getPatientInfo()');
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

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getCancerSummary(patientName)))
                .then(function(body) {
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

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getTumorSummary(patientName)))
                .then(function(body) {
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

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getReports(patientName)))
                .then(function(body) {
                    //console.log('response: ' + JSON.stringify(body, null, 4));
                    let sortedReports = dataProcessor.sortReportsByDate(body.results[0].data); // sort by date
                    
                    // Convert the index array to named array object
                    let timelineData = dataProcessor.prepareTimelineData(sortedReports);

                    return timelineData;
                })
                .catch(function(error) {
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

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getReport(reportId)))
                .then(function(body) {
                    let report = dataProcessor.getReport(body);

                    return report;
                })
                .catch(function(error) {
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

            let promise = httpRequestPromise(neo4jRestCall(neo4jCypherQueries.getFact(factId)))
                .then(function(body) {
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

