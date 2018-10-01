'use strict';


	/////////////////////////////////////////////////////////////////////////////////////////
	//
	//                            Neo4j Bolt Interface
	//
	////////////////////////////////////////////////////////////////////////////////////////

// Use npm to find out the latest version of the driver:
//    npm show neo4j-driver@* version
//    npm install neo4j-driver

// API Docs
// https://neo4j.com/docs/api/javascript-driver/1.6/

//
//    Create Driver
//

// Default bolt port is 7687
// Create a driver instance, for the user neo4j with password 123.
// It should be enough to have a single driver per database per application.
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123"));

driver.onCompleted = () => {
  console.log('Driver created');
};

driver.onError = error => {
  console.log(error);
};

//
//    Create Session
//

const session = driver.session();




// Method to create some item
const writeTxPromise = session.writeTransaction(tx => tx.run('CREATE (a:Item)'));

writeTxPromise.catch(error => {
  if (error.code === neo4j.error.SERVICE_UNAVAILABLE) {
    console.log('Unable to create node: ' + error.code);
  }
});


//
//    Run Session stuff
//

session.run('CREATE (i:Item)').then(() => {



   // Close Session
  session.close();

  // ... on application exit:
  driver.close();
});

//
//    Run other Session stuff
//

const resultPromise = session.writeTransaction(tx => tx.run(
  'CREATE (a:Greeting) SET a.message = $message RETURN a.message + ", from node " + id(a)',
  {message: 'hello, world'}));

resultPromise.then(result => {
  session.close();

  const singleRecord = result.records[0];
  const greeting = singleRecord.get(0);

  console.log(greeting);

  // on application exit:
  driver.close();
});

//
//    More session run stuff
//

session.run('CREATE (a:Person {name: $name})', {'name': personName}).then(() => {
  session.close(() => {
    console.log('Person created, session closed');
  });
});
