const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.API_KEY,
});

// This is review file
const reviewFile = async (content, fileName) => {
  console.log(`Reviewing file: ${fileName}`);
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 250,
    temperature: 0,
    system: `You are a code reviewer. Review the following code file named ${fileName} based on best practices, code efficiency, and clarity. Provide a score from 1 to 10 and a brief feedback message.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"points": int,\n"message": str\n}`,
    messages: []
  });
  console.log(`API Response:`, response);
  const result = JSON.parse(response.content[0].text.trim());
  return result;
};

async function main() {
  const changedFiles = process.argv.slice(2);
  const reviews = await Promise.all(changedFiles.map(async (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const review = await reviewFile(content, fileName);
    return { file: fileName, message: review.message, score: review.points };
  }));

  const comment = reviews.map(review => `
| 📂 **File**   | 💬 **Comment** | 🏆 **Score**    |
| :-----------: |---------------| :-------------: |
| \`${review.file}\` | ${review.message} | ${review.score}/10 |
  `).join('\n');

  console.log(`::set-output name=comment::${comment}`);
}

main().catch(console.error);
