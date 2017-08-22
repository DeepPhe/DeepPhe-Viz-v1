'use strict';

const Hapi = require('hapi');

// Routes definitions
const routes = require('./lib/routes.js');

// Load server configuration data
const serverConfig = require('./configs/server.json');

// Create a Hapi server instance
const server = new Hapi.Server();

// If you plan to deploy your hapi application to a PaaS provider, 
// you must listen on host 0.0.0.0 rather than localhost or 127.0.0.1
server.connection({ 
    host: serverConfig.host, 
    port: serverConfig.port,
    router: {
        stripTrailingSlash: true // removes trailing slashes on incoming paths
    }
});

// Register invert plugin to serve CSS and JS static files
server.register(require('inert'), (err) => {
    if (err) {
        console.log('Errors with registering Inert plugin...');
        throw err;
    }
});

// Register vision plugin to render view templates
server.register(require('vision'), (err) => {
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
        layout: 'default', // Use 'default.html' as the default layout
        // Tell the server that our templates are located in the templates directory within the current path
        relativeTo: __dirname,
        path: './client/templates',
        layoutPath: './client/templates/layout'
    });
});

// Default base URI route
server.route(routes.base);

// CSS URI route
server.route(routes.css);

// JS URI route
server.route(routes.js);

// Patients URI route
server.route(routes.patients);

// Individual patient URI route
server.route(routes.patient);

// Cancer summary URI route, called by client ajax
server.route(routes.cancers);

// Tumors summary URI route, called by client ajax
server.route(routes.tumors);

// Reports URI route, called by client ajax
server.route(routes.reports);

// Single report URI route, called by client ajax, no view template rendering
server.route(routes.report);

// Fact information URI route, called by client ajax
server.route(routes.fact);


// Start the server
server.start((err) => {
    if (err) {
        throw err;
    }
    console.log('Hapi HTTP Server is running at:', server.info.uri);
});