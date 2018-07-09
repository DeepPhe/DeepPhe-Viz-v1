'use strict';

/**
 * Module dependencies.
 */

// Simplified HTTP request client
const httpRequest = require('request-promise');

// Neo4j queries object, local module
const neo4jCypherQueries = require('./neo4jCypherQueries.js');

// Utility class for converting the raw neo4j JSON to client JSON, local module
const DataProcessor = require('./dataProcessor.js');

// We need to create an instance of DataProcessor class
var dataProcessor = new DataProcessor();

// Load cancer info
const cancer = require('../configs/cancer.json');

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// Neo4j REST API cypher endpoint with basic auth
const neo4jRequestUri = neo4jConfig.uri;

// Auth object that will be sent via HTTP header
const neo4jApiAuth = {
    'user': neo4jConfig.username,
    'pass': neo4jConfig.password
};

// All routes are defined in this array
// Each route is a route configuration object
// https://hapijs.com/api#route-configuration
var routes = [
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
            var data = {
                title: 'Cohort Analysis',
                baseUri: request.server.info.uri // Get the base uri via server.info 
            };

            return h.view('cohortAnalysis', data);
        }
    },

    // cancerStages URI route
    {
        method: 'GET',
        path:'/cancerStages', 
        handler: function (request, h) {
            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
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
                    'statements': [neo4jCypherQueries.getPatients()]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                	// Convert the body into desired json data structure
                    return dataProcessor.getCancerStages(body);
                })
                .catch(function(error) {
                	console.log('Failed to make the neo4j rest api call: getPatients()');
                    console.error(error);
                });

            return promise;
        }
    },

    // List of patients URI route
    {
        method: 'GET',
        path:'/patients/{stage?}', // stage is optional
        handler: function (request, h) {
            // null is an assignment value. It can be assigned to a variable as a representation of no value
            var stage = request.params.stage ? decodeURIComponent(request.params.stage) : null;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
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
                    'statements': [neo4jCypherQueries.getPatients()]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                	// Convert the body into desired json data structure
                    return dataProcessor.getPatients(body, stage);
                })
                .catch(function(error) {
                	console.log('Failed to make the neo4j rest api call: getPatients()');
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
            var patientNames = request.params.patientNames.split('+');

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
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
                    'statements': [neo4jCypherQueries.getPatientsTumorInfo(patientNames, cancer.id)]
                }
            };


            var promise = httpRequest(options)
                .then(function(body) {
                    // Convert the body into desired json data structure
                    var patientsTumorInfo = dataProcessor.getPatientsTumorInfo(body);

                    // Further process the data for target chart
                    var biomarkersInfo = dataProcessor.getBiomarkersInfo(patientsTumorInfo);

                    var result = {
                    	patientsTumorInfo: patientsTumorInfo,
                    	biomarkersInfo: biomarkersInfo
                    };
                    
                    return result;
                })
                .catch(function(error) {
                	console.log('Failed to make the neo4j rest api call: getPatuentsTumorInfo()');
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
            var patientName = request.params.patientName;

            // Render patient.html
            var data = {
                patientName: patientName,
                cancerId: cancer.id,
                // Get the base uri via server.info 
                // request.server has the server object
                baseUri: request.server.info.uri 
            };

            return h.view('patient', data);
        }
    },

    // Patient info
    {
        method: 'GET',
        path:'/patient/{patientName}/info', 
        handler: function (request, h) {
            var patientName = request.params.patientName;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getPatientInfo(patientName)]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                    // Convert the body into desired json data structure
                    var patientInfo = dataProcessor.getPatientInfo(body);

                    // Render patient.html
                    var data = {
                        name: patientInfo.name,
                        age: patientInfo.age,
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
            var patientName = request.params.patientName;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getCancerSummary(patientName)]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                    // Convert the body into desired json data structure
                    var cancerSummary = dataProcessor.getCancerSummary(body);

                    // Render cancerSummary.html
                    var data = {
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
        path:'/patient/{patientName}/{cancerId}/tumors', 
        handler: function (request, h) {
            var patientName = request.params.patientName;
            var cancerId = request.params.cancerId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getTumorSummary(patientName, cancerId)]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                    // Convert the body into desired json data structure
                    var summary = dataProcessor.getTumorSummary(body);

                    // Show "Present" instead of repeating these attributes labels. Melanoma specific
                    var melanomaAttributes = [
                        "Perineural Invasion", 
                        "Vertical Growth Phase", 
                        "Radial Growth Phase", 
                        "Regression", 
                        "Ulceration", 
                        "Lymphovascular Invasion"
                    ];

                    // Render tumorSummary.html
                    var data = {
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
            var patientName = request.params.patientName;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getReports(patientName)]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                    //console.log('response: ' + JSON.stringify(body, null, 4));
                    var sortedReports = dataProcessor.sortReportsByDate(body.results[0].data); // sort by date
                    
                    // Convert the index array to named array object
                    var timelineData = dataProcessor.prepareTimelineData(sortedReports);

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
            var reportId = request.params.reportId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getReport(reportId)]
                }
            };

            var promise = httpRequest(options)
                .then(function(body) {
                    var report = dataProcessor.getReport(body);

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
            var patientId = request.params.patientId;
            var factId = request.params.factId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            var options = {
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getFact(factId)]
                }
            };

            var promise = httpRequest(options)
                .then(async function(body) {
                    var factJson = dataProcessor.getFact(body, patientId);
 
                    // Data to render fact.html
                    var data = {
                        detail: factJson.detail,
                        ordinalInterpretations: factJson.ordinalInterpretations,
                        procedures: factJson.procedures,
                        lateralities: factJson.lateralities,
                        bodyModifiers: factJson.bodyModifiers,
                        reportIds: (factJson.docIds.length > 0) ? factJson.docIds : [],
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

