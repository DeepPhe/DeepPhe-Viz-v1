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
const neo4jDriver = neo4j.driver(neo4jConfig.uri, neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

// Base URI path name of the API endpoints
// We can create different API path names for different purposes
const apiBaseUriPath = "api";

// All routes are defined in this array
// Each route is a route configuration object
// https://hapijs.com/api#route-configuration
const routes = [
	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            VIZ ROUTES
	//
	/////////////////////////////////////////////////////////////////////////////////////////
    
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
        handler: function (request, h) {
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getCohortData())
                .then(function(neo4jResult) {
                    session.close();
                    
                    // 'cohortData' is the key
                    // Neo4j function deepphe.getCohortData() returns a list of patient data
                    let neo4jRawArr = neo4jResult.records[0].get('cohortData');

                	// Convert the body into desired json data structure
                    return dataProcessor.getCohortData(neo4jRawArr);
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
        path:'/biomarkers/{patientIds}', 
        handler: function (request, h) {
            let patientIds = request.params.patientIds.split('+');
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getBiomarkers(patientIds))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawArr = neo4jResult.records[0].get('biomarkers');

                    // Further process the data for target chart
                    let biomarkers = dataProcessor.getBiomarkers(neo4jRawArr);

                    return biomarkers;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getBiomarkers()');
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

                    let neo4jRawArr = neo4jResult.records[0].get('diagnosis'); 

                    // Convert the body into desired json data structure
                    return dataProcessor.getDiagnosis(patientIds, neo4jRawArr);
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

    // Patient info
    {
        method: 'GET',
        path:'/patient/{patientId}/info', 
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getPatientInfo(patientId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = neo4jResult.records[0].get('patientInfo');

                    // Convert the body into desired json data structure
                    let patientInfo = dataProcessor.getPatientInfo(neo4jRawJson);

                    // Specify to use the empty layout instead of the default layout
                    // This way we can send the rendered content as response directly
                    return h.view('patientInfo', patientInfo, {layout: 'empty'});
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
            let promise = session.run(neo4jFunctions.getCancerAndTumorSummary(patientId))
                .then(function(neo4jResult) {
                    // Here the neo4jRawArr is an array of cancer objects that contains cancer facts, 
                    // and all tumors as well as tumor facts of each tumor
                    let neo4jRawArr = neo4jResult.records[0].get('cancerAndTumorSummary');

                    let cancers = dataProcessor.getCancerAndTumorSummary(neo4jRawArr);

                    let data = {};
                    data.cancers = cancers;
                    data.melanomaAttributes = [
                        "Perineural Invasion", 
                        "Vertical Growth Phase", 
                        "Radial Growth Phase", 
                        "Regression", 
                        "Ulceration", 
                        "Lymphovascular Invasion"
                    ];
 
                    //console.log('data: ' + JSON.stringify(data, null, 4));
                    return h.view('cancerAndTumorSummary', data, {layout: 'empty'});  
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getCancerAndTumorSummary()');
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

                    let neo4jRawJson = neo4jResult.records[0].get('timelineData');

                    //console.log('timeline data: ' + JSON.stringify(neo4jRawJson, null, 4));
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
                    
                    // The neo4j function returns the report text and all textMentions as a JSON directly
                    let neo4jRawJson = neo4jResult.records[0].get('report');
                    return neo4jRawJson;
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
            let promise = session.run(neo4jFunctions.getFact(patientId, factId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = neo4jResult.records[0].get('fact');

                    let factJson = dataProcessor.getFact(neo4jRawJson, patientId);

                    return h.view('fact', factJson, {layout: 'empty'});
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getFact()');
                    console.error(error);
                });

            return promise;
        }
    },

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            API ROUTES
	//
	/////////////////////////////////////////////////////////////////////////////////////////
	
	// All patients from all stages URI route
    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/cohortData', 
        // For API documentation with Swagger
        options: {
        	// Route description used for generating documentation (string)
	        description: 'Cohort analysis data', 
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
                    // Neo4j function deepphe.getCohortData() returns a list of patient data
                    let neo4jRawArr = neo4jResult.records[0].get('cohortData');

                    // Convert the body into desired json data structure
                    return dataProcessor.getCohortData(neo4jRawArr);
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
        path: '/' + apiBaseUriPath + '/biomarkers/{patientIds}', 
        // For API documentation with Swagger
        options: {
	        description: 'Patients biomarkers information', 
	        notes: 'Returns the grouped biomarkers information in JSON for a list of given patient IDs (seperated using the plus sign "+")',
	        tags: ['api'],
	        validate: {
	            params: {
	                patientIds : Joi.string()
	                        .required()
	                        .description('A string of patient IDs, seperated by the plus sign "+"')
	            }
	        }
	    },
        handler: function (request, h) {
            let patientIds = request.params.patientIds.split('+');
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getPatientsTumorInfo(patientIds))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawArr = neo4jResult.records[0].get('biomarkers');

                    // Further process the data for target chart
                    let biomarkers = dataProcessor.getBiomarkers(neo4jRawArr);

                    return biomarkers;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getBiomarkers()');
                    console.error(error);
                });

            return promise;
        }
    },

    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/diagnosis/{patientIds}', 
        // For API documentation with Swagger
        options: {
	        description: 'Diagnosis of patients', 
	        notes: 'Returns the diagnosis information in JSON for a list of given patient IDs (seperated using the plus sign "+")',
	        tags: ['api'],
	        validate: {
	            params: {
	                patientIds : Joi.string()
	                        .required()
	                        .description('A string of patient IDs, seperated by plug sign')
	            }
	        }
	    },
        handler: function (request, h) {
            let patientIds = request.params.patientIds.split('+');
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getDiagnosis(patientIds))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawArr = neo4jResult.records[0].get('diagnosis'); 

                    // Convert the body into desired json data structure
                    return dataProcessor.getDiagnosis(patientIds, neo4jRawArr);
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getDiagnosis()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Patient info
    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/patient/{patientId}/info', 
        // For API documentation with Swagger
        options: {
            description: 'Patient basic information', 
            notes: 'Returns the basic patient information in JSON for a given patient ID',
            tags: ['api'],
            validate: {
                params: {
                    patientId : Joi.string()
                            .required()
                            .description('Patient ID string')
                }
            }
        },
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getPatientInfo(patientId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = neo4jResult.records[0].get('patientInfo');

                    // Convert the body into desired json data structure
                    let patientInfo = dataProcessor.getPatientInfo(neo4jRawJson);

                    return patientInfo;
                })
                .catch(function(error) {
                    console.log('Failed to make the neo4j bolt api call: getPatientInfo()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Reports timeline 
    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/patient/{patientId}/timeline', 
        // For API documentation with Swagger
        options: {
            description: 'Patient reports timeline', 
            notes: 'Returns the reports information in JSON for a given patient ID',
            tags: ['api'],
            validate: {
                params: {
                    patientId : Joi.string()
                            .required()
                            .description('Patient ID string')
                }
            }
        },
        handler: function (request, h) {
            let patientId = request.params.patientId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getTimelineData(patientId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = neo4jResult.records[0].get('timelineData');

                    //console.log('timeline data: ' + JSON.stringify(neo4jRawJson, null, 4));
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

    // Fact information URI route
    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/fact/{patientId}/{factId}', 
        // For API documentation with Swagger
        options: {
	        description: 'Fact', 
	        notes: 'Returns fact data in JSON for a given fact ID of a given patient ID',
	        tags: ['api'],
	        validate: {
	            params: {
	            	patientId : Joi.string()
	                        .required()
	                        .description('Patient ID string'),

	                factId : Joi.string()
	                        .required()
	                        .description('Fact ID string')
	            }
	        }
	    },
        handler: function (request, h) {
            let patientId = request.params.patientId;
            let factId = request.params.factId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getFact(factId))
                .then(function(neo4jResult) {
                    session.close();

                    let neo4jRawJson = neo4jResult.records[0].get('fact');

                    let factJson = dataProcessor.getFact(neo4jRawJson, patientId);

                    return factJson;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getFact()');
                    console.error(error);
                });

            return promise;
        }
    },

    // Single report URI route
    {
        method: 'GET',
        path: '/' + apiBaseUriPath + '/reports/{reportId}',
        // For API documentation with Swagger
        options: {
	        description: 'Report', 
	        notes: 'Returns report data in JSON for a given report ID',
	        tags: ['api'],
	        validate: {
	            params: {
	                reportId : Joi.string()
	                        .required()
	                        .description('Report ID string')
	            }
	        }
	    },
        handler: function (request, h) {
            let reportId = request.params.reportId;
            const session = neo4jDriver.session(neo4j.session.READ);
            let promise = session.run(neo4jFunctions.getReport(reportId))
                .then(function(neo4jResult) {
                    session.close();

                    // The neo4j function returns the report text and all textMentions as a JSON directly
                    let neo4jRawJson = neo4jResult.records[0].get('report');

                    return neo4jRawJson;
                })
                .catch(function(error) {
                	console.log('Failed to call the neo4j function: getReport()');
                    console.error(error);
                });

            return promise;
        }
    },


];

/**
 * Expose the routes array as a local module
 */
module.exports = routes;
