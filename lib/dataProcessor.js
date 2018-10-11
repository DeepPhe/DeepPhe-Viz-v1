'use strict';

/**
 * Module dependencies.
 */

// Load the full build of lodash
// Differences between core build and full build: https://github.com/lodash/lodash/wiki/Build-Differences
const _ = require('lodash');

// For writing debugging JSON into file
const fs = require('fs');

// Add methods to DataProcessor.prototype
class DataProcessor {
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    //                            COHORT
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    static getCohortData(neo4jRawJson) {
        // // For testing/debugging the neo4jRawJson
        // console.log('neo4jRawJson: ' + JSON.stringify(neo4jRawJson, null, 4));

        let self = this;
        let stagesJson = {};
        stagesJson.stagesInfo = [];
        stagesJson.patientsInfo = this.getAllPatients(neo4jRawJson);

        let dataArr = neo4jRawJson.results[0].data;

        // Get all unique stages
        let uniqueStages = [];

        for (let i = 0; i < dataArr.length; i++) {
            let shortStageName = this.getShortStageName(dataArr[i].row[1]);

            // Any shortStageName that is not in the order list, will be ignored.
            if (this.getOrderedCancerStages().indexOf(shortStageName) !== -1 && uniqueStages.indexOf(shortStageName) === -1) {
                uniqueStages.push(shortStageName);
            }
        }

        // Sort the uniqueCancerFactRelnArr by the item's index in the order array
        let sortedUniqueStages = this.sortByProvidedOrder(uniqueStages, this.getOrderedCancerStages());

        // Aggregate patients of each stage
        let stagesInfo = [];
        sortedUniqueStages.forEach(function(stage) {
            let obj = {};
            obj.stage = stage;
            obj.patients = [];
            obj.ages = [];

            // Top level stage should also contain all patients from sub-leve stages
            const topLevelStages = {
                'Stage Unknown': ['Stage Unknown'],
                'Stage 0': ['Stage 0'],
                'Stage I': ['Stage I', 'Stage IA', 'Stage IB', 'Stage IC'],
                'Stage II': ['Stage II', 'Stage IIA', 'Stage IIB', 'Stage IIC'],
                'Stage III': ['Stage III', 'Stage IIIA', 'Stage IIIB', 'Stage IIIC'],
                'Stage IV': ['Stage IV', 'Stage IVA', 'Stage IVB', 'Stage IVC']
            };

            if (Object.keys(topLevelStages).indexOf(stage) !== -1) {
                for (let i = 0; i < dataArr.length; i++) {
                    let patient = dataArr[i].row[0];
                    let shortStageName = self.getShortStageName(dataArr[i].row[1]);
                    // Use lodash's _.findIndex() instead of the native indexOf() to avoid duplicates
                    if ((topLevelStages[stage].indexOf(shortStageName) !== -1) && (_.findIndex(obj.patients, patient) === -1)) {
                        // Will have access to all patient properties 
                        // as a result of the whole patient object being added to array
                        obj.patients.push(patient);
                    }
                }
            } else {
                for (let i = 0; i < dataArr.length; i++) {
                    let patient = dataArr[i].row[0];
                    let shortStageName = self.getShortStageName(dataArr[i].row[1]);

                    if ((shortStageName === stage) && (_.findIndex(obj.patients, patient) === -1)) {
                        obj.patients.push(patient);
                    }
                }
            }

            // Sort by patient age of first encounter
            obj.patients = _.sortBy(obj.patients, 'firstEncounterAge');

            obj.patientsCount = obj.patients.length;
            
            // Add age of first encounter to the ages array for rendering box plot
            obj.patients.forEach(function(patient) {
                obj.ages.push(self.getPatientEncounterAgeByDateString(patient.firstEncounterDate, patient.birthday));
            });
            
            // Must sort the ages by asending order
            obj.ages.sort();

            stagesInfo.push(obj);
        });

        // Sort the stages by patients count in ascending order 
        //stagesJson.stagesInfo = _.sortBy(stagesInfo, 'patientsCount');
        stagesJson.stagesInfo = stagesInfo;

        // Return the JSON object
        return stagesJson;
    }

