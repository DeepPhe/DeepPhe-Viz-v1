'use strict';

// Load the full build of lodash
// Differences between core build and full build: https://github.com/lodash/lodash/wiki/Build-Differences
const _ = require('lodash');

const neo4j = require('neo4j-driver').v1;

// Load neo4j configuration data
const neo4jConfig = require('../configs/neo4j.json');

// Create a driver instance
const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password));

// Create a session to run Cypher statements in
const readSession = driver.session();

function addFirstEncounterDate(tx, patientName, firstEncounterDate) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.firstEncounterDate = $firstEncounterDate";
    return tx.run(query, {'patientName': patientName, 'firstEncounterDate': firstEncounterDate});
}

function addLastEncounterDate(tx, patientName, lastEncounterDate) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.lastEncounterDate = $lastEncounterDate";
    return tx.run(query, {'patientName': patientName, 'lastEncounterDate': lastEncounterDate});
}

function getDateString(date) {
    return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
}

// Get all patients
const readTxPromise = readSession.readTransaction(function (transaction) {
    return transaction.run('MATCH (p:Patient)-->(r:Report) return p.name AS patientName, p.birthday AS birthday, r.principalDate AS reportDate');
});

readTxPromise.then(function (result) {
    readSession.close();
    
    var patients = {};
    var birthdays = {};

    // Add birthday for each patient
    result.records.forEach(function(record) {
        var patientName = record.get('patientName');
        var birthday = record.get('birthday');

        // Convert the string to Date object
        var reportDate = new Date(record.get('reportDate').slice(0, 19));

        // Add report date
        if (typeof patients[patientName] === 'undefined') {
            patients[patientName] = [];
        }
        
        patients[patientName].push(reportDate);

        // Add birthday
        if (typeof birthdays[patientName] === 'undefined') {
            birthdays[patientName] = birthday;
        }
    });

    Object.keys(patients).forEach(function(patientName) {
        var datesArr = patients[patientName];
        var firstEncounterDate = getDateString(_.min(datesArr));
        var lastEncounterDate = getDateString(_.max(datesArr));

        // Create a new session for firstEncounterDate write
        var firstEncounterDateWriteSession = driver.session();

        var firstEncounterDateWriteTxPromise = firstEncounterDateWriteSession.writeTransaction(function (transaction) {
            return addFirstEncounterDate(transaction, patientName, firstEncounterDate);
        });

        firstEncounterDateWriteTxPromise.then(function(result) {
            firstEncounterDateWriteSession.close();

            if (result) {
                console.log('firstEncounterDate attribute added to ' + patientName);
            }
        }).catch(function (error) {
            console.log(error);
        });

        // Create a new session for lastEncounterDate write
        var lastEncounterDateWriteSession = driver.session();

        var lastEncounterDateWriteTxPromise = lastEncounterDateWriteSession.writeTransaction(function (transaction) {
            return addLastEncounterDate(transaction, patientName, lastEncounterDate);
        });

        lastEncounterDateWriteTxPromise.then(function(result) {
            lastEncounterDateWriteSession.close();

            if (result) {
                console.log('lastEncounterDate attribute added to ' + patientName);
            }
        }).catch(function (error) {
            console.log(error);
        });
    });
}).catch(function (error) {
    console.log(error);
});

