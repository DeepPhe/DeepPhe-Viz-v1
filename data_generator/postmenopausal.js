'use strict';

const neo4j = require('neo4j-driver').v1;

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// Create a driver instance
const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

// Create a session to run Cypher statements in
const readSession = driver.session();

function addPostmenopausal(tx, patientName, postmenopausal) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.postmenopausal = $postmenopausal";
    return tx.run(query, {'patientName': patientName, 'postmenopausal': postmenopausal});
}

// Get all patients
const readTxPromise = readSession.readTransaction(function (transaction) {
    return transaction.run('MATCH (p:Patient) RETURN p.name AS patientName');
});

readTxPromise.then(function (result) {
    readSession.close();
    
    // Add birthday for each patient
    result.records.forEach(function(record) {
        var patientName = record.get('patientName');

        // Generate random postmenopausal true or false
        var postmenopausal = (Math.random() >= 0.5);
        
        // Create a new session for each write
        var writeSession = driver.session();

        var writeTxPromise = writeSession.writeTransaction(function (transaction) {
            return addPostmenopausal(transaction, patientName, postmenopausal);
        });

        writeTxPromise.then(function(result) {
            writeSession.close();

            if (result) {
                console.log('Boolean attribute postmenopausal added to ' + patientName + ': ' + postmenopausal);
            }
        }).catch(function (error) {
            console.log(error);
        });
    });
}).catch(function (error) {
    console.log(error);
});