    static getDiagnosis(patientIds, neo4jRawJson) {
        let self = this;
        let diagnosisInfo = {};
        diagnosisInfo.patients = {};
        diagnosisInfo.diagnosis = [];
        diagnosisInfo.data = [];

        let dataArr = neo4jRawJson.results[0].data;
        let uniqueDiagnosisArr = [];

        // Build an array of unique diagnosis
        for (let i = 0; i < dataArr.length; i++) {
            let diagnosis = this.normalizeDiagnosis(dataArr[i].row[1]);

            if (uniqueDiagnosisArr.indexOf(diagnosis) === -1) {
                uniqueDiagnosisArr.push(diagnosis);
            } 
        }

        diagnosisInfo.diagnosis = uniqueDiagnosisArr;

        patientIds.forEach(function(patient) {
            let obj = {};
            obj.patient = patient;
            obj.diagnosis = [];

            for (let i = 0; i < dataArr.length; i++) {
                let patientName = dataArr[i].row[0];
                let diagnosis = self.normalizeDiagnosis(dataArr[i].row[1]);

                if (patientName === patient && obj.diagnosis.indexOf(diagnosis) === -1) {
                    obj.diagnosis.push(diagnosis);
                } 
            }

            diagnosisInfo.data.push(obj);

            // Also add to the diagnosisInfo.patients object
            if (typeof diagnosisInfo.patients[patient] === "undefined") {
                diagnosisInfo.patients[patient] = obj.diagnosis;
            }
        });

        return diagnosisInfo;
    }

    
    // Used by cohort analysis
    static getPatientsTumorInfo(neo4jRawJson) {
        let self = this;

        let patientsTumorInfo = {};
        patientsTumorInfo.data = [];

        let dataArr = neo4jRawJson.results[0].data;
        let uniquePatientsArr = [];

        // Build an array of unique patient id
        for (let i = 0; i < dataArr.length; i++) {
            if (uniquePatientsArr.indexOf(dataArr[i].row[0]) === -1) {
                uniquePatientsArr.push(dataArr[i].row[0]);
            } 
        }

        // Get grouped tumor info for each patient
        uniquePatientsArr.forEach(function(patientId) {
            let patient = {};
            patient.patientId = patientId;
            patient.tumorSummary = {};

            // Compose the format of neo4jRawJson for each patient
            // so we can get the tumor summary directly by resuing `getTumorSummary()`
            let patientNeo4jRawJson = {};
            patientNeo4jRawJson.results = [];

            let resultsObj = {};
            resultsObj.data = [];

            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].row[0] === patientId) {
                    let dataObj = {};
                    dataObj.row = [];

                    // Build the row array
                    dataObj.row.push(dataArr[i].row[1]);
                    dataObj.row.push(dataArr[i].row[2]);
                    dataObj.row.push(dataArr[i].row[3]);
                    dataObj.row.push(dataArr[i].row[4]);
                    dataObj.row.push(dataArr[i].row[5]);

                    // Add the dataObj to the data array
                    resultsObj.data.push(dataObj);
                } 
            }

            // Add to final results array
            patientNeo4jRawJson.results.push(resultsObj);

            // Add tumor summary to this patient
            patient.tumorSummary = self.getTumorSummary(patientNeo4jRawJson);

