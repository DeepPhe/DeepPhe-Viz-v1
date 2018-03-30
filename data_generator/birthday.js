'use strict';

const neo4j = require('neo4j-driver').v1;

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// Create a driver instance
const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

// Create a session to run Cypher statements in
const readSession = driver.session();

function addBirthday(tx, patientName, birthday) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.birthday = $birthday";
    return tx.run(query, {'patientName': patientName, 'birthday': birthday});
}

function randomBirthday(start, end) {
    var date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
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

        // Generate random birthday
        var birthday = randomBirthday(new Date(1955, 1, 1), new Date(1995, 12, 31));
        
        // Create a new session for each write
        var writeSession = driver.session();

        var writeTxPromise = writeSession.writeTransaction(function (transaction) {
            return addBirthday(transaction, patientName, birthday);
        });

        writeTxPromise.then(function(result) {
            writeSession.close();

            if (result) {
                console.log('Birthday attribute added to ' + patientName + ': ' + birthday);
            }
        }).catch(function (error) {
            console.log(error);
        });
    });
}).catch(function (error) {
    console.log(error);
});

