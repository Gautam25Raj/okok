const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');
const anthropic = require('anthropic');

anthropic.configure({
  api_key: process.env.YOUR_ANTHROPIC_API_KEY
});

async function reviewFile(content, fileName) {
  console.log(`Reviewing file: ${fileName}`);

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620", // Replace with your desired model
    max_tokens: 150,
    temperature: 0,
    system: `You are a code reviewer. Review the following code file named ${fileName} based on best practices, code efficiency, and clarity. Provide a score from 1 to 10 and a brief feedback message.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"points": int,\n"message": str\n}`,
    messages: []
  });

  console.log(`API Response:`, response);
  const result = JSON.parse(response.message.trim());
  return result;
}

async function postComment(pullRequestNumber, comment) {
  const octokit = github.getOctokit(core.getInput('GITHUB_TOKEN'));

  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequestNumber,
    body: comment
  });
}

async function main() {
  const codeSnippets = JSON.parse(core.getInput('codeSnippets'));
  const pullRequestNumber = github.context.payload.pull_request.number;

  const reviews = []; // Array to store review results
  for (const [fileName, content] of Object.entries(codeSnippets)) {
    try {
      const review = await reviewFile(content, fileName);
      reviews.push(review);
    } catch (error) {
      core.setFailed(`Error reviewing file ${fileName}: ${error.message}`);
    }
  }

  const llmFeedback = `**LLM Code Review:**\n\n${reviews.map(review => `- **${review.file}**: ${review.points}/10 - ${review.message}`).join('\n')}`;

  await postComment(pullRequestNumber, llmFeedback);
}

main();
