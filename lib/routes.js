'use strict';

/**
 * Module dependencies.
 */

// Simplified HTTP request client
const httpRequest = require('request');

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
                        patients: patientsJson.patients // Converts a JavaScript value to a JSON string.
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
                cancerId: cancer.id,
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
                        name: cancerSummary.name,
                        collatedFacts: cancerSummary.collatedFacts,
                        tnm: cancerSummary.tnm
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
                    reply.view('tumorSummary', data, {layout: 'empty'});
                } else {
                    console.log('Failed to make the neo4j rest api call: getTumorSummary()');
                    console.error(error);
                }
            });
        }
    },

    // Reports timeline URI route, called by client ajax, no view template rendering
    {
        method: 'GET',
        path:'/patients/{patientName}/timeline', 
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
                    var sortedReports = dataProcessor.sortReportsByDate(body.results[0].data); // sort by date
                    
                    // Convert the index array to named array object
                    var timelineData = dataProcessor.prepareTimelineData(sortedReports);

                    reply(timelineData);
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
        path:'/reports/{reportId}/{terms?}', // terms is optional
        handler: function (request, reply) {
            var reportId = request.params.reportId;
            // Get all the fact related mentions (if any) in the format of "a,b,c"
            // Pass an empty array [] for cases don't have fact related mentions. E.g., clicking timeline report circle
            var factMentionTermsArr = request.params.terms ? decodeURIComponent(request.params.terms).split(',') : [];

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
                    var report = dataProcessor.getReport(body, factMentionTermsArr);

                    // Data to render fact.html
                    var data = {
                        mentionedTerms: report.mentionedTerms // All mentioned terms
                    };

                    // https://github.com/hapijs/vision/blob/master/API.md
                    // Use server.render(template, context, [options], [callback]) to get the rendered string
                    // request.server can access the server object
                    request.server.render('mentionedTerms', data, {layout: 'empty'}, (err, rendered, config) => {
                        // Because we get the rendered view through this callback, the final reply needs to be inside the callback
                        // Return the rendered view along with other values directly
                        var result = {
                            renderedMentionedTerms: rendered,
                            reportText: report.text
                        };

                        reply(result);
                    })
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
                        groupedTextProvenances: factJson.groupedTextProvenances // removed duplicates
                    };

                    // https://github.com/hapijs/vision/blob/master/API.md
                    // Use server.render(template, context, [options], [callback]) to get the rendered string
                    // request.server can access the server object
                    request.server.render('fact', data, {layout: 'empty'}, (err, rendered, config) => {
                        // No report info if there's no textProvenances data (or it's empty)
                        // A Fact can actually come from more than one report.
                        // There aren't any current Facts with more than one report that I can point you towards.  
                        // Basically, we never got to that point in the 2 years that we have worked on dPhe.  
                        // However, consider that a single Fact such as "Breast Cancer" should be determined by evidence in multiple reports.   
                        // There shouldn't be a "Breast Cancer" fact for each report - there just is at this point 
                        // because we have always been rushed to just get something working, not necessarily the correct thing working. - Sean
                        var reportIds = (factJson.docIds.length > 0) ? factJson.docIds : [];

                        // Because we get the rendered view through this callback, the final reply needs to be inside the callback
                        // Return the rendered view along with other values directly
                        var result = {
                            renderedFact: rendered,
                            textProvenancesArr: factJson.groupedTextProvenances, // May contain duplicates
                            reportIds: reportIds
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

/**
 * Expose the routes array as a local module
 */
module.exports = routes;

