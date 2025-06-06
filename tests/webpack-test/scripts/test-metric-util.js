const { decodeFilteredTest, FilteredStatus } = require("../lib/util/filterUtil");

function extractTestMetric(jsonObj) {
	const testResults = jsonObj["testResults"];
	const {
		total,
		fullPass,
		partialPass,
		noPlan
	} = getStatusCount(testResults, "ALL");

	const passedTests = jsonObj.numPassedTests;
	const avgTestPerCase = passedTests / (fullPass + partialPass * 0.5);
	const totalTests = Math.round(passedTests + (partialPass * 0.5 * avgTestPerCase) + (total - fullPass - partialPass - noPlan) * avgTestPerCase);

	// in theory, if we could get correct stats of failedTests and failedTestSuites
	// the stats generated by jest should be valid, so we don't need to check any more

	return {
		"Total testSuites": jsonObj.numTotalTestSuites,
		"Total cases": total,
		"Total tests": totalTests,
		"Total passedTestSuites": jsonObj.numPassedTestSuites,
		"Total passedCases": fullPass + partialPass * 0.5,
		"Total passedTests": passedTests,
		"Total willNotSupportCase": noPlan,
		"Tests Compatibility": `${((passedTests / totalTests) * 100).toFixed(3)}%`,
	};
}

function getStatusCount(testResults, status) {
	const count = {
		suite: 0,
		total: 0,
		fullPass: 0,
		partialPass: 0,
		noPlan: 0,
	};
	testResults.forEach(suite => {
		getSuiteTestCount(suite, count);
	});
	return count;
}

function getSuiteTestCount(suite, count) {
	suite.assertionResults.forEach(item => {
		const filtered = decodeFilteredTest(item.fullName);
		if (!filtered) return;
		count.total++;
		switch (filtered.status) {
			case FilteredStatus.NO_PLAN: count.noPlan++; break;
			case FilteredStatus.PARTIAL_PASS: count.partialPass++; break;
			case FilteredStatus.PASS: count.fullPass++; break;
		}
	});
}

function renderTestToMarkdown(testFullName) {
	const decoded = decodeFilteredTest(testFullName)
	let icon = "🟢";
	let fullName = testFullName
	let extra = "";
	if (decoded !== null) {
		icon = decoded.status === FilteredStatus.TODO ? "⚪️"
			: decoded.status === FilteredStatus.NO_PLAN ? "⚫️"
				: decoded.status === FilteredStatus.UNCHECKED ? "🔴"
					: decoded.status === FilteredStatus.FIXME ? "🔴"
						: decoded.status === FilteredStatus.PARTIAL_PASS ? "🟡"
							: decoded.status === FilteredStatus.PASS ? "🟢"
								: "ERROR"
		fullName = decoded.fullName;
		extra = `: ${decoded.reason}`
	}
	return `${icon} ${fullName}${extra}`
}

function renderAllTestsToMarkdown(jsonObj) {
	const testResults = jsonObj["testResults"];
	return testResults
		.flatMap(testSuite => testSuite.assertionResults)
		// use `1 ` to break GitHub markdown list rendering
		.map((test, index) => `${index + 1} ${renderTestToMarkdown(test.fullName)}`)
		.join('\n')
}

module.exports = {
	extractTestMetric,
	renderAllTestsToMarkdown,
};
