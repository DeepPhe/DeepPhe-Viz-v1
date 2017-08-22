'use strict';

// Simplified HTTP request client
const httpRequest = require('request');

// Neo4j queries
const neo4jCypherQueries = require('./neo4jCypherQueries.js');

// Utility functions that convert the raw neo4j JSON to client JSON
const DataProcessor = require('./dataProcessor.js');

// We need to create an instance of DataProcessor
var dataProcessor = new DataProcessor();

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
        handler: function (request, reply) {
            reply('Hello, this is the default route of DeepPhe-Viz');
        }
    },

    // CSS URI route
    {
        method: 'GET',
        path:'/css/{file}', 
        handler: function (request, reply) {
            // This 'file' handler is only available after registering Inert plugin
            // ../ doesn't work
            reply.file('././client/css/' + request.params.file)
        }
    },

    // JS URI route
    {
        method: 'GET',
        path:'/js/{file}', 
        handler: function (request, reply) {
            // This 'file' handler is only available after registering Inert plugin
            reply.file('././client/js/' + request.params.file)
        }
    },

    // Patients URI route
    {
        method: 'GET',
        path:'/patients', 
        handler: function (request, reply) {
            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
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
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(response, null, 4));
                    
                    // Convert the body into desired json data structure
                    var patientsJson = dataProcessor.getPatients(body);

                    // Render patients.html
                    var data = {
                        title: 'All patients',
                        baseUri: request.server.info.uri, // Get the base uri via server.info 
                        patients: patientsJson.patients, // Converts a JavaScript value to a JSON string.
                        patientsJsonStr: JSON.stringify(patientsJson, null, 4) 
                    };

                    reply.view('patients', data);
                } else {
                    console.log('Failed to make the neo4j rest api call: getPatients()');
                    console.error(error);
                }
            });
        }
    },

    // Individual patient URI route
    {
        method: 'GET',
        path:'/patients/{patientName}', 
        handler: function (request, reply) {
            var patientName = request.params.patientName;

            // Render patient.html
            var data = {
                patientName: patientName,
                // Get the base uri via server.info 
                // request.server has the server object
                baseUri: request.server.info.uri 
            };

            reply.view('patient', data);
        }
    },

    // Cancer summary URI route, called by client ajax
    {
        method: 'GET',
        path:'/patients/{patientName}/cancers', 
        handler: function (request, reply) {
            var patientName = request.params.patientName;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getCancerSummary(patientName)]
                }
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(response, null, 4));
                    
                    // Convert the body into desired json data structure
                    var cancerSummary = dataProcessor.getCancerSummary(body);

                    // Render cancerSummary.html
                    var data = {
                        name: cancerSummary.id,
                        collatedFacts: cancerSummary.collatedFacts
                    };
                    
                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    reply.view('cancerSummary', data, {layout: 'empty'});
                } else {
                    console.log('Failed to make the neo4j rest api call: getCancerSummary()');
                    console.error(error);
                }
            });
        }
    },

    // Tumors summary URI route, called by client ajax
    {
        method: 'GET',
        path:'/patients/{patientName}/{cancerId}/tumors', 
        handler: function (request, reply) {
            var patientName = request.params.patientName;
            var cancerId = request.params.cancerId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getTumorSummary(patientName, cancerId)]
                }
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(response, null, 4));
                    
                    // Convert the body into desired json data structure
                    var tumors = dataProcessor.getTumorSummary(body);

                    // Render tumorSummary.html
                    var data = {
                        multiTumors: (tumors.data.length > 1) ? true : false,
                        commonCategories: tumors.commonCategories,
                        numOfCommonCategories: tumors.commonCategories.length,
                        tumorsData: tumors.data
                    };

                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    reply.view('tumorSummary', data, {layout: 'empty'});
                } else {
                    console.log('Failed to make the neo4j rest api call: getTumorSummary()');
                    console.error(error);
                }
            });
        }
    },

    // Reports URI route, called by client ajax
    {
        method: 'GET',
        path:'/patients/{patientName}/reports', 
        handler: function (request, reply) {
            var patientName = request.params.patientName;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getReports(patientName)]
                }
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(body, null, 4));

                    // Render reports.html
                    var data = {
                        columns: body.results[0].columns,
                        reports: dataProcessor.sortReportsByDate(body.results[0].data), // sort by date
                        rowspan: body.results[0].data.length + 1
                    };

                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    reply.view('reports', data, {layout: 'empty'});
                } else {
                    console.log('Failed to make the neo4j rest api call: getReports()');
                    console.error(error);
                }
            });
        }
    },

    // Single report URI route, called by client ajax, no view template rendering
    {
        method: 'GET',
        path:'/reports/{reportId}', 
        handler: function (request, reply) {
            var reportId = request.params.reportId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getReport(reportId)]
                }
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(response, null, 4));
                    var reportText = dataProcessor.getReportText(body);

                    reply(reportText);
                } else {
                    console.log('Failed to make the neo4j rest api call: getReport()');
                    console.error(error);
                }
            });
        }
    },

    // Fact information URI route, called by client ajax
    {
        method: 'GET',
        path:'/fact/{factId}', 
        handler: function (request, reply) {
            var factId = request.params.factId;

            // REST API call: https://neo4j.com/docs/rest-docs/current/
            httpRequest({
                uri: neo4jRequestUri,
                auth: neo4jApiAuth,
                method: "POST",
                headers: {
                    'X-Stream': true // Enable streaming
                },
                json: {
                    'statements': [neo4jCypherQueries.getFact(factId)]
                }
            }, function (error, response, body) {
                if ( ! error) {
                    //console.log('response: ' + JSON.stringify(response, null, 4));
                    var factJson = dataProcessor.getFact(body);
                    
                    // Data to render fact.html
                    var data = {
                        detail: factJson.detail,
                        ordinalInterpretations: factJson.ordinalInterpretations,
                        procedures: factJson.procedures,
                        lateralities: factJson.lateralities,
                        bodyModifiers: factJson.bodyModifiers,
                        textProvenances: factJson.textProvenances
                    };

                    // https://github.com/hapijs/vision/blob/master/API.md
                    // Use server.render(template, context, [options], [callback]) to get the rendered string
                    // request.server can access the server object
                    request.server.render('fact', data, {layout: 'empty'}, (err, rendered, config) => {
                        // No report info if there's no textProvenances data (or it's empty)
                        var reportId = '';
                        // Can we assume all text mentions are found in the same report?
                        if (typeof(factJson.textProvenances[0]) !== 'undefined') {
                            reportId = factJson.textProvenances[0].documentId;
                        }

                        // Because we get the rendered view through this callback, the final reply needs to be inside the callback
                        // Return the rendered view along with other values directly
                        var result = {
                            renderedFact: rendered,
                            textProvenancesArr: factJson.textProvenances,
                            reportId: reportId
                        };

                        reply(result);
                    })
                } else {
                    console.log('Failed to make the neo4j rest api call: getFact()');
                    console.error(error);
                }
            });
        }
    }
];

module.exports = routes;

