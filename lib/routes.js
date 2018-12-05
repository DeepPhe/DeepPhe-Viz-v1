'use strict';

/**
 * Module dependencies.
 */

// Using joi for API parameters validation with Swagger
const Joi = require('joi');

// Use neo4j-driver to access to Neo4j
const neo4j = require('neo4j-driver').v1;

// DataProcessor class with all static methods, local module
const dataProcessor = require('./dataProcessor.js');

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// Neo4j queries object, local module
const neo4jFunctions = require('./neo4jFunctions.js');

// neo4j bolt driver, default bolt port is 7687
var neo4jDriver = neo4j.driver(neo4jConfig.uri, neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

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
            let data = {
                title: 'Cohort Analysis',
                baseUri: request.server.info.uri // Get the base uri via server.info 
            };
            
            // Render cohortAnalysis.html
            return h.view('cohortAnalysis', data, {layout: 'cohort'});
        }
    },

    // All patients from all stages URI route
    {
        method: 'GET',
        path:'/cohortData', 
        // For API documentation with Swagger
        options: {
        	// Route description used for generating documentation (string)
	        description: 'Cohort Analysis Data Endpoint', 
	        // Route notes used for generating documentation (string or array of strings)
	        notes: 'Returns the JSON data for rendering cohort analysis charts',
	        // Route tags used for generating documentation (array of strings)
	        // We can use `/documentation?tags=foo` for tag-specific documentation
	        tags: ['api'] 
	    },
        handler: function (request, h) {
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getCohortData())
                .then(function(neo4jResult) {
                    session.close();
                    
                    // 'cohortData' is the key
                    // Neo4j functions return the single string value, so there will be only one record
                    // we need to convert it to a JSON object
                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('cohortData'));

                    //console.log('response: ' + JSON.stringify(neo4jRawJson, null, 4));
                	// Convert the body into desired json data structure
                    return dataProcessor.getCohortData(neo4jRawJson);
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getCohortData()');
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
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getPatientsTumorInfo(patientIds))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('patientsTumorInfo'));

                    // Convert the result into desired json data structure
                    let patientsTumorInfo = dataProcessor.getPatientsTumorInfo(neo4jRawJson);

                    // Further process the data for target chart
                    let biomarkersInfo = dataProcessor.getBiomarkersInfo(patientsTumorInfo);

                    let result = {
                    	patientsTumorInfo: patientsTumorInfo,
                    	biomarkersInfo: biomarkersInfo
                    };
                    
                    return result;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getPatientsTumorInfo()');
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
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getDiagnosis(patientIds))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('diagnosis')); 

                    // Convert the body into desired json data structure
                    return dataProcessor.getDiagnosis(patientIds, neo4jRawJson);
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getDiagnosis()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Individual patient URI route
    {
        method: 'GET',
        path:'/patient/{patientId}', 
        handler: function (request, h) {
            let patientId = request.params.patientId;

            // Render patient.html
            let data = {
                patientId: patientId,
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
        path:'/patient/{patientId}/info', 
        // For API documentation with Swagger
        options: {
        	// Route description used for generating documentation (string)
	        description: 'Patient Basic Info Endpoint', 
	        // Route notes used for generating documentation (string or array of strings)
	        notes: 'Returns the basic patient information in JSON for a given patient ID',
	        // Route tags used for generating documentation (array of strings)
	        // We can use `/documentation?tags=foo` for tag-specific documentation
	        tags: ['api'],
	        validate: {
	            params: {
	                patientId : Joi.string()
	                        .required()
	                        .description('Patient ID string'),
	            }
	        }
	    },
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getPatientInfo(patientId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('patientInfo'));

                    // Convert the body into desired json data structure
                    let patientInfo = dataProcessor.getPatientInfo(neo4jRawJson);

                    // Render patient.html
                    let data = {
                        id: patientInfo.id,
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
                    console.log('Failed to make the neo4j bolt api call: getPatientInfo()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Cancer and tumor summary URI route, called by client ajax
    {
        method: 'GET',
        path:'/patient/{patientId}/cancerAndTumorSummary', 
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            // First get cancer information
            let promise = session.run(neo4jFunctions.getCancerSummary(patientId))
                .then(function(neo4jResult) {
                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('cancerSummary'));

                    let cancers = dataProcessor.getCancerSummary(neo4jRawJson);

                    // Then get tumor summary for each cancer
                    let promiseArr = [];
                    cancers.forEach(function(cancer) {
                        let promise = session.run(neo4jFunctions.getTumorSummary(patientId, cancer.cancerId))
                            .then(function(neo4jResult) {
                                let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('tumorSummary'));

                                let tumorSummary = dataProcessor.getTumorSummary(neo4jRawJson);

                                // Add tumors and collatedFactsByCategory array to the cancer object
                                cancer.tumors = tumorSummary.tumors;
                                cancer.collatedFactsByCategory = tumorSummary.collatedFactsByCategory;
                                // Here each promise returns the cancer object with added tumors array
                                return cancer;
                            })
                            .catch(function(error) {
                                console.log('Failed to call the neo4j function: getTumorSummary()');
                                console.error(error);
                            });

                        promiseArr.push(promise);
                    });

                    // Run all the promises in order
                    let allPromises = Promise.all(promiseArr)
                        .then(function(results) {
                            session.close();

                            let data = {};
				            data.cancers = [];
				            data.melanomaAttributes = [
				                "Perineural Invasion", 
				                "Vertical Growth Phase", 
				                "Radial Growth Phase", 
				                "Regression", 
				                "Ulceration", 
				                "Lymphovascular Invasion"
				            ];

                            //console.log('results: ' + JSON.stringify(results, null, 4));
                            
                            // Here the results is an array of cancer objects returned by each promise in the promiseArr
                            results.forEach(function(result) {
                                data.cancers.push(result);
                            });

                            //console.log('data: ' + JSON.stringify(data, null, 4));
                            return h.view('cancerAndTumorSummary', data, {layout: 'empty'});
                        })
                        .catch(function(err){
                            console.error('Promise.all() error', err); 
                        });

                    return allPromises;   
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getCancerSummary()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Reports timeline URI route, called by client ajax, no view template rendering
    {
        method: 'GET',
        path:'/patient/{patientId}/timeline', 
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getTimelineData(patientId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('timelineData'));

                    //console.log('response: ' + JSON.stringify(neo4jRawJson, null, 4));
                    let timelineData = dataProcessor.getTimelineData(neo4jRawJson);

                    return timelineData;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getTimelineData()');
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
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getReport(reportId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('report'));

                    let report = dataProcessor.getReport(neo4jRawJson);

                    return report;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getReport()');
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
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getFact(factId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = JSON.parse(neo4jResult.records[0].get('fact'));

                    let factJson = dataProcessor.getFact(neo4jRawJson, patientId);

                    // Data to render fact.html
                    let data = {
                        detail: factJson.detail,
                        procedures: factJson.procedures,
                        lateralities: factJson.lateralities,
                        bodyModifiers: factJson.bodyModifiers,
                        groupedTextProvenances: factJson.groupedTextProvenances // removed duplicates
                    };
                    
                    return h.view('fact', data, {layout: 'empty'});
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getFact()');
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
