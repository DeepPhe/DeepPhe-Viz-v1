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

function addFirstEncounterAge(tx, patientName, firstEncounterAge) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.firstEncounterAge = $firstEncounterAge";
    return tx.run(query, {'patientName': patientName, 'firstEncounterAge': firstEncounterAge});
}

function addLastEncounterAge(tx, patientName, lastEncounterAge) {
    var query = "MATCH (p:Patient) WHERE p.name = $patientName SET p.lastEncounterAge = $lastEncounterAge";
    return tx.run(query, {'patientName': patientName, 'lastEncounterAge': lastEncounterAge});
}

function getPatientAge(encounterDate, birthday) {
    var ageDiffMs = new Date(encounterDate).getTime() - new Date(birthday).getTime();
    var ageDate = new Date(ageDiffMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
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
        var firstEncounterAge = getPatientAge(_.min(datesArr), birthdays[patientName]);
        var lastEncounterAge = getPatientAge(_.max(datesArr), birthdays[patientName]);

        // Create a new session for firstEncounterAge write
        var firstEncounterAgeWriteSession = driver.session();

        var firstEncounterAgeWriteTxPromise = firstEncounterAgeWriteSession.writeTransaction(function (transaction) {
            return addFirstEncounterAge(transaction, patientName, firstEncounterAge);
        });

        firstEncounterAgeWriteTxPromise.then(function(result) {
            firstEncounterAgeWriteSession.close();

            if (result) {
                console.log('firstEncounterAge attribute added to ' + patientName);
            }
        }).catch(function (error) {
            console.log(error);
        });

        // Create a new session for lastEncounterAge write
        var lastEncounterAgeWriteSession = driver.session();

        var lastEncounterAgeWriteTxPromise = lastEncounterAgeWriteSession.writeTransaction(function (transaction) {
            return addLastEncounterAge(transaction, patientName, lastEncounterAge);
        });

        lastEncounterAgeWriteTxPromise.then(function(result) {
            lastEncounterAgeWriteSession.close();

            if (result) {
                console.log('lastEncounterAge attribute added to ' + patientName);
            }
        }).catch(function (error) {
            console.log(error);
        });
    });
}).catch(function (error) {
    console.log(error);
});