            // Add the patient tumor info to array
            patientsTumorInfo.data.push(patient);
        });

        // Return the list of target patients as well
        patientsTumorInfo.patientList = uniquePatientsArr;

        return patientsTumorInfo;
    }

    // Takes the resulting json generated by getPatientsTumorInfo() as input data
    // biomarkers is only a small chunk of the patientsTumorInfo, we can parse more for other useages
    static getBiomarkersInfo(patientsTumorInfo) {
        let info = {};
        info.patients = patientsTumorInfo.patientList;
        // In UI, convert HER2_Neu to HER2/Neu for label display
        info.biomarkersPool = ["Estrogen_Receptor", "Progesterone_Receptor", "HER2_Neu"];
        info.biomarkerStatus = ['positive', 'negative', 'unknown'];
        info.data = [];

        let biomarkersData = {};

        // Initialize the biomarker statistics data
        info.biomarkersPool.forEach(function(biomarker) {
            let obj = {};
            obj.positive = 0;
            obj.negative = 0;
            obj.unknown = 0;

            biomarkersData[biomarker] = obj;
        });

        // Build an arry of hasReceptorStatus
        let receptorStatusDataArr = [];
        patientsTumorInfo.data.forEach(function(patientsTumorInfo) {
            patientsTumorInfo.tumorSummary.collatedFactsByCategory.forEach(function(obj) {
                if (obj.categoryClass === "hasReceptorStatus") {
                    receptorStatusDataArr.push(obj);
                }
            });
        });

        // Loop through each tumor
        receptorStatusDataArr.forEach(function(obj) {
            obj.data.forEach(function(tumor) {
                if (tumor.facts.length > 0) {
                    tumor.facts.forEach(function(fact) {
                        // Parse the receptor type and status
                        let receptorNameSegmentsArr = fact.name.split("_");
                        let status = receptorNameSegmentsArr.pop();
                        let name = receptorNameSegmentsArr.join("_");

                        biomarkersData[name][status.toLowerCase()]++;
                    });
                } else {
                    info.biomarkersPool.forEach(function(biomarker) {
                        biomarkersData[biomarker].unknown++;
                    });
                }
                    
            });
        });

        // Further process to meet the needs of front end rendering
        info.biomarkersPool.forEach(function(biomarker) {
            let obj = {};
            obj.biomarker = biomarker;
            obj.positive = 0;
            obj.negative = 0;
            obj.unknown = 0;

            let totalCount = biomarkersData[biomarker].positive + biomarkersData[biomarker].negative + biomarkersData[biomarker].unknown;

            // Calculate percentage, decimals without % sign
            if (totalCount > 0) {
                obj.positive = parseFloat(biomarkersData[biomarker].positive / totalCount).toFixed(2);
                obj.negative = parseFloat(biomarkersData[biomarker].negative / totalCount).toFixed(2);
                obj.unknown = parseFloat(1 - obj.positive - obj.negative).toFixed(2);
            }  

            info.data.push(obj);
        });

        return info;
    }

    /////////////////////////////////////////////////////////////////////////////////////////
    //
    //                            INDIVIDUAL PATIENT
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    static getPatientInfo(neo4jRawJson) {
        let patientInfo = {};

        let patientObj = neo4jRawJson.results[0].data[0].row[0];

        patientInfo.id = patientObj.patientId;
        patientInfo.name = patientObj.patientName;
        patientInfo.firstEncounterAge = this.getPatientEncounterAgeByDateString(patientObj.firstEncounterDate, patientObj.birthday);
        patientInfo.lastEncounterAge = this.getPatientEncounterAgeByDateString(patientObj.lastEncounterDate, patientObj.birthday);
        // The best way would be to use a single phrase label to show Menopause status:
        // Postmenopausal (if Postmenopausal = T)
        // Premenopausal (if Postmenopausal = F)
        // Menopause status unknown (if Postmenopausal = U)
        patientInfo.menopausal = patientObj.postmenopausal ? "Postmenopausal" : "Premenopausal";

        return patientInfo;
    }

    // A patient may have multiple cancers
    static getCancerSummary(neo4jRawJson) {
        let self = this;

        let cancers = [];

        let dataArr = neo4jRawJson.results[0].data;

        let uniqueCancerIds = [];

        for (let i = 0; i < dataArr.length; i++) {
            let cancerId = dataArr[i].row[0];
            if (uniqueCancerIds.indexOf(cancerId) === -1) {
                uniqueCancerIds.push(cancerId);
            }
        }

        // Assemble cancerSummary for each cancer
        uniqueCancerIds.forEach(function(cancerId) {
            let cancerSummary = {};

            cancerSummary.cancerId = cancerId;

            // TNM
            cancerSummary.tnm = [];

            // Other categories other than TNM
            cancerSummary.collatedFacts = [];
            
            // Build an arry of unique cancerFactReln
            let uniqueCancerFactRelnArr = [];

            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].row[0] === cancerId) {
                    let relationship = dataArr[i].row[1];
                    // Skip the body site, it's in the tumor summary
                    // Don't show Diagnosis, Tumor Extent, and TNM Prefix in cancer summary
                    let excludedRelationships = ["hasBodySite",
                        "hasDiagnosis",
                        "hasTumorExtent",
                        "hasTNMPrefix"
                    ];

                    if (uniqueCancerFactRelnArr.indexOf(relationship) === -1 && excludedRelationships.indexOf(relationship) === -1) {
                        // Histological type could be interesting - but not needed for breast cancer
                        if (cancerSummary.name === 'Breast') {
                            if (relationship !== "hasHistologicType") {
                                uniqueCancerFactRelnArr.push(relationship);
                            }
                        } else {
                            uniqueCancerFactRelnArr.push(relationship);
                        }
                    }
                }
            }

            // Sort this uniqueCancerFactRelnArr in a specific order
            // categories not in this order will be listed at the bottom
            // based on their original order
            const order = [
                'hasCancerStage', 
                'hasTreatment'
            ];
            
            // Sort the uniqueCancerFactRelnArr by the item's index in the order array
            let sortedUniqueCancerFactRelnArr = self.sortByProvidedOrder(uniqueCancerFactRelnArr, order);

            // Build new data structure
            // This is similar to what getCollatedFacts() does,
            // except it only handles one cancer ID.
            let allCollatedFacts = [];

            for (let j = 0; j < sortedUniqueCancerFactRelnArr.length; j++) {
                let collatedFactObj = {};

                // The name of category
                collatedFactObj.category = sortedUniqueCancerFactRelnArr[j];
                collatedFactObj.categoryName = self.formatCategoryName(sortedUniqueCancerFactRelnArr[j]);

                // Array of facts of this category
                collatedFactObj.facts = [];

                let factsArr = [];

                // Loop through the origional data
                for (let k = 0; k < dataArr.length; k++) {
                    if (dataArr[k].row[0] === cancerId) {
                        let cancerFactReln = dataArr[k].row[1];
                        
                        let factObj = {};
                        factObj.id = dataArr[k].row[2].id;
                        factObj.name = dataArr[k].row[2].name;
                        factObj.prettyName = dataArr[k].row[2].prettyName;
                        factObj.type = dataArr[k].row[2].type;

                        // Add to facts array
                        // Filter out Treatment facts that start with "Other" or "pharmacotherapeutic", they are not helpful to show
                        if (cancerFactReln === collatedFactObj.category && !factObj.prettyName.startsWith("Other") && !factObj.prettyName.startsWith("pharmacotherapeutic")) {
                            factsArr.push(factObj);
                        }
                    }
                }

                // Array of facts of this category
                // Remove duplicates using lodash's _.uniqWith() then sort by the alphabetical order of 'prettyName'
                collatedFactObj.facts = _.sortBy(_.uniqWith(factsArr, _.isEqual), ['prettyName']);

                // Add collatedFactObj to allCollatedFacts only when the facts array is not empty after all the above filtering
                // E.g., treatment facts can be an empty array if the treatements are OtherTherapeuticProcedure and OtherMedication
                // since they'll get filtered out
                if (collatedFactObj.facts.length > 0) {
                    allCollatedFacts.push(collatedFactObj);
                }
            }

            // Will use this to build TNM staging table
            const tnmClassifications = {
                "unspecified": [ // Use "unspecified" instead of "generic"
                    'hasGenericTClassification',
                    'hasGenericNClassification',
                    'hasGenericMClassification'
                ],
                "clinical": [
                    'hasClinicalTClassification',
                    'hasClinicalNClassification',
                    'hasClinicalMClassification'
                ],
                "pathologic": [
                    'hasPathologicTClassification',
                    'hasPathologicNClassification',
                    'hasPathologicMClassification'
                ]
            };

            // Hard code type names
            // Use "Unspecified" as the title of Generic TNM
            let unspecifiedTNM = self.buildTNM(allCollatedFacts, "Unspecified", tnmClassifications.unspecified);
            let clinicalTNM = self.buildTNM(allCollatedFacts, "Clinical", tnmClassifications.clinical);
            let pathologicTNM = self.buildTNM(allCollatedFacts, "Pathologic", tnmClassifications.pathologic);

            // Add to cancerSummary.tnm if has data
            if (unspecifiedTNM.data.T.length > 0 || unspecifiedTNM.data.N.length > 0 || unspecifiedTNM.data.M.length > 0) {
                cancerSummary.tnm.push(unspecifiedTNM);
            }

            if (clinicalTNM.data.length > 0  || clinicalTNM.data.N.length > 0 || clinicalTNM.data.M.length > 0) {
                cancerSummary.tnm.push(clinicalTNM);
            }

            if (pathologicTNM.data.length > 0  || pathologicTNM.data.N.length > 0 || pathologicTNM.data.M.length > 0) {
                cancerSummary.tnm.push(pathologicTNM);
            }

            // If clinical and pathological are found (ie, cT2 and pT2), don't need Unspecified
            // But if Unspecified is the only type, show it
            if (cancerSummary.tnm.length > 1) {
                cancerSummary.tnm = cancerSummary.tnm.filter(function(obj) {
                    return obj.type !== 'Unspecified'; // Captilized "Unspecified" instead of "unspecified"
                });
            }

            // Categories other than TNM
            cancerSummary.collatedFacts = allCollatedFacts.filter(function(obj) {
                return (tnmClassifications.unspecified.indexOf(obj.category) === -1 
                    && tnmClassifications.clinical.indexOf(obj.category) === -1 
                    && tnmClassifications.pathologic.indexOf(obj.category) === -1);
            });

            // Now add to the cancers object
            cancers.push(cancerSummary);
        });

        return cancers;
    }

    // For vertical tumor summary table
    static getTumorSummary(neo4jRawJson) {
        let self = this;

        let summary = {};

        // For list view
        summary.tumors = [];
        // For table view
        summary.collatedFactsByCategory = [];

        let dataArr = neo4jRawJson.results[0].data;

        // Build an arry of unique tumors (id and name)
        let summaryTumors = [];
        for (let i = 0; i < dataArr.length; i++) {
            if (summaryTumors.indexOf(dataArr[i].row[0]) ===-1 && dataArr[i].row[1]=== 'hasTumorType') {
                let tumorObj = {};
                tumorObj.id = dataArr[i].row[0];
                tumorObj.type = dataArr[i].row[2].prettyName;

                summaryTumors.push(tumorObj);
            }
        }

        // Show Primary Neoplasm on the first column...
        const tumorTypesArr = [
            'Primary Neoplasm',
            'Regional Metastasis',
            'Distant Metastasis'
        ];

        summary.tumors = this.sortByTumorType(summaryTumors, tumorTypesArr);

        let allTumorFactRelnArr = [];

        // Get a list of tumor fact relationships for each tumor
        for (let j = 0; j < summary.tumors.length; j++) {
            // Collect categories of each tumor
            let tumorFactRelnArr = this.getTumorFactRelnArr(dataArr, summary.tumors[j].id);
            allTumorFactRelnArr.push(tumorFactRelnArr);
        }

        let mergedArr = [];
        for (let m = 0; m < allTumorFactRelnArr.length; m++) {
            // https://lodash.com/docs/4.17.4#union
            // Creates an array of unique values, in order, from all given arrays
            mergedArr = _.unionWith(mergedArr, allTumorFactRelnArr[m], _.isEqual);
        }

        // Sort this allTumorFactRelnArr in a specific order
        // categories not in this order will be listed at the bottom
        // based on their original order
        const order = [
            'hasBodySite',
            'hasDiagnosis',
            'hasTreatment',
            // Group biomarkers - Breast cancer only
            'hasReceptorStatus',
            'hasKi67Status',
            // Group tumor sizes
            'hasTumorSize',
            'hasRadiologicTumorSize',
            'hasPathologicTumorSize',
            'hasPathologicAggregateTumorSize',
            'hasNuclearGrade'
        ];

        // Sort the commonFactRelationships by the item's index in the order array
        let sortedFactRelationships = this.sortByProvidedOrder(mergedArr, order);

        // For each common category, get collacted facts for each tumor
        for (let k = 0; k < sortedFactRelationships.length; k++) {
            let obj = {};
            // Convert the 'hasXXX' relationship to category
            
            obj.category = this.formatCategoryName(sortedFactRelationships[k]);
            obj.categoryClass = this.getCategoryClass(sortedFactRelationships[k]);
            obj.data = [];

            // Add collacted facts array for each tumor
            for (let n = 0; n < summary.tumors.length; n++) {
                // Pass in the raw relationship name as categoryClass to be used in CSS, for list view
                let factsObj = this.getTumorFactsByRelationship(summary.tumors[n].id, obj.category, sortedFactRelationships[k], dataArr);
                obj.data.push(factsObj);
            }

            summary.collatedFactsByCategory.push(obj);
        }

        // Data structure for list view
        // Add data property to each tumor object in summary.tumors
        for (let m = 0; m < summary.tumors.length; m++) {
            let obj = summary.tumors[m];
            obj.data = [];

            for (let p = 0; p < summary.collatedFactsByCategory.length; p++) {
                let dataObj = {};
            	dataObj.category = summary.collatedFactsByCategory[p].category;
            	dataObj.factsObj = summary.collatedFactsByCategory[p].data[m];
            	obj.data.push(dataObj);
            }
        }

        return summary;
    }

    // Convert the index array to named array
    static getTimelineData(neo4jRawJson) {
        neo4jRawJson = JSON.parse(neo4jRawJson);

        // First sort by date
        let sortedReportsArr = this.sortReportsByDate(neo4jRawJson.results[0].data); 

        // Following is to convert the index array to named array object
        let preparedReports = {};

        // Properties
        preparedReports.patientInfo = sortedReportsArr[0][5];
        preparedReports.reportData = [];
        preparedReports.typeCounts = {};
        preparedReports.episodes = [];
        preparedReports.episodeCounts = {};

        let reportTypes = [];

        let episodes = [];
        let episodeDates = {};

        // Using lodash's `_.forEach()`
        _.forEach(sortedReportsArr, function(item) { 
            let report = {};

            report.id = item[0];
            report.origTime = item[1];
            report.date = item[1].split(" ")[0]; // Only get the date, without time part
            report.name = item[2];
            report.type = item[3]; // Is already formatted/normalized
            report.episode = item[4];

            // Add to reportData array
            preparedReports.reportData.push(report);

            // Create an array of report types without duplicates
            if (reportTypes.indexOf(report.type) === -1) {
                reportTypes.push(report.type);
            }
  
            // Add the type as key to typeCounts object
            // JavaScript objects cannot have duplicate keys
            if (report.type in preparedReports.typeCounts) {
                preparedReports.typeCounts[report.type]++;
            } else {
                preparedReports.typeCounts[report.type] = 1;
            }

            // Create an array of episode types without duplicates
            if (episodes.indexOf(report.episode) === -1) {
                episodes.push(report.episode);
            }

            // Also count the number of reports for each episode type
            if (report.episode in preparedReports.episodeCounts) {
                preparedReports.episodeCounts[report.episode]++;
            } else {
                preparedReports.episodeCounts[report.episode] = 1;
            }

            // Add dates to each episode dates named array
            if (typeof (episodeDates[report.episode]) === 'undefined') {
                // Use the episode name as key
                episodeDates[report.episode] = [];
            }
            
            episodeDates[report.episode].push(report.origTime);
        });

        // Sort the report types based on this specific order
        const orderOfReportTypes = [
            'Progress Note',
            'Radiology Report',
            'Surgical Pathology Report',
            'Discharge Summary'
        ];

        preparedReports.reportTypes = this.sortByProvidedOrder(reportTypes, orderOfReportTypes);

        // Sort the episodes based on this specific order
        const orderOfEpisodes = [
            'PreDiagnostics',
            'Diagnostic',
            'Decision',
            'Treatment',
            'Follow-up'
        ];

        preparedReports.episodes = this.sortByProvidedOrder(episodes, orderOfEpisodes);

        preparedReports.episodeDates = episodeDates;

        // Group the report objects by report date, not time
        // This returns a named array, key is the date, value is an arry of reports with the same date
        let reportsGroupedByDateObj = _.groupBy(preparedReports.reportData, function(report) {
            return report.date;
        });

        // Then further group by report type on top of the grouped date
        let reportsGroupedByDateAndTypeObj = {};
        
        for (let property in reportsGroupedByDateObj) {
            if (reportsGroupedByDateObj.hasOwnProperty(property)) {
                let arr = reportsGroupedByDateObj[property];
                let reportsGroupedByTypeObj = _.groupBy(arr, function(report) {
                    return report.type;
                });

                if (typeof reportsGroupedByDateAndTypeObj[property] === 'undefined') {
                    reportsGroupedByDateAndTypeObj[property] = {};
                }

                reportsGroupedByDateAndTypeObj[property] = reportsGroupedByTypeObj;
            }
        }

        preparedReports.reportsGroupedByDateAndTypeObj = reportsGroupedByDateAndTypeObj;

        // Calculate the max number of vertically overlapped reports
        // this will be used to determine the height of each report type row in timeline
        // verticalCountsPerType keys is not ordered by the `orderOfReportTypes`
        let verticalCountsPerType = {};

        for (let property in reportsGroupedByDateAndTypeObj) {
            if (reportsGroupedByDateAndTypeObj.hasOwnProperty(property)) {
                for (let type in reportsGroupedByDateAndTypeObj[property]) {
                    let arr = reportsGroupedByDateAndTypeObj[property][type];

                    if (typeof verticalCountsPerType[type] === 'undefined') {
                        verticalCountsPerType[type] = [];
                    }

                    verticalCountsPerType[type].push(arr.length);
                }
            }
        }

        // Find the max vertical count of reports on the same date for each report type
        // maxVerticalCountsPerType keys is not ordered by the `orderOfReportTypes`
        let maxVerticalCountsPerType = {};

        for (let property in verticalCountsPerType) {
            if (verticalCountsPerType.hasOwnProperty(property)) {
                if (typeof maxVerticalCountsPerType[property] === 'undefined') {
                    maxVerticalCountsPerType[property] = _.max(verticalCountsPerType[property]);
                }
            }
        }

        preparedReports.maxVerticalCountsPerType = maxVerticalCountsPerType;

        // Return everything
        return preparedReports;
    }

    static getReport(neo4jRawJson) {
        let dataArr = neo4jRawJson.results[0].data;
  
        let report = {};

        // Report text is repeated in each row, unfortunately
        report.text = dataArr[0].row[0];
        report.mentionedTerms = [];

        // All mentioned texts with count
        for (let i = 0; i < dataArr.length; i++) {
            // If dataArr[i].row[1] is not null, dataArr[i].row[2] must be not null as well
            if (dataArr[i].row[1] !== null) {
                let term = {};

                term.text = dataArr[i].row[1];
                term.startOffset = dataArr[i].row[2];
                term.endOffset = dataArr[i].row[3];
                // Add to the array
                report.mentionedTerms.push(term);
            }
        }

        return report;
    }

    // One fact can have multiple matching texts
    // or the same matching text can be found in multiple places in the same report
    static getFact(neo4jRawJson, patientId) {
        let self = this;

        let factJson = {};

        let dataArr = neo4jRawJson.results[0].data;

        // factJson object has properties: 
        // "detail", "textProvenances", "procedures", "groupedTextMentions"
        factJson.detail = dataArr[0].row[0];

        // This array may have duplicates
        let textProvenancesArr = [];
        let proceduresArr = [];
        let lateralitiesArr = [];
        let bodyModifiersArr = [];

        for (let i = 0; i < dataArr.length; i++) {
            if (dataArr[i].row[1] !== null) {
                // We can also specify the relationship in Cypher query
                if (dataArr[i].row[1].name === 'hasTextProvenance') {
                    textProvenancesArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'Procedure') {
                    proceduresArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'Laterality') {
                    lateralitiesArr.push(dataArr[i].row[2]);
                }

                if (dataArr[i].row[1].name === 'BodyModifier') {
                    bodyModifiersArr.push(dataArr[i].row[2]);
                }
            }
        }

        // Remove duplicates using lodash's _.uniqWith()
        let uniqueTextProvenances = _.uniqWith(textProvenancesArr, _.isEqual);
        factJson.procedures = _.uniqWith(proceduresArr, _.isEqual);
        factJson.lateralities = _.uniqWith(lateralitiesArr, _.isEqual);
        factJson.bodyModifiers = _.uniqWith(bodyModifiersArr, _.isEqual);

        // There are cases that a Fact has text mentions from different reports of different patients
        // So we need to filter out the non-matching patient reports nodes
        let filteredUniqueTextProvenances = uniqueTextProvenances.filter(function(obj) {
            return obj.patientId === patientId;
        });

        // To-Do with v2
        // Use report number "report008" to sort the documents.
        // The report number should be based on the report date?
        // filteredUniqueTextProvenances.sort(function(a, b) {
        //     return a.documentId.split('_')[2].slice(6) - b.documentId.split('_')[2].slice(6);
        // });

        // Group text mentions by report ID
        // Considering the fact that Fact-Report(1-n)
        let docIds = [];
        for (let j = 0; j < filteredUniqueTextProvenances.length; j++) {
            let docId = filteredUniqueTextProvenances[j].documentId;

            if (docIds.indexOf(docId) === -1) {
                docIds.push(docId);
            }
        }

        let groupedTextProvenances = [];

        docIds.forEach(function(id) {
            let textProvenanceObj = {};
            textProvenanceObj.docId = id;
            textProvenanceObj.shortDocId = self.getShortDocId(id);
            textProvenanceObj.texts = [];
            textProvenanceObj.groupedTexts = [];
            for (let k = 0; k < filteredUniqueTextProvenances.length; k++) {
                if (filteredUniqueTextProvenances[k].documentId === id) {
                    textProvenanceObj.texts.push(filteredUniqueTextProvenances[k].text);
                }
            }
            groupedTextProvenances.push(textProvenanceObj);
        });

        // Additional process to aggregate tesxt mentions with count for each test mention group
        for (let m = 0; m < groupedTextProvenances.length; m++) {
            let textCounts = [];
            let textsArr = groupedTextProvenances[m].texts;

            for (let n = 0; n < textsArr.length; n++) {
                let countObj = {};
                countObj.text = textsArr[n];
                countObj.count = _.countBy(textsArr)[textsArr[n]];

                textCounts.push(countObj);
            }

            // Remove duplicates
            // Note: groupedTextMentions is used to render fact.html
            // textProvenances is used to highlight the report text
            // they serve different purposes
            groupedTextProvenances[m].groupedTexts = _.uniqWith(textCounts, _.isEqual);
        }

        factJson.groupedTextProvenances = groupedTextProvenances;

        // Also return and docIds array
        factJson.docIds = docIds;

        return factJson;
    }

    /////////////////////////////////////////////////////////////////////////////////////////
    //
    //                            INTERNAL HELERS USED BY CHORT AND INDIVIDUAL PATIENT
    //
    ////////////////////////////////////////////////////////////////////////////////////////
    
    // ES6 Class doesn't support class variables, we use a static function instead
    // for shared variables
    static getOrderedCancerStages() {
        // Sort this uniqueStages array in a specific order
        return [
            'Stage Unknown',
            'Stage 0', 
            // Stage I
            'Stage I',
            'Stage IA',
            'Stage IB',
            'Stage IC',
            // Stage II
            'Stage II',
            'Stage IIA',
            'Stage IIB',
            'Stage IIC',
            // Stage III
            'Stage III',
            'Stage IIIA',
            'Stage IIIB',
            'Stage IIIC',
            // Stage IV
            'Stage IV',
            'Stage IVA',
            'Stage IVB',
            'Stage IVC'
        ];
    }

    static buildTNM(collatedFacts, type, tnmClassifications) {
        let tnmObj = {};

        // Two properties
        tnmObj.type = type;
        tnmObj.data = {};
        // Make sure to use T, N, M as keys so we don't 
        // have to worry about the ordering of corresponding facts data
        tnmObj.data.T = [];
        tnmObj.data.N = [];
        tnmObj.data.M = [];

        // Build the TNM object of this type
        // collatedFacts contains all the cancer categories, we only need the TNM relationships of this type
        for (let i = 0; i < collatedFacts.length; i++) {
            if (tnmClassifications.indexOf(collatedFacts[i].category) !== -1) {
                let itemObj = {};
                // Extracted single letter of the classification, "T", or "N", or "M"
                let classification = collatedFacts[i].category.substr(-15, 1);
                // Don't use dot expression ".classification" here, use "[classification]"
                tnmObj.data[classification] = collatedFacts[i].facts;
            }
        }

        return tnmObj;
    }

    // Only get the first two words, e.g., "Stage IA"
    static getShortStageName(longStageName) {
        return longStageName.split(/\s+/).slice(0, 2).join(' ');
    }

    // encounterDateStr is a string, not Date object
    static getPatientEncounterAgeByDateString(encounterDateStr, birthday) {
        // birthday is a string
        let ageDiffMs =  new Date(encounterDateStr).getTime() - new Date(birthday).getTime();
        let ageDate = new Date(ageDiffMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    static getAllPatients(neo4jRawJson) {
        let patientsJson = {};

        let dataArr = neo4jRawJson.results[0].data;

        let uniquePatientsArr = [];

        // Remove duplicates
        for (let i = 0; i < dataArr.length; i++) {
            let patient = {};
            // Make sure to use "patientId/patientName" instead of "id/name" for consistency
            patient.patientId = dataArr[i].row[0].patientId;
            patient.patientName = dataArr[i].row[0].patientName;
            patient.firstEncounterDate = dataArr[i].row[0].firstEncounterDate;
            patient.lastEncounterDate = dataArr[i].row[0].lastEncounterDate;
            patient.birthday = dataArr[i].row[0].birthday;
            
            // For debugging 
            patient.cancerStages = [];

            // Lodash's _.indexOf() doesn't work in this case, use _.findIndex()
            if (_.findIndex(uniquePatientsArr, patient) ===-1) {
                uniquePatientsArr.push(patient);
            } 
        }
        
        // Assemble the extracted cancer stages for each patient
        for (let j = 0; j < dataArr.length; j++) {
            let patientId = dataArr[j].row[0].patientId;
            let patientCancerStageShortName = this.getShortStageName(dataArr[j].row[1]);

            for (let k = 0; k < uniquePatientsArr.length; k++) {
                // Only add stages that are listed in getOrderedCancerStages()
                if (patientId === uniquePatientsArr[k].id && this.getOrderedCancerStages().indexOf(patientCancerStageShortName) !== -1) {
                    uniquePatientsArr[k].cancerStages.push(patientCancerStageShortName);
                }
            }
        }

        // Sort uniquePatientsArr by patient age of first encounter
        uniquePatientsArr = _.sortBy(uniquePatientsArr, 'firstEncounterAge');

        patientsJson.patients = uniquePatientsArr;

        // Return the JSON object
        return patientsJson;
    }

    // https://stackoverflow.com/questions/18859186/sorting-an-array-of-javascript-objects-a-specific-order-using-existing-function
    static sortByProvidedOrder(array, orderArr) {
        let orderMap = new Map();

        orderArr.forEach(function(item) { 
            // Remember the index of each item in order array
            orderMap.set(item, orderArr.indexOf(item));
        });

        // Sort the original array by the item's index in the orderArr
        // It's very possible that items are in array may not be in orderArr
        // so we assign index starting from orderArr.length for those items
        let i = orderArr.length;
        let sortedArray = array.sort(function(a, b){ 
            if (!orderMap.has(a)) {
                orderMap.set(a, i++);
            }
 
            if (!orderMap.has(b)) {
                orderMap.set(b, i++);
            }

            return (orderMap.get(a) - orderMap.get(b));
        });

        return sortedArray;
    }

    // In tumor summary table, show Primary Neoplasm in the first data column...
    static sortByTumorType(array, orderArr) {
        let orderMap = new Map();

        orderArr.forEach(function(item) { 
            // Remember the index of each item in order array
            orderMap.set(item, orderArr.indexOf(item));
        });

        // Sort the original array by the item's index in the orderArr
        // It's very possible that items are in array may not be in orderArr
        // so we assign index starting from orderArr.length for those items
        let i = orderArr.length;
        let sortedArray = array.sort(function(a, b){ 
            // Use item.type since we are ordering by tumor type
            // this is the only difference from sortByProvidedOrder()
            if (!orderMap.has(a.type)) {
                orderMap.set(a.type, i++);
            }
 
            if (!orderMap.has(b.type)) {
                orderMap.set(b.type, i++);
            }

            return (orderMap.get(a.type) - orderMap.get(b.type));
        });

        return sortedArray;
    }

    // "REPORT_patient10_report051_NOTE_2076902750" -> "Report051_NOTE"
    // This utility funtion can also be found in deepphe.js
    // But we can't reuse it due to the fact of different componments
    // Functions in deepphe.js are used by client side
    // and functions in dataProcessor.js are used by server side
    static getShortDocId(id) {
        let partsArr = id.split('_');
        let str = partsArr[2] + '_' + partsArr[3];
        // Also capitalize the first letter
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // E.g., convert "hasBodySite" into "Body Site"
    // Exception: "hasBIRADSCategory"
    static formatCategoryName(text) {
        if (text === 'hasKi67Status') {
            return 'Ki-67';
        } else if (text === 'hasBIRADSCategory') {
            return 'BIRADS'; // Also omit "Category"
        } else {
            // Remove 'has' from the beginning then add a space to the uppercased word
            let result = text.substring(3).replace(/([A-Z])/g, " $1" );
            let str = result.charAt(0).toUpperCase() + result.slice(1);
            // Trim out the beginning space
            return str.trim();
        }
    }

    static normalizeDiagnosis(diagnosis) {
        // Replace underscores with space in name
        diagnosis = diagnosis.replace(/_/g, " ");

        // This mapping stores all the duplicated names and their corresponding desired/normalized names
        const mapping = {
            // Group 1
            "Breast Carcinoma": "Ductal Carcinoma In Situ (DCIS)",
            "Carcinoma In Situ": "Ductal Carcinoma In Situ (DCIS)",
            "Ductal Breast Carcinoma In Situ": "Ductal Carcinoma In Situ (DCIS)",
            // Group 2
            "Lobular Breast Carcinoma": "Lobular Carcinoma In Situ (LCIS)",
            "Lobular Breast Carcinoma In Situ": "Lobular Carcinoma In Situ (LCIS)",
            // Group 3
            "Invasive Lobular Breast Carcinoma": "Invasive Lobular Carcinoma",
            // Group 4
            "Invasive Ductal Breast Carcinoma": "Invasive Ductal Carcinoma"
        };

        let keys = Object.keys(mapping);

        return (keys.indexOf(diagnosis) !== -1) ? mapping[diagnosis] : diagnosis;
    }

    // For tumor fact box background rendering in CSS
    static getCategoryClass(categoryClass) {
        // Manual filtering for now
        const categoryClassesArr = [
            'hasBodySite',
            'hasDiagnosis',
            'hasTreatment',
            'hasReceptorStatus',
            'hasKi67Status',
            'hasTumorSize',
            'hasRadiologicTumorSize',
            'hasPathologicTumorSize',
            'hasPathologicAggregateTumorSize',
            'hasNuclearGrade',
            'hasCancerCellLine',
            'hasHistologicType',
            'hasTumorExtent'
        ];

        if (categoryClassesArr.indexOf(categoryClass) === -1) {
            categoryClass = 'unspecified';
        } 

        return categoryClass;
    }

    static getTumorFactsByRelationship(tumorId, category, categoryClass, dataArr) {
        let factsObj = {};

        factsObj.tumorId = tumorId;
        factsObj.category = category; // Already in non camal case
        factsObj.categoryClass = this.getCategoryClass(categoryClass);
        factsObj.facts = [];
        
        let factsArr = [];
        // Loop through the origional data
        for (let i = 0; i < dataArr.length; i++) {
            let targetTumorId = dataArr[i].row[0];
            let targetTumorFactRel = this.formatCategoryName(dataArr[i].row[1]);
            let fact = dataArr[i].row[2];
            
            let combinedFact = {};
            combinedFact.id = fact.id;
            combinedFact.name = fact.name;
            combinedFact.prettyName = fact.prettyName;
            combinedFact.type = fact.type;

            if (dataArr[i].row[3] !== null && dataArr[i].row[4] !== null) {
                // ordinalinterpretation or laterality, lowercased
                // Can't add BodyModifier since it may have multiple values
                let rel2AnotherFact = dataArr[i].row[3].name.toLowerCase(); 
                // ordinalinterpretation: Positive or Negative
                // laterality: Left or Right
                // Use name instead of prettyName due to "Gender Unknown" exception for ordinalinterpretation
                let anotherFact = dataArr[i].row[4].name; 
                // Use rel2AnotherFact as key, anotherFact as value
                combinedFact[rel2AnotherFact] = anotherFact;
            }

            if (tumorId === targetTumorId && category === targetTumorFactRel) {
                // Add fact to the factsArr
                factsArr.push(combinedFact);
            }
        }

        // Array of facts of this category
        // Remove duplicates using lodash's _.uniqWith(), then sort by the alphabetical order of 'prettyName'
        factsObj.facts = _.sortBy(_.uniqWith(factsArr, _.isEqual), ['prettyName']);

        return factsObj;
    }

    // Get an arry of tumor fact relationships without duplicates
    static getTumorFactRelnArr(dataArr, tumorId) {
        // Build an arry of unique tumorFactReln
        let uniqueTumorFactRelnArr = [];

        for (let i = 0; i < dataArr.length; i++) {
            if (dataArr[i].row[0] === tumorId && uniqueTumorFactRelnArr.indexOf(dataArr[i].row[1]) === -1) {
                // HACK - filter out `hasTumorType`, `hasTreatment`
                if (dataArr[i].row[1] !== 'hasTumorType' && dataArr[i].row[1] !== 'hasTreatment') {
                    uniqueTumorFactRelnArr.push(dataArr[i].row[1]);
                }
            }
        }

        return uniqueTumorFactRelnArr;
    }

    // Sort from newest date to oldest date
    // Format the report type
    static sortReportsByDate(dataArr) {
        // Date format returned by neo4j is "07/19/2006 09:33 AM EDT"
        dataArr.sort(function(a, b) {
            // Turn strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return (new Date(b.row[1]) - new Date(a.row[1]));
        });

        // Now we just put the data we need together
        let arr = [];
        for (let i = 0; i < dataArr.length; i++) {
            let row = dataArr[i].row

            let typeArr = row[3].toLowerCase().split('_');
            typeArr.forEach(function(v, i, a) {
                // Capitalize the first letter of each word
                a[i] = v.charAt(0).toUpperCase() + v.substr(1);
            });

            // Joins all elements of the typeArr into a string
            row[3] = typeArr.join(' ');

            arr.push(row);
        }

        return arr;
    }

}

/**
 * Expose the DataProcessor class as a local module
 */
module.exports = DataProcessor;

