pipeline {
    agent any

    environment {
        NODE_VERSION             = '22'
        TEST_TIMESTAMP           = '2025-05-28 12:04:15'
        PLAYWRIGHT_BROWSERS_PATH = '0'
        CURRENT_USER             = 'waseem'
        GIT_USERNAME             = 'dartera'
        GITHUB_TOKEN             = credentials('github-token')
        CLICKUP_API_TOKEN        = credentials('clickup-api-token')
        CLICKUP_PARENT_TASK_ID   = '8698ty0vg'
        CLICKUP_USER_ID          = '87801653'
    }

    options {
        skipDefaultCheckout(true)
        timeout(time: 1, unit: 'HOURS')
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    // Clean workspace and clone repo with credentials
                    deleteDir()
                    sh '''
                        git clone --depth 1 --progress https://dartera:${GITHUB_TOKEN}@github.com/dartera/DolomedAutomation.git .
                    '''

                    // Install NVM, Node.js, and npm deps
                    sh '''
                        wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
                        export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
                        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

                        nvm install ${NODE_VERSION}
                        nvm use    ${NODE_VERSION}

                        npm install
                    '''
                }
            }
        }

        stage('Run Visual Tests') {
            steps {
                script {
                    // Run tests and capture the exit code
                    def testResult = sh(
                        script: '''
                            # Load NVM & use correct Node
                            export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
                            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                            nvm use ${NODE_VERSION}

                            # Run Playwright with HTML reporter only
                            npx playwright test --workers=4 --reporter=list,html
                        ''',
                        returnStatus: true
                    )
                    
                    // Store test result for later stages
                    env.INITIAL_TEST_RESULT = testResult.toString()
                    
                    if (testResult != 0) {
                        echo "❌ Initial tests failed with exit code: ${testResult}. Will retry failed tests after generating reports."
                        // Archive screenshots immediately but don't fail the stage yet
                        archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                    } else {
                        echo "✅ All tests passed on first run!"
                    }
                }
            }
        }

        stage('Retry Failed Tests') {
            when {
                expression { env.INITIAL_TEST_RESULT != '0' }
            }
            steps {
                script {
                    echo "🔄 Retrying failed tests..."
                    def retryResult = sh(
                        script: '''
                            # Load NVM & use correct Node
                            export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
                            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                            nvm use ${NODE_VERSION}

                            # Retry only the failed tests
                            npx playwright test --last-failed --workers=4 --reporter=list,html
                        ''',
                        returnStatus: true
                    )
                    
                    env.RETRY_TEST_RESULT = retryResult.toString()
                    
                    if (retryResult != 0) {
                        echo "❌ Tests still failing after retry. Final result will be determined after report generation."
                        archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                    } else {
                        echo "✅ All previously failed tests now pass!"
                    }
                }
            }
        }

        stage('Publish HTML Report') {
            steps {
                script {
                    // Playwright's HTML reporter always writes to "playwright-report"
                    def reportDir = 'playwright-report'
                    if (!fileExists(reportDir)) {
                        error "HTML report directory '${reportDir}' not found!"
                    }
                    publishHTML([
                        reportDir:    reportDir,
                        reportFiles:  'index.html',
                        reportName:   'Playwright Test Report',
                        keepAll:      true,
                        allowMissing: false
                    ])
                }
            }
        }

        stage('Create ClickUp Task') {
            when {
                anyOf {
                    expression { env.INITIAL_TEST_RESULT != '0' && env.RETRY_TEST_RESULT != '0' }
                    expression { env.INITIAL_TEST_RESULT != '0' && env.RETRY_TEST_RESULT == null }
                }
                not {
                    environment name: 'SKIP_CLICKUP', value: 'true'
                }
            }
            steps {
                script {
                    def jobName = env.JOB_NAME
                    def buildNumber = env.BUILD_NUMBER
                    def buildUrl = env.BUILD_URL
                    def date = new Date().format("yyyy-MM-dd HH:mm:ss")
                    
                    echo "Creating ClickUp task for failed tests..."
                    
                    // Get list ID from parent task
                    def listId = ""
                    try {
                        def parentTaskResponse = sh(
                            script: "curl -s -X GET 'https://api.clickup.com/api/v2/task/${CLICKUP_PARENT_TASK_ID}' -H 'Authorization: ${CLICKUP_API_TOKEN}' -H 'Content-Type: application/json'",
                            returnStdout: true
                        ).trim()
                        
                        def matcher = parentTaskResponse =~ /"list":\{"id":"([0-9]+)"/
                        if (matcher.find()) {
                            listId = matcher.group(1)
                            echo "Found list ID: ${listId}"
                        } else {
                            echo "Could not extract list ID from response: ${parentTaskResponse}"
                            return
                        }
                    } catch (Exception e) {
                        echo "Error getting parent task info: ${e.message}"
                        return
                    }
                    
                    // Analyze test results to find failures
                    def failedTests = []
                    try {
                        // Look for test result files
                        def testResultsExist = fileExists('test-results')
                        if (testResultsExist) {
                            def testFilesOutput = sh(
                                script: "find test-results -name '*.json' -o -name '*.html' | head -10 || echo 'No test files found'",
                                returnStdout: true
                            ).trim()
                            
                            echo "Found test files: ${testFilesOutput}"
                            
                            // Try to extract failed test information from HTML report
                            if (fileExists('playwright-report/index.html')) {
                                def htmlContent = readFile('playwright-report/index.html')
                                def failureMatches = htmlContent =~ /class="test-file-test.*?failed.*?data-testid="([^"]*)".*?<span[^>]*>([^<]*)</
                                failureMatches.each { match ->
                                    failedTests.add([
                                        name: match[2] ?: "Unknown Test",
                                        path: match[1] ?: "",
                                        message: "Test failed - see HTML report for details"
                                    ])
                                }
                            }
                            
                            // If no specific failures found, add generic failure info
                            if (failedTests.isEmpty()) {
                                failedTests.add([
                                    name: "Visual Regression Tests",
                                    path: "Multiple test files",
                                    message: "Tests failed during execution - check build logs and reports for details"
                                ])
                            }
                        }
                    } catch (Exception e) {
                        echo "Error analyzing test results: ${e.message}"
                        failedTests.add([
                            name: "Test Analysis Failed",
                            path: "Unknown",
                            message: "Could not analyze test results: ${e.message}"
                        ])
                    }
                    
                    // Create bug report in ClickUp
                    def bugTitle = "BUG: Visual Test Failures in ${jobName} #${buildNumber}"
                    
                    // Format the failed tests
                    def failedTestsFormatted = ""
                    if (failedTests.size() > 0) {
                        failedTests.each { test ->
                            failedTestsFormatted += "\n\n**Failed Test:** ${test.name}"
                            if (test.path) {
                                failedTestsFormatted += "\n**Location:** ${test.path}"
                            }
                            if (test.message) {
                                failedTestsFormatted += "\n**Error Message:** ${test.message}"
                            }
                        }
                    } else {
                        failedTestsFormatted = "\n- Test failures detected - see reports for details"
                    }
                    
                    // Create the bug description
                    def bugDescription = """**Bug Report - Visual Test Failures**

**Job**: ${jobName}
**Build**: #${buildNumber}
**Status**: Failed
**Date**: ${date}
**Initial Test Result**: ${env.INITIAL_TEST_RESULT}
**Retry Test Result**: ${env.RETRY_TEST_RESULT ?: 'Not attempted'}

**Failed Tests**:${failedTestsFormatted}

**Links**:
- [Jenkins Build](${buildUrl})
- [Playwright HTML Report](${buildUrl}Playwright_Test_Report/)
- [Test Artifacts](${buildUrl}artifact/)"""
                    
                    // Create the bug ticket JSON
                    def bugJson = """
                    {
                        "name":"${bugTitle}",
                        "description":"${bugDescription.replaceAll('"', '\\\\"').replaceAll('\n', '\\\\n')}",
                        "status":"to do",
                        "priority":1,
                        "tags":["bug","automated-test","visual-regression"],
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
                        
                        echo "ClickUp API Response: ${bugResponse}"
                        
                        def taskIdMatcher = bugResponse =~ /"id":"([^"]*)"/
                        if (taskIdMatcher.find()) {
                            taskId = taskIdMatcher.group(1)
                            echo "Created ClickUp task with ID: ${taskId}"
                        } else {
                            echo "Could not extract task ID from response"
                        }
                    } catch (Exception e) {
                        echo "Error creating bug ticket: ${e.message}"
                        return
                    }
                    
                    // Attach screenshots if available
                    if (taskId && fileExists("test-results")) {
                        try {
                            echo "Looking for screenshots to attach..."
                            def screenshotsOutput = sh(
                                script: "find test-results -name '*.png' -type f | head -5 || echo 'No screenshots found'",
                                returnStdout: true
                            ).trim()
                            
                            if (screenshotsOutput && !screenshotsOutput.contains('No screenshots found')) {
                                def uploadedScreenshots = 0
                                screenshotsOutput.split('\n').each { path ->
                                    if (path && fileExists(path)) {
                                        try {
                                            echo "Attaching screenshot: ${path}"
                                            sh "curl -X POST 'https://api.clickup.com/api/v2/task/${taskId}/attachment' -H 'Authorization: ${CLICKUP_API_TOKEN}' -F 'attachment=@${path}'"
                                            uploadedScreenshots++
                                        } catch (Exception e) {
                                            echo "Error uploading screenshot ${path}: ${e.message}"
                                        }
                                    }
                                }
                                echo "Uploaded ${uploadedScreenshots} screenshots to ClickUp task"
                            } else {
                                echo "No screenshots found to attach"
                            }
                        } catch (Exception e) {
                            echo "Error attaching screenshots: ${e.message}"
                        }
                    }
                    
                    echo "✅ Created ClickUp BUG ticket: ${bugTitle}"
                }
            }
        }

        stage('Final Test Result') {
            steps {
                script {
                    // Determine final result after all reports are generated
                    def initialFailed = (env.INITIAL_TEST_RESULT != '0')
                    def retryFailed = (env.RETRY_TEST_RESULT != null && env.RETRY_TEST_RESULT != '0')
                    
                    if (initialFailed && retryFailed) {
                        error "Visual regression tests failed on both initial run and retry—see archived artifacts and reports."
                    } else if (initialFailed && !retryFailed) {
                        echo "⚠️ Tests failed initially but passed on retry"
                    } else {
                        echo "✅ All tests passed"
                    }
                }
            }
        }
    }

    post {
        always {
            // Archive test artifacts
            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'playwright-report/**/*', allowEmptyArchive: true
        }
        
        success {
            echo """
            ✅ Pipeline completed successfully
            Timestamp: ${env.TEST_TIMESTAMP}
            User:      ${env.CURRENT_USER}
            
            Reports available:
            - Playwright HTML Report
            """
        }
        failure {
            echo """
            ❌ Pipeline failed!
            Timestamp: ${env.TEST_TIMESTAMP}
            User:      ${env.CURRENT_USER}
            Build URL: ${env.BUILD_URL}
            """
            // Artifacts (screenshots + test-results) were already archived on failure
        }
        cleanup {
            deleteDir()
        }
    }
}
