'use strict';

const Hapi = require('hapi');

// inert is the static file and directory handlers plugin for hapi
const Inert = require('inert');

// vision adds template rendering support to hapi
const Vision = require('vision');

// Simplified HTTP request client
const HttpRequest = require('request');

// Neo4j queries
const neo4j = require('./js/neo4j.js');

// By default, Node.js installations come with the file system module, fs
const fs = require('fs');

// Load configuration data
const config = JSON.parse(fs.readFileSync('./config.json'));

// Create a server with a host and port
const server = new Hapi.Server();

server.connection({ 
    host: config.server.host, // If you plan to deploy your hapi application to a PaaS provider, you must listen on host 0.0.0.0 rather than localhost or 127.0.0.1, 
    port: config.server.port,
    routes: {
        cors: true,
        timeout: {  // Disable timeouts. Otherwise, long/slow /compare routes fail
            server: false,
            socket: false 
        }
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

// Register invert plugin and serve CSS files
server.register(Inert, (err) => {
    if (err) {
        throw err;
    }

    // CSS route
    server.route({
        method: 'GET',
        path:'/css/{file}', 
        handler: {
            file: function (request) {
                return 'css/' + request.params.file;
            }
        }
    });
});

// Register vision plugin to render view templates
server.register(Vision, (err) => {

    if (err) {
        throw err;
    }

    // Template rendering configuration
    server.views({
        // Using handlebars as template engine responsible for
        // rendering templates with an extension of .html
        engines: {
            html: require('handlebars')
        },
        // Tell the server that our templates are located in the templates directory within the current path
        path: __dirname + '/templates'
    });
});

// patient route
server.route({
    method: 'GET',
    path:'/patients/{patientName}', 
    handler: function (request, reply) {
        var patientName = request.params.patientName;

        // REST call
        HttpRequest({
            uri: 'http://' + config.neo4j.username + ':' + config.neo4j.password + '@' + config.neo4j.uri,
            method: "POST",
            json: {
                "query": neo4j.getPatient(patientName)
            }
        }, function (error, response, body) {
            if ( ! error) {
                console.log('response: ' + JSON.stringify(response, null, 4));
                // Render index.html
                reply.view('index', {
                    title: 'DeepPhe Viz',
                    patientInfo: response
                });
            } else {
                console.log('Request URI: ' + 'http://' + config.neo4j.username + ':' + config.neo4j.password + config.neo4j.uri);
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