'use strict';

const Hapi = require('hapi');

// inert is the static file and directory handlers plugin for hapi
const Inert = require('inert');

// vision adds template rendering support to hapi
const Vision = require('vision');

// Simplified HTTP request client
const HttpRequest = require('request');

// Neo4j queries
const neo4jCypherQueries = require('./js/neo4jCypherQueries.js');

// Utilities
const util = require('./js/util.js');

// By default, Node.js installations come with the file system module, fs
const fs = require('fs');

// Load configuration data
const config = JSON.parse(fs.readFileSync('./config.json'));

// Beo4j REST API cypher endpoint with basic auth
const requestUri = 'http://' + config.neo4j.username + ':' + config.neo4j.password + '@' + config.neo4j.uri;

// Create a server with a host and port
const server = new Hapi.Server();

server.connection({ 
    host: config.server.host, // If you plan to deploy your hapi application to a PaaS provider, you must listen on host 0.0.0.0 rather than localhost or 127.0.0.1, 
    port: config.server.port,
    router: {
        stripTrailingSlash: true // removes trailing slashes on incoming paths
    }
});

// Default route
server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, this is the default route of DeepPhe-Viz');
    }
});

// Register invert plugin and serve CSS and JS files
server.register(Inert, (err) => {
    if (err) {
        console.log('Errors with registering Inert plugin...');
        throw err;
    }
});

// CSS route
server.route({
    method: 'GET',
    path:'/css/{file}', 
    handler: function (request, reply) {
        // This 'file' handler is only available after registering Inert plugin
        reply.file(__dirname + '/css/' + request.params.file)
    }
});

// JS route
server.route({
    method: 'GET',
    path:'/js/{file}', 
    handler: function (request, reply) {
        // This 'file' handler is only available after registering Inert plugin
        reply.file(__dirname + '/js/' + request.params.file)
    }
});

// Register vision plugin to render view templates
server.register(Vision, (err) => {
    if (err) {
        console.log('Errors with registering Vision plugin...');
        throw err;
    }

    // Template rendering configuration
    server.views({
        // Using handlebars as template engine responsible for
        // rendering templates with an extension of .html
        engines: {
            html: require('handlebars')
        },
        isCached: false, // Tell Hapi not to cache the view files, no need to restart app
        layout: true, // Enable the built-in support for view layouts
        // Tell the server that our templates are located in the templates directory within the current path
        relativeTo: __dirname,
        path: './templates',
        layoutPath: './templates/layout'
    });
});

// All patients route
server.route({
    method: 'GET',
    path:'/patients', 
    handler: function (request, reply) {
        // REST API call: https://neo4j.com/docs/rest-docs/current/
        HttpRequest({
            uri: requestUri,
            method: "POST",
            headers: {
                // Enable streaming
                // Responses from the HTTP API can be transmitted as JSON streams, 
                // resulting in better performance and lower memory overhead on the server side.
                'X-Stream': true
            },
            json: {
                'query': neo4jCypherQueries.getPatients()
            }
        }, function (error, response, body) {
            if ( ! error) {
                //console.log('response: ' + JSON.stringify(response, null, 4));
                
                // Convert the body into desired json data structure
                var patientsJson = util.getPatientsJson(body);

                // Render patients.html
                var data = {
                    title: 'All patients',
                    patientsJson: JSON.stringify(patientsJson), // Converts a JavaScript value to a JSON string.
                    patients: JSON.stringify(patientsJson, null, 4) 
                };

                reply.view('patients', data);
            } else {
                console.log('Failed to make the neo4j rest api call: getPatients()');
                console.error(error);
            }
        });
    }
});

// Individual patient page
server.route({
    method: 'GET',
    path:'/patients/{patientName}', 
    handler: function (request, reply) {
        var patientName = request.params.patientName;

        // Render patient.html
        var data = {
            patientName: patientName,
            baseUri: server.info.uri // Get the base uri via server.info 
        };

        reply.view('patient', data);
    }
});

// Cancer summary endpoint called by client ajax, no view rendering
server.route({
    method: 'GET',
    path:'/patients/{patientName}/cancers', 
    handler: function (request, reply) {
        var patientName = request.params.patientName;

        // REST API call: https://neo4j.com/docs/rest-docs/current/
        HttpRequest({
            uri: requestUri,
            method: "POST",
            headers: {
                'X-Stream': true // Enable streaming
            },
            json: {
                'query': neo4jCypherQueries.getCancerSummary(patientName)
            }
        }, function (error, response, body) {
            if ( ! error) {
                //console.log('response: ' + JSON.stringify(response, null, 4));
                
                // Convert the body into desired json data structure
                var cancerSummary = util.getCancerSummaryJson(body);

                // Render cancerSummary.html
                var data = {
                    cancerName: cancerSummary.id,
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
});

// Reports endpoint called by client ajax, no view rendering
server.route({
    method: 'GET',
    path:'/patients/{patientName}/reports', 
    handler: function (request, reply) {
        var patientName = request.params.patientName;

        // REST API call: https://neo4j.com/docs/rest-docs/current/
        HttpRequest({
            uri: requestUri,
            method: "POST",
            headers: {
                'X-Stream': true // Enable streaming
            },
            json: {
                'query': neo4jCypherQueries.getReports(patientName)
            }
        }, function (error, response, body) {
            if ( ! error) {
                //console.log('response: ' + JSON.stringify(response, null, 4));

                // Render reports.html
                var data = {
                    columns: body.columns,
                    reports: body.data
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
});

// Single report endpoint called by client ajax, no view rendering
server.route({
    method: 'GET',
    path:'/reports/{reportId}', 
    handler: function (request, reply) {
        var reportId = request.params.reportId;

        // REST API call: https://neo4j.com/docs/rest-docs/current/
        HttpRequest({
            uri: requestUri,
            method: "POST",
            headers: {
                'X-Stream': true // Enable streaming
            },
            json: {
                'query': neo4jCypherQueries.getReport(reportId)
            }
        }, function (error, response, body) {
            if ( ! error) {
                //console.log('response: ' + JSON.stringify(response, null, 4));

                reply(body);
            } else {
                console.log('Failed to make the neo4j rest api call: getReport()');
                console.error(error);
            }
        });
    }
});

// Start the server
server.start((err) => {
    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});