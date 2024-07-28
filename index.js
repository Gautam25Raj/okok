const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

// Function to fetch pull request data and extract changed files
async function getChangedFiles(pullRequestNumber) {
  const octokit = github.getOctokit(core.getInput('github-token'));

  try {
    const pullRequest = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequestNumber,
    });

    const changedFiles = pullRequest.data.files.map((file) => file.filename);
    return changedFiles;
  } catch (error) {
    core.setFailed(`Error fetching pull request data: ${error.message}`);
    throw error; // Re-throw for potential handling in the main function
  }
}

// Function to send code to LLM API and get feedback
async function getLLMFeedback(codeContent, llmApiUrl, llmApiKey) {
  const headers = {
    'Authorization': `Bearer ${llmApiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(llmApiUrl, { code: codeContent }, { headers });
    return response.data; // Assuming the API returns the feedback data
  } catch (error) {
    core.setFailed(`Error calling LLM API: ${error.message}`);
    throw error; // Re-throw for potential handling in the main function
  }
}

// Function to post a comment on the pull request
async function postComment(pullRequestNumber, comment) {
  const octokit = github.getOctokit(core.getInput('github-token'));

  try {
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequestNumber,
      body: comment,
    });
  } catch (error) {
    core.setFailed(`Error posting comment: ${error.message}`);
    throw error; // Re-throw for potential handling in the main function
  }
}

// Main function to orchestrate the process
async function main() {
  const pullRequestNumber = core.getInput('pull_request_number'); // Get PR number from input
  const llmApiUrl = core.getInput('llm_api_url'); // Get LLM API URL from input
  const llmApiKey = core.getInput('llm_api_key'); // Get LLM API key from input

  try {
    const changedFiles = await getChangedFiles(pullRequestNumber);

    if (changedFiles.length === 0) {
      core.info('No files changed in this pull request.');
      return;
    }

    // Handle scenarios with multiple changed files (modify logic as needed)
    const codeToReview = await getChangedFileContent(changedFiles[0]); // Assuming a function to get code for one file

    const llmFeedback = await getLLMFeedback(codeToReview, llmApiUrl, llmApiKey);
    const formattedComment = `**AI Assistant Review:**\n${llmFeedback}`; // Format the comment

    await postComment(pullRequestNumber, formattedComment);
    core.info('Successfully posted LLM feedback as a comment.');
  } catch (error) {
    core.setFailed(`An error occurred during LLM code review: ${error.message}`);
  }
}

// (Optional) Function to get code content from a specific file (replace with your implementation)
async function getChangedFileContent(fileName) {
  // Implement logic to read the file content based on your repository structure
  // This example assumes a simple file reading approach (replace with your actual logic)
  const fs = require('fs');
  const filePath = `./${fileName}`; // Modify the path based on your project structure

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data;
  } catch (error) {
    core.setFailed(`Error reading file content: ${error.message}`);
    throw error; // Re-throw for handling in the main function
  }
}

main();
