pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        PLAYWRIGHT_BROWSERS_PATH = '0'
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
        PLAYWRIGHT_SKIP_DEPS_INSTALLATION = '1'
        GIT_SSL_NO_VERIFY = 'true'
        GIT_USERNAME = 'dartera'
        GITHUB_TOKEN = credentials('github-token')
        PATH = "/usr/local/bin:${env.PATH}"
        PLAYWRIGHT_TEST_REPORT_DIR = "playwright-report"
        PLAYWRIGHT_TEST_RESULTS_DIR = "test-results"
        ALLURE_RESULTS_DIR = "allure-results"
        CLICKUP_API_TOKEN = credentials('clickup-api-token')
        CLICKUP_PARENT_TASK_ID = '8698ty0vg'
        CLICKUP_USER_ID = '87801653'
        DEBIAN_FRONTEND = "noninteractive"
        // Memory management environment variables
        PLAYWRIGHT_TIMEOUT = '30000'
        PLAYWRIGHT_WORKERS = '2'
        MAX_SELECTORS = '50'
        FORCE_EXIT_CODE = 'true'
        ALLURE_RESPECT_EXIT_CODE = 'true'
        // Remove debug flags
        NODE_OPTIONS = '--max-old-space-size=2048 --expose-gc'
    }

    options {
        // Completely remove timeout - let the OS manage it
        skipDefaultCheckout()
    }

    tools {
        allure 'Allure'
    }

    stages {
        stage('Verify Sudo') {
            steps {
                sh '''
                    # Check if sudo works without password
                    sudo -n true
                    echo "Sudo privileges confirmed without password"
                '''
            }
        }
        
        stage('Setup Git LFS') {
            steps {
                sh '''
                    # Install Git LFS using apt
                    export DEBIAN_FRONTEND=noninteractive
                    sudo -E apt-get update -y
                    sudo -E apt-get install -y git-lfs
                    
                    # Verify Git LFS installation
                    which git-lfs
                    git-lfs version
                    
                    # Initialize Git LFS
                    git-lfs install
                    
                    # Configure Git LFS
                    git config --global filter.lfs.clean "git-lfs clean -- %f"
                    git config --global filter.lfs.smudge "git-lfs smudge -- %f"
                    git config --global filter.lfs.process "git-lfs filter-process"
                    git config --global filter.lfs.required true
                    
                    # Configure Git credentials
                    git config --global user.name "${GIT_USERNAME}"
                    git config --global credential.helper store
                    echo "https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
                '''
            }
        }

        stage('Checkout') {
            steps {
                    sh '''
                        # Clean workspace before cloning
                        rm -rf .* * 2>/dev/null || true
                        
                        # Clone the repository using HTTPS with token
                        git clone "https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com/dartera/DolomedAutomation.git" .
                        
                        # Initialize Git LFS in the repository
                        git lfs install
                        
                        # Pull LFS files
                        git lfs pull
                    '''
            }
        }

        stage('Setup Node.js') {
            steps {
                sh '''
                    # Install Node.js using NodeSource repository
                    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                    sudo -E apt-get install -y nodejs
                    
                    # Verify Node.js installation
                    node --version
                    npm --version
                    
                    # Install yarn using npm
                    sudo npm install -g yarn
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    # Install dependencies
                    npm install
                    
                    # Install Playwright browsers
                    npx playwright install --with-deps
                '''
            }
        }

        stage('Monitor Memory') {
            steps {
                sh '''
                    # Create a script to monitor memory usage
                    cat > monitor_memory.sh << 'EOL'
#!/bin/bash
while true; do
  free -m > memory_stats.txt
  ps -o pid,ppid,%cpu,%mem,cmd --sort=-%mem | head -n 10 >> memory_stats.txt
  echo "--------------------" >> memory_stats.txt
  sleep 5
done
EOL
                    chmod +x monitor_memory.sh
                    
                    # Start memory monitoring in the background
                    ./monitor_memory.sh &
                    MONITOR_PID=$!
                    echo $MONITOR_PID > monitor_pid.txt
                '''
            }
        }

        stage('Run Tests') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                        # Add swap space to prevent OOM crashes
                        sudo swapoff -a || true
                        sudo fallocate -l 4G /swapfile || true
                        sudo chmod 600 /swapfile || true
                        sudo mkswap /swapfile || true
                        sudo swapon /swapfile || true
                        
                        # Create directories first to avoid potential issues
                        mkdir -p ${PLAYWRIGHT_TEST_REPORT_DIR} ${PLAYWRIGHT_TEST_RESULTS_DIR} ${ALLURE_RESULTS_DIR}
                        
                        # Run tests directly without debug mode
                        PLAYWRIGHT_WORKERS=2 npm run test:allure
                        TEST_EXIT_CODE=$?
                        
                        # Kill memory monitor
                        MONITOR_PID=$(cat monitor_pid.txt 2>/dev/null) || true
                        kill $MONITOR_PID 2>/dev/null || true
                        
                        # Ensure all Allure results are accessible
                        chmod -R 755 ${ALLURE_RESULTS_DIR} || echo "Could not set permissions on Allure results"
                        
                        # Extract test result information
                        echo "Extracting test result details..."
                        if [ -d "${ALLURE_RESULTS_DIR}" ]; then
                          # Find and examine result files
                          grep -r '"status":"failed"' ${ALLURE_RESULTS_DIR}/*-result.json || echo "No explicit failures found in JSON"
                          
                          # Count failures
                          FAILURE_COUNT=$(grep -r '"status":"failed"' ${ALLURE_RESULTS_DIR}/*-result.json | wc -l || echo "0")
                          echo "Found $FAILURE_COUNT explicit test failures in Allure results"
                          
                          # Force Allure to recognize the failures
                          if [ $FAILURE_COUNT -gt 0 ] || [ $TEST_EXIT_CODE -ne 0 ]; then
                            echo "Ensuring build failures are reflected in Allure report"
                            touch ${ALLURE_RESULTS_DIR}/force_build_failure
                          fi
                        fi
                        
                        echo "Test execution completed with exit code $TEST_EXIT_CODE. Check reports for details."
                        
                        # Always pass through non-zero exit codes
                        if [ $TEST_EXIT_CODE -ne 0 ]; then
                            echo "Failing the build due to test failures"
                            exit $TEST_EXIT_CODE
                        fi
                    '''
                }
            }
            post {
                always {
                    script {
                        // Parse test results to check for failures
                        def testResultsExist = fileExists('test-results/test-results.json')
                        def hasFailures = false
                        
                        if (testResultsExist) {
                            try {
                                def testResults = readJSON file: 'test-results/test-results.json'
                                if (testResults.stats && testResults.stats.failures > 0) {
                                    hasFailures = true
                                    echo "Found ${testResults.stats.failures} test failures in the test results"
                                }
                            } catch (Exception e) {
                                echo "Error parsing test results: ${e.message}"
                                hasFailures = true // Assume failures on error
                            }
                        }
                        
                        try {
                            // Check for specific failure in FooterTest.spec.ts
                            def footerTestFailed = false
                            try {
                                def footerFailure = sh(script: "grep -r 'Footer Functionality.*should verify all footer sections are present.*failed' test-results", returnStatus: true)
                                if (footerFailure == 0) {
                                    footerTestFailed = true
                                    echo "Found specific failure in FooterTest - marking build as failed"
                                    hasFailures = true
                                }
                            } catch (Exception e) {
                                echo "Error checking for footer test failure: ${e.message}"
                            }
                            
                            // Make sure the allure results directory exists and has content
                            sh "mkdir -p ${ALLURE_RESULTS_DIR}"
                            sh "find ${ALLURE_RESULTS_DIR} -type f | wc -l"
                            
                            // Create a status marker file to force Allure to reflect the correct status
                            if (hasFailures) {
                                sh """
                                    echo '{"name":"Failed Tests","status":"failed"}' > ${ALLURE_RESULTS_DIR}/status.json
                                """
                            }
                            
                            allure([
                                includeProperties: false, 
                                jdk: '', 
                                results: [[path: 'allure-results']]
                            ])
                        } catch (Exception e) {
                            echo "Error generating Allure report: ${e.message}"
                            // Try to create a minimal report anyway
                            sh "mkdir -p allure-report"
                        }
                        
                        // If tests failed, set the build result explicitly
                        if (hasFailures) {
                            currentBuild.result = 'FAILURE'
                            echo "Setting build result to FAILURE due to test failures"
                        }
                        
                        // Create ZIP with all reports - with error handling
                        sh """
                            set +e
                            mkdir -p ${PLAYWRIGHT_TEST_REPORT_DIR} ${PLAYWRIGHT_TEST_RESULTS_DIR} ${ALLURE_RESULTS_DIR}
                            zip -r test-reports.zip \\
                                ${PLAYWRIGHT_TEST_REPORT_DIR}/ \\
                                ${PLAYWRIGHT_TEST_RESULTS_DIR}/ \\
                                ${ALLURE_RESULTS_DIR}/ || echo "Warning: Could not create zip file"
                            set -e
                        """
                    }
                }
            }
        }

        stage('Generate Reports') {
            steps {
                sh '''
                    # Make sure allure-results directory exists
                    mkdir -p ${ALLURE_RESULTS_DIR}
                    
                    # Generate Allure report using the full path to the Allure executable
                    ALLURE_PATH=$(which allure || echo "/var/lib/jenkins/tools/ru.yandex.qatools.allure.jenkins.tools.AllureCommandlineInstallation/Allure/bin/allure")
                    
                    if [ -x "$ALLURE_PATH" ]; then
                        # Force proper status detection
                        TEST_EXIT_CODE=$(cat test_exit_code.txt 2>/dev/null || echo "0")
                        if [ "$TEST_EXIT_CODE" != "0" ]; then
                            echo "Creating forced failure status for Allure"
                            echo '{"status":"failed"}' > ${ALLURE_RESULTS_DIR}/status.json
                        fi
                        
                        "$ALLURE_PATH" generate ${ALLURE_RESULTS_DIR} -o allure-report --clean || echo "Allure report generation had issues"
                        # Ensure report is accessible
                        chmod -R 755 allure-report || echo "Could not set permissions on Allure report"
                    else
                        echo "Allure executable not found. Skipping report generation."
                        # Create empty report directory to avoid post-build failures
                        mkdir -p allure-report
                    fi
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: "allure-report/**/*", allowEmptyArchive: true
                }
            }
        }
        
        stage('Create ClickUp Task') {
            when {
                not {
                    environment name: 'SKIP_CLICKUP', value: 'true'
                }
            }
            steps {
                script {
                    def testResult = currentBuild.currentResult
                    def jobName = env.JOB_NAME
                    def buildNumber = env.BUILD_NUMBER
                    def buildUrl = env.BUILD_URL
                    def date = new Date().format("yyyy-MM-dd HH:mm:ss")
                    
                    if (testResult != 'SUCCESS') {
                        // Get list ID directly
                        def listId = ""
                        try {
                            def parentTaskResponse = sh(
                                script: "curl -s -X GET 'https://api.clickup.com/api/v2/task/${CLICKUP_PARENT_TASK_ID}' -H 'Authorization: ${CLICKUP_API_TOKEN}' -H 'Content-Type: application/json'",
                                returnStdout: true
                            ).trim()
                            
                            def matcher = parentTaskResponse =~ /"list":\{"id":"([0-9]+)"/
                            if (matcher.find()) {
                                listId = matcher.group(1)
                            }
                        } catch (Exception e) {
                            echo "Error getting parent task info: ${e.message}"
                            return
                        }
                        
                        // Analyze test results to find failures
                        def failedTests = []
                        try {
                            def testFilesOutput = sh(
                                script: "find ${ALLURE_RESULTS_DIR} -name '*.json' | grep -v 'categories\\|environment\\|history\\|executor\\|testrun' || true",
                                returnStdout: true
                            ).trim()
                            
                            if (testFilesOutput) {
                                testFilesOutput.split('\n').each { filePath ->
                                    if (filePath) {
                                        def content = readFile(filePath)
                                        def testStatus = (content =~ /"status":"([^"]*)"/)
                                        if (testStatus.find() && (testStatus.group(1) == "failed" || testStatus.group(1) == "broken")) {
                                            def testName = (content =~ /"name":"([^"]*)"/) 
                                            def testPath = (content =~ /"fullName":"([^"]*)"/)
                                            def testMsg = (content =~ /"message":"([^"]*)"/)
                                            
                                            def testDetails = [:]
                                            testDetails.name = testName.find() ? testName.group(1) : "Unknown test"
                                            testDetails.path = testPath.find() ? testPath.group(1) : ""
                                            testDetails.message = testMsg.find() ? testMsg.group(1) : ""
                                            
                                            failedTests.add(testDetails)
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            echo "Error analyzing test results: ${e.message}"
                        }
                        
                        // Create bug report in ClickUp
                        def bugTitle = "BUG: Test Failures in ${jobName} #${buildNumber}"
                        
                        // Deduplicate failures
                        def uniqueFailures = [:]
                        failedTests.each { test ->
                            def key = "${test.name}:${test.path}:${test.message}"
                            if (uniqueFailures.containsKey(key)) {
                                uniqueFailures[key].count++
                            } else {
                                test.count = 1
                                uniqueFailures[key] = test
                            }
                        }
                        
                        // Format the failed tests
                        def failedTestsFormatted = ""
                        if (uniqueFailures.size() > 0) {
                            uniqueFailures.values().each { test ->
                                failedTestsFormatted += "\n\n**Failed Test:** ${test.name}"
                                if (test.path) {
                                    failedTestsFormatted += "\n**Location:** ${test.path}"
                                }
                                if (test.message) {
                                    failedTestsFormatted += "\n**Error Message:** ${test.message}"
                                }
                                if (test.count > 1) {
                                    failedTestsFormatted += "\n**Occurrences:** ${test.count} times"
                                }
                            }
                        } else {
                            failedTestsFormatted = "\n- Unknown test failures - see report for details"
                        }
                        
                        // Create the bug description
                        def bugDescription = """**Bug Report - Test Failures**

**Job**: ${jobName}
**Build**: #${buildNumber}
**Status**: Failed
**Date**: ${date}

**Failed Tests**:${failedTestsFormatted}

**Links**:
- [Jenkins Build](${buildUrl})
- [Allure Report](${buildUrl}allure)"""
                        
                        // Create the bug ticket
                        def bugJson = """
                        {
                            "name":"${bugTitle}",
                            "description":"${bugDescription.replaceAll('"', '\\\\"').replaceAll('\n', '\\\\n')}",
                            "status":"to do",
                            "priority":1,
                            "tags":["bug","automated-test"],
                            "assignees":[${CLICKUP_USER_ID}]
                        }
                        """
                        
                        // Create the bug ticket
                        def taskId = ""
                        try {
                            writeFile file: 'bug_ticket.json', text: bugJson
                            def bugResponse = sh(
                                script: "curl -X POST 'https://api.clickup.com/api/v2/list/${listId}/task' -H 'Authorization: ${CLICKUP_API_TOKEN}' -H 'Content-Type: application/json' -d @bug_ticket.json",
                                returnStdout: true
                            ).trim()
                            
                            def taskIdMatcher = bugResponse =~ /"id":"([^"]*)"/
                            if (taskIdMatcher.find()) {
                                taskId = taskIdMatcher.group(1)
                            }
                        } catch (Exception e) {
                            echo "Error creating bug ticket: ${e.message}"
                            return
                        }
                        
                        // Attach screenshots if available
                        if (taskId && fileExists("${PLAYWRIGHT_TEST_RESULTS_DIR}")) {
                            try {
                                // Extract test names that failed
                                def failedTestNames = []
                                failedTests.each { test ->
                                    def normalizedName = test.name.replaceAll(/[^a-zA-Z0-9]/, "").toLowerCase()
                                    if (normalizedName) {
                                        failedTestNames.add(normalizedName)
                                    }
                                    
                                    if (test.path) {
                                        test.path.split(/[\/\\]/).each { pathPart ->
                                            def normalized = pathPart.replaceAll(/[^a-zA-Z0-9]/, "").toLowerCase()
                                            if (normalized && normalized.length() > 3) {
                                                failedTestNames.add(normalized)
                                            }
                                        }
                                    }
                                }
                                
                                // Find all screenshots
                                def screenshotsOutput = sh(
                                    script: "find ${PLAYWRIGHT_TEST_RESULTS_DIR} -name '*.png' -type f || true",
                                    returnStdout: true
                                ).trim()
                                
                                if (screenshotsOutput) {
                                    def uploadedScreenshots = 0
                                    def processedFiles = []
                                    
                                    // Helper function to extract test identifier
                                    def extractTestId = { String path ->
                                        def fileName = path.tokenize('/').last()
                                        def dirName = path.tokenize('/')[-2]
                                        def testId = ""
                                        def matcher = dirName =~ /([A-Za-z0-9-]+(?:-retry\d+)?)$/
                                        if (matcher.find()) {
                                            testId = matcher.group(1)
                                        }
                                        return [testId: testId, fileName: fileName, dirName: dirName]
                                    }
                                    
                                    // First try: test-failed screenshots
                                    def failedTestScreenshots = screenshotsOutput.split('\n').findAll { path ->
                                        path && path.toLowerCase().contains("test-failed")
                                    }
                                    
                                    // Group screenshots by test
                                    def screenshotsByTest = [:]
                                    failedTestScreenshots.each { path ->
                                        if (fileExists(path) && !processedFiles.contains(path)) {
                                            def info = extractTestId(path)
                                            def key = info.dirName
                                            
                                            if (!screenshotsByTest.containsKey(key)) {
                                                screenshotsByTest[key] = []
                                            }
                                            screenshotsByTest[key] << path
                                        }
                                    }
                                    
                                    // Upload one screenshot per test
                                    screenshotsByTest.each { testKey, screenshots ->
                                        def bestScreenshot = screenshots.find { it.contains("test-failed-1.png") } ?: screenshots.first()
                                        echo "Attaching screenshot for test ${testKey}: ${bestScreenshot}"
                                        sh "curl -X POST 'https://api.clickup.com/api/v2/task/${taskId}/attachment' -H 'Authorization: ${CLICKUP_API_TOKEN}' -F 'attachment=@${bestScreenshot}'"
                                        uploadedScreenshots++
                                        processedFiles.add(bestScreenshot)
                                    }
                                    
                                    // Second try: filename-based matching
                                    if (uploadedScreenshots == 0) {
                                        def matchedFilenames = []
                                        screenshotsOutput.split('\n').each { path ->
                                            if (path && fileExists(path) && !processedFiles.contains(path)) {
                                                def pathLower = path.toLowerCase()
                                                def fileName = path.tokenize('/').last().toLowerCase()
                                                
                                                if (!fileName.contains("-diff") && !fileName.contains("_diff")) {
                                                    def matchedTest = failedTestNames.find { testName ->
                                                        pathLower.contains(testName) && !matchedFilenames.contains(testName)
                                                    }
                                                    
                                                    if (matchedTest) {
                                                        echo "Attaching screenshot for test ${matchedTest}: ${path}"
                                                        sh "curl -X POST 'https://api.clickup.com/api/v2/task/${taskId}/attachment' -H 'Authorization: ${CLICKUP_API_TOKEN}' -F 'attachment=@${path}'"
                                                        uploadedScreenshots++
                                                        processedFiles.add(path)
                                                        matchedFilenames.add(matchedTest)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Final fallback: any failure-related screenshots
                                    if (uploadedScreenshots == 0) {
                                        screenshotsOutput.split('\n').each { path ->
                                            if (path && fileExists(path) && !processedFiles.contains(path)) {
                                                def fileName = path.tokenize('/').last().toLowerCase()
                                                if (fileName.contains("fail") || fileName.contains("error") || fileName.contains("assertion")) {
                                                    echo "Attaching failure screenshot: ${path}"
                                                    sh "curl -X POST 'https://api.clickup.com/api/v2/task/${taskId}/attachment' -H 'Authorization: ${CLICKUP_API_TOKEN}' -F 'attachment=@${path}'"
                                                    uploadedScreenshots++
                                                    processedFiles.add(path)
                                                }
                                            }
                                        }
                                    }
                                    
                                    echo "Uploaded ${uploadedScreenshots} screenshots related to failed tests"
                                }
                            } catch (Exception e) {
                                echo "Error attaching screenshots: ${e.message}"
                            }
                        }
                        
                        echo "Created BUG ticket: ${bugTitle} and assigned to QA Engineer"
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
