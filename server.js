'use strict';

const Hapi = require('hapi');

// Routes definitions array, local module
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
    // server.views is available only after registering vision plugin
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
        layoutPath: './client/templates/layout',
        helpersPath: './client/templates/helpers'
    });
});

// Serve all routes defined in the routes array
// server.route() takes an array of route objects
server.route(routes);


// Start the server
server.start((err) => {
    if (err) {
        throw err;
    }
    console.log('Hapi HTTP Server is running at:', server.info.uri);
});