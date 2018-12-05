'use strict';

const Hapi = require('hapi');

const Inert = require('inert');

const Vision = require('vision');

const HapiSwagger = require('hapi-swagger');

const packageJson = require('./package.json');

// Routes definitions array, local module
const routes = require('./lib/routes.js');

// Load server configuration data
const serverConfig = require('./configs/server.json');

// Create a Hapi server instance
// If you plan to deploy your hapi application to a PaaS provider, 
// you must listen on host 0.0.0.0 rather than localhost or 127.0.0.1
const server = new Hapi.Server({
    host: serverConfig.host, 
    port: serverConfig.port,
    router: {
        isCaseSensitive: false,
        stripTrailingSlash: true // removes trailing slashes on incoming paths
    }
});

// Serve all routes defined in the routes array
// server.route() takes an array of route objects
server.route(routes);

// Register plugins and start the server
const init = async function() {
    // Register invert plugin to serve CSS and JS static files
    await server.register(Inert);

    // Register vision plugin to render view templates
    await server.register(Vision);

    const swaggerOptions = {
        info: {
                title: 'Test API Documentation',
                version: packageJson.version,
            },
        };

    await server.register(
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        });

    server.views({
        // Using handlebars as template engine responsible for
        // rendering templates with an extension of .html
        engines: {
            html: require('handlebars')
        },
        isCached: false, // Tell Hapi not to cache the view files, no need to restart app
        // Tell the server that our templates are located in the templates directory within the current path
        relativeTo: __dirname,
        path: './client/templates',
        layoutPath: './client/templates/layout',
        helpersPath: './client/templates/helpers'
    });

    // Start the server
    await server.start();
    console.log(`DeepPhe-Viz HTTP Server is running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
